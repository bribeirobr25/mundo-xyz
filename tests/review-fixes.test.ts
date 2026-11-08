import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { loadConfig } from "../src/domain/config.js";
import { normalizeInput } from "../src/domain/input.js";
import { fixtureInterpret } from "../src/server/fixture.js";
import { logPath, parseCookies } from "../src/server/http.js";
import { boot, preparePool, type Client } from "./harness.js";
import type pg from "pg";

const PHRASE = "A bus stop for the café's regulars.";
let pool: pg.Pool;
let client: Client;

beforeAll(async () => {
  pool = await preparePool();
});
afterAll(async () => {
  await pool.end();
});
beforeEach(async () => {
  const { resetDatabase } = await import("../src/server/db.js");
  await resetDatabase(pool);
  client = await boot(pool);
});

test("t.input.phone adjacent forms", () => {
  const config = loadConfig();
  expect(normalizeInput("call (555) 123-4567", config).ok).toBe(false);
  expect(normalizeInput("call 5551234567", config).ok).toBe(false);
  expect(normalizeInput("call 555-123-4567", config).ok).toBe(false);
  expect(normalizeInput("room 2026", config).ok).toBe(true);
  expect(normalizeInput("nine digits 555123456", config).ok).toBe(true);
  expect(normalizeInput("a short note", config).ok).toBe(true);
});

test("t.interp.apostrophe adjacent quotes", () => {
  const curly = "A bus stop for the café’s regulars.";
  const left = "A bus stop for the café‘s regulars.";
  const modifier = "A bus stop for the caféʼs regulars.";
  for (const phrase of [PHRASE, curly, left, modifier, "A bus stop for the cafe's regulars."]) {
    expect(fixtureInterpret(phrase, null).kind).toBe("supported");
  }
  expect(fixtureInterpret("a bench for the café's regulars.", null).kind).toBe("unsupported");
});

test("t.cookie.first and t.log.redact adjacent paths", () => {
  expect(parseCookies("__Host-sw_cap=first; __Host-sw_cap=second")["__Host-sw_cap"]).toBe("first");
  expect(parseCookies("sw_cap=attacker")["__Host-sw_cap"]).toBeUndefined();
  expect(parseCookies(undefined)).toEqual({});
  expect(logPath("/api/world?x=1")).toBe("/api/world");
  expect(logPath("/share")).toBe("/share");
  expect(logPath("/c/00000000-0000-4000-8000-000000000000")).toContain("/c/");
  expect(logPath("/not-a-route")).toBe("/redacted");
  const mailbox = ["a", "b.co"].join("@");
  expect(logPath(`/api/${mailbox}`)).toBe("/redacted");
  expect(logPath("/api/ABCD-EFGH-2345-67AB")).toBe("/redacted");
});

test("t.pub.stale-version does not refresh", async () => {
  const preview = await client.call("/api/interpret", { body: { text: PHRASE } });
  const proposalId = String(preview.body.proposalId);
  const me = await client.call("/api/identity", { body: { pseudonym: "River Stone", acknowledge: true } });
  await client.service.grantAdmin(String(me.body.authorId));
  const invite = await client.call("/api/admin/invites", { body: {} });
  await client.call("/api/invites/redeem", { body: { code: invite.body.code } });
  const confirmed = await client.call(`/api/proposals/${proposalId}/confirm`, { body: { idempotencyKey: "stale" } });
  const key = String(confirmed.body.confirmKey);
  const version = Number(confirmed.body.proposalVersion);
  const stale = await client.call(`/api/proposals/${proposalId}/publish`, { body: { proposalVersion: 0, key } });
  expect(stale.status).toBe(422);
  expect(stale.body.code).toBe("fingerprint_mismatch");
  const row = await pool.query<{ proposal_version: number; keyed: boolean }>(
    "SELECT proposal_version, confirm_key_hash IS NOT NULL AS keyed FROM proposals WHERE id = $1",
    [proposalId],
  );
  expect(row.rows[0]?.proposal_version).toBe(version);
  expect(row.rows[0]?.keyed).toBe(true);
  const stored = await pool.query("SELECT count(*)::int AS n FROM idempotency WHERE key = $1", [key]);
  expect(stored.rows[0]?.n).toBe(0);
  const published = await client.call(`/api/proposals/${proposalId}/publish`, { body: { proposalVersion: version, key } });
  expect(published.body.code).toBe("published");
  await client.close();
});

test("t.place.another-after-confirm adjacent states", async () => {
  const preview = await client.call("/api/interpret", { body: { text: PHRASE } });
  const proposalId = String(preview.body.proposalId);
  const before = await client.call(`/api/proposals/${proposalId}/another-spot`, { method: "POST", body: {} });
  expect(before.status).toBe(200);
  const missing = await client.call("/api/proposals/00000000-0000-4000-8000-000000000000/another-spot", { method: "POST", body: {} });
  expect(missing.status).toBe(404);
  const me = await client.call("/api/identity", { body: { pseudonym: "River Stone", acknowledge: true } });
  await client.service.grantAdmin(String(me.body.authorId));
  const invite = await client.call("/api/admin/invites", { body: {} });
  await client.call("/api/invites/redeem", { body: { code: invite.body.code } });
  const confirmed = await client.call(`/api/proposals/${proposalId}/confirm`, { body: { idempotencyKey: "spot" } });
  const moved = await client.call(`/api/proposals/${proposalId}/another-spot`, { method: "POST", body: {} });
  expect(moved.status).toBe(409);
  const published = await client.call(`/api/proposals/${proposalId}/publish`, {
    body: { proposalVersion: confirmed.body.proposalVersion, key: confirmed.body.confirmKey },
  });
  expect(published.body.code).toBe("published");
  await client.call(`/api/proposals/${proposalId}/discard`, { method: "POST", body: {} });
  const after = await client.call(`/api/proposals/${proposalId}/another-spot`, { method: "POST", body: {} });
  expect(after.status).toBe(404);
  await client.close();
});

test("t.budget.reconcile-clamp and daily uses actual", async () => {
  const held = await client.service.reserve(false);
  expect(held.ok).toBe(true);
  if (!held.ok) return;
  await client.service.settle(held.id, -1);
  const negative = await pool.query<{ spent: string }>("SELECT spent_usd::text AS spent FROM budget_months");
  expect(Number(negative.rows[0]?.spent)).toBe(0);
  const again = await client.service.reserve(false);
  expect(again.ok).toBe(true);
  if (!again.ok) return;
  await client.service.settle(again.id, 999);
  const capped = await pool.query<{ spent: string }>("SELECT spent_usd::text AS spent FROM budget_months");
  expect(Number(capped.rows[0]?.spent)).toBeCloseTo(again.amount, 6);
  const third = await client.service.reserve(false);
  expect(third.ok).toBe(true);
  await client.close();
});

test("t.db.rls-secrets adjacent tables", async () => {
  const clientDb = await pool.connect();
  try {
    await clientDb.query("GRANT SELECT ON idempotency, sessions, recovery_codes, invites TO mundo_anon");
    await clientDb.query("BEGIN");
    await clientDb.query("SET LOCAL ROLE mundo_anon");
    for (const table of ["idempotency", "sessions", "recovery_codes", "invites"]) {
      const rows = await clientDb.query(`SELECT * FROM ${table}`);
      expect(rows.rows).toEqual([]);
    }
    await clientDb.query("ROLLBACK");
  } finally {
    await clientDb.query("REVOKE SELECT ON idempotency, sessions, recovery_codes, invites FROM mundo_anon");
    clientDb.release();
  }
  await client.close();
});
