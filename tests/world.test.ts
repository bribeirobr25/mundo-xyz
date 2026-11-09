import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { loadConfig } from "../src/domain/config.js";
import { normalizeInput } from "../src/domain/input.js";
import { place } from "../src/domain/placement.js";
import { fingerprint } from "../src/domain/fingerprint.js";
import { staticTarget } from "../src/server/http.js";
import { stageNotice } from "../src/web/notices.js";
import { loadCatalog } from "../src/domain/action.js";
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

async function close(): Promise<void> {
  await client.close();
}

test("t.world.single and t.world.seed-labeled and t.world.empty-shape", async () => {
  const world = await client.call("/api/world");
  expect(world.status).toBe(200);
  const objects = world.body.objects as { administrator?: boolean; sentence?: string | null; name: string; assetId?: string; paletteId?: string }[];
  expect(objects).toHaveLength(1);
  expect(objects[0]?.administrator).toBe(true);
  expect(objects[0]?.sentence).toBeNull();
  expect(objects[0]?.name).toBe("Café for birds");
  expect(objects[0]?.assetId).toBe("cafe_for_birds");
  expect(objects[0]?.paletteId).toBe("cafe-day");
  expect(objects[0]).not.toHaveProperty("fill");
  await close();
});

test("t.copy.literals", async () => {
  const copy = (await import("../copy/en.json", { with: { type: "json" } })).default as unknown as Record<string, unknown>;
  for (const phrase of [
    "Explore freely — no account needed.",
    "Private preview — only you can see this.",
    "Publish this to the shared world?",
    "Publishing isn't open yet",
  ]) {
    expect(JSON.stringify(copy)).toContain(phrase);
  }
  await close();
});

test("t.preview.signed-out and t.preview.isolation and t.interp.negation and t.fail.01", async () => {
  const preview = await client.call("/api/interpret", { body: { text: PHRASE, anchorId: null } });
  expect(preview.body.code).toBe("ready");
  const shown = preview.body.preview as { assetId?: string; paletteId?: string };
  expect(shown.assetId).toBe("bus_stop");
  expect(shown.paletteId).toBe("stop-day");
  expect(shown).not.toHaveProperty("fill");
  expect(preview.body.interpreter).toBe("fixture");
  expect(preview.body.publicWrites).toBe(0);
  const other = await boot(pool);
  const seen = await other.call("/api/world");
  expect((seen.body.objects as unknown[]).length).toBe(1);
  const negated = await client.call("/api/interpret", { body: { text: "not a bus stop" } });
  expect(negated.body.code).toBe("unsupported");
  expect(negated.body.publicWrites).toBe(0);
  await other.close();
  await close();
});

test("t.interp.multi and t.interp.pii-first and t.input.zalgo and t.schema.interior", async () => {
  const multi = await client.call("/api/interpret", { body: { text: "a café and a bus stop" } });
  expect(multi.body.code).toBe("invalid_output");
  const mailbox = ["ada", "example.com"].join("@");
  const pii = await client.call("/api/interpret", { body: { text: `email me at ${mailbox} about a bus stop` } });
  expect(pii.body.code).toBe("pii");
  const config = loadConfig();
  const zalgo = normalizeInput(`bus ${"a"}${"\u0301".repeat(10)}`, config);
  expect(zalgo.ok).toBe(false);
  const extra = await client.call("/api/interpret", { body: { text: PHRASE, container_object_id: "x" } });
  expect(extra.body.code).toBe("forbidden_field");
  await close();
});

test("t.pub.unsigned and t.pub.no-grant and t.id.no-email", async () => {
  const preview = await client.call("/api/interpret", { body: { text: PHRASE } });
  const id = String(preview.body.proposalId);
  const unsigned = await client.call(`/api/proposals/${id}/publish`, { body: { proposalVersion: 1, key: "nope" } });
  expect(unsigned.status).toBe(401);
  const created = await client.call("/api/identity", { body: { pseudonym: "River Stone", acknowledge: true } });
  expect(created.status).toBe(201);
  expect(created.body.recoveryCode).toBeTruthy();
  const email = await client.call("/api/identity", { body: { pseudonym: "Other Name", acknowledge: true, email: "a@b.c" } });
  expect(email.status).toBe(400);
  const confirmed = await client.call(`/api/proposals/${id}/confirm`, { body: { idempotencyKey: crypto.randomUUID() } });
  expect(confirmed.body.confirmKey).toBeTruthy();
  const blocked = await client.call(`/api/proposals/${id}/publish`, {
    body: { proposalVersion: confirmed.body.proposalVersion, key: confirmed.body.confirmKey },
  });
  expect(blocked.body.code).toBe("invite_required");
  await close();
});

test("t.invite.redeem and t.pub.persists-refresh and t.pub.idem and t.e2e.j5-local-test", async () => {
  const preview = await client.call("/api/interpret", { body: { text: PHRASE } });
  const proposalId = String(preview.body.proposalId);
  const me = await client.call("/api/identity", { body: { pseudonym: "River Stone", acknowledge: true } });
  await client.service.grantAdmin(String(me.body.authorId));
  const invite = await client.call("/api/admin/invites", { body: {} });
  const redeemed = await client.call("/api/invites/redeem", { body: { code: invite.body.code } });
  expect(redeemed.body.code).toBe("grant");
  const confirmed = await client.call(`/api/proposals/${proposalId}/confirm`, { body: { idempotencyKey: "confirm-1" } });
  const key = String(confirmed.body.confirmKey);
  const version = Number(confirmed.body.proposalVersion);
  const first = await client.call(`/api/proposals/${proposalId}/publish`, { body: { proposalVersion: version, key } });
  const second = await client.call(`/api/proposals/${proposalId}/publish`, { body: { proposalVersion: version, key } });
  expect(first.body.code).toBe("published");
  expect(second.body.code).toBe("already_published");
  expect(second.body.contributionId).toBe(first.body.contributionId);
  const again = await client.call("/api/world");
  const objects = again.body.objects as { id: string; assetId?: string; name: string }[];
  expect(objects.filter((object) => object.assetId === "bus_stop")).toHaveLength(1);
  expect(new Set(objects.map((object) => object.id)).size).toBe(objects.length);
  const banner = await client.call("/api/public-config");
  expect(banner.body.fixture).toBe(true);
  expect(banner.body.runMode).toBe("local-test");
  await close();
});

test("t.pub.conflict.persist", async () => {
  const aPreview = await client.call("/api/interpret", { body: { text: PHRASE } });
  const other = await boot(pool);
  const bPreview = await other.call("/api/interpret", { body: { text: PHRASE } });
  const bId = await other.call("/api/identity", { body: { pseudonym: "Sky North", acknowledge: true } });
  await other.service.grantAdmin(String(bId.body.authorId));
  const bInvite = await other.call("/api/admin/invites", { body: {} });
  await other.call("/api/invites/redeem", { body: { code: bInvite.body.code } });
  const bConfirm = await other.call(`/api/proposals/${String(bPreview.body.proposalId)}/confirm`, { body: { idempotencyKey: "b" } });
  const published = await other.call(`/api/proposals/${String(bPreview.body.proposalId)}/publish`, {
    body: { proposalVersion: bConfirm.body.proposalVersion, key: bConfirm.body.confirmKey },
  });
  expect(published.body.code).toBe("published");
  const aId = await client.call("/api/identity", { body: { pseudonym: "River Stone", acknowledge: true } });
  await client.service.grantAdmin(String(aId.body.authorId));
  const aInvite = await client.call("/api/admin/invites", { body: {} });
  await client.call("/api/invites/redeem", { body: { code: aInvite.body.code } });
  const conflict = await client.call(`/api/proposals/${String(aPreview.body.proposalId)}/confirm`, { body: { idempotencyKey: "a1" } });
  expect(conflict.body.code).toBe("conflict");
  expect(conflict.body.providerCalls).toBe(0);
  const refreshed = conflict.body.preview as { assetId?: string; paletteId?: string; w?: number; h?: number; name?: string };
  expect(refreshed.assetId).toBe("bus_stop");
  expect(refreshed.paletteId).toBe("stop-day");
  expect(refreshed.w).toBe(1);
  expect(refreshed.h).toBe(1);
  expect(refreshed.name).toContain("Bus stop");
  const again = await client.call(`/api/proposals/${String(aPreview.body.proposalId)}/confirm`, { body: { idempotencyKey: "a2" } });
  const done = await client.call(`/api/proposals/${String(aPreview.body.proposalId)}/publish`, {
    body: { proposalVersion: again.body.proposalVersion, key: again.body.confirmKey },
  });
  expect(done.body.code).toBe("published");
  const count = await pool.query("SELECT count(*)::int AS n FROM contributions WHERE approved_text IS NOT NULL");
  expect(count.rows[0]?.n).toBe(2);
  await other.close();
  await close();
});

test("t.pub.adopt-bind and t.draft.purge", async () => {
  const preview = await client.call("/api/interpret", { body: { text: PHRASE } });
  const proposalId = String(preview.body.proposalId);
  await client.call("/api/identity", { body: { pseudonym: "River Stone", acknowledge: true } });
  await client.call(`/api/proposals/${proposalId}/confirm`, { body: { idempotencyKey: "bind" } });
  const stranger = await boot(pool);
  await stranger.call("/api/identity", { body: { pseudonym: "Sky North", acknowledge: true } });
  const hidden = await stranger.call(`/api/proposals/${proposalId}/publish`, { body: { proposalVersion: 1, key: "x" } });
  expect(hidden.status).toBe(404);
  const discarded = await client.call("/api/interpret", { body: { text: PHRASE } });
  await client.call(`/api/proposals/${String(discarded.body.proposalId)}/discard`, { body: {} });
  const row = await pool.query("SELECT private_text FROM proposals WHERE id = $1", [discarded.body.proposalId]);
  expect(row.rows[0]?.private_text).toBeNull();
  await stranger.close();
  await close();
});

test("t.id.recover-single-use and t.id.double-refused and t.config.publish-unset", async () => {
  const created = await client.call("/api/identity", { body: { pseudonym: "River Stone", acknowledge: true } });
  const code = String(created.body.recoveryCode);
  await client.call("/api/sign-out", { body: {} });
  const first = await client.call("/api/recover", { body: { code } });
  expect(first.status).toBe(200);
  const second = await client.call("/api/recover", { body: { code } });
  expect(second.body.code).toBe("recovery_refused");
  expect(() => loadConfig({ runMode: "production", publishAccess: "test-any-authenticated", pepper: "production-pepper-value" })).toThrow(/production refuses/);
  const closed = await boot(pool, { publishAccess: null });
  const refused = await closed.call("/api/proposals/00000000-0000-4000-8000-000000000001/publish", { body: { proposalVersion: 1, key: "k" } });
  expect(refused.body.code).toBe("publishing_closed");
  await closed.close();
  await close();
});

test("t.invite.redeem-race and t.admin.no-self-promote and t.mod.scope", async () => {
  const admin = await client.call("/api/identity", { body: { pseudonym: "Admin Person", acknowledge: true } });
  await client.service.grantAdmin(String(admin.body.authorId));
  const invite = await client.call("/api/admin/invites", { body: { maxRedemptions: 1 } });
  const a = await boot(pool);
  const b = await boot(pool);
  await a.call("/api/identity", { body: { pseudonym: "River Stone", acknowledge: true } });
  await b.call("/api/identity", { body: { pseudonym: "Sky North", acknowledge: true } });
  const [ra, rb] = await Promise.all([
    a.call("/api/invites/redeem", { body: { code: invite.body.code } }),
    b.call("/api/invites/redeem", { body: { code: invite.body.code } }),
  ]);
  const codes = [ra.body.code, rb.body.code].sort();
  expect(codes).toEqual(["grant", "invite_refused"]);
  const self = await a.call("/api/admin/grant", { body: { role: "administrator" } });
  expect(self.status).toBe(404);
  await a.service.grantAdmin(String((await a.call("/api/me")).body.authorId));
  const preview = await a.call("/api/interpret", { body: { text: PHRASE } });
  const quote = await b.call("/api/interpret", { body: { text: "The café regulars already have a story" } });
  expect(quote.body.code).toBe("unsupported");
  const confirm = await a.call(`/api/proposals/${String(preview.body.proposalId)}/confirm`, { body: { idempotencyKey: "m" } });
  const published = await a.call(`/api/proposals/${String(preview.body.proposalId)}/publish`, {
    body: { proposalVersion: confirm.body.proposalVersion, key: confirm.body.confirmKey },
  });
  expect(published.body.code).toBe("published");
  const hidden = await client.call("/api/admin/hide", { body: { contributionId: published.body.contributionId } });
  expect(hidden.body.code).toBe("hidden");
  const world = await b.call("/api/world");
  const names = (world.body.objects as { name: string; sentence?: string | null }[]).map((object) => object.name);
  expect(names).toContain("an unavailable place");
  expect(JSON.stringify(world.body)).not.toContain(PHRASE);
  await a.close();
  await b.close();
  await close();
});

test("t.place.deterministic and t.budget.reserve-race and t.llm.activation-off", async () => {
  const catalog = loadCatalog();
  const asset = catalog.assets[1];
  if (!asset) throw new Error("catalog");
  const first = place(asset, { x: 4, y: 4 }, "next_to", [{ x: 4, y: 4, w: 2, h: 2, hidden: true }], { w: 16, h: 16 }, 0);
  const second = place(asset, { x: 4, y: 4 }, "next_to", [{ x: 4, y: 4, w: 2, h: 2, hidden: true }], { w: 16, h: 16 }, 0);
  expect(first).toEqual(second);
  expect(first).not.toBeNull();
  const reserved = await Promise.all([client.service.reserve(true), client.service.reserve(true)]);
  expect(reserved.filter((row) => row.ok).length).toBe(2);
  expect(loadConfig().interpreterActivation).toBe("off");
  expect(() => loadConfig({ interpreterActivation: "on" as "off" })).toThrow(/not approved/);
  await close();
});

test("t.db.anon-read and t.ops.dump", async () => {
  const connection = await pool.connect();
  try {
    await connection.query("SET ROLE mundo_anon");
    await expect(connection.query("SELECT * FROM world")).rejects.toThrow(/permission denied/);
  } finally {
    await connection.query("RESET ROLE");
    connection.release();
  }
  await close();
});

test("t.cont.parent and t.return.refresh and t.mod.feed", async () => {
  const world = await client.call("/api/world");
  const cafe = (world.body.objects as { id: string; contributionId: string }[])[0];
  if (!cafe) throw new Error("seed");
  const revisionBefore = await pool.query<{ placement_revision: string }>("SELECT placement_revision FROM world WHERE id = 1");
  const author = await client.call("/api/identity", { body: { pseudonym: "River Stone", acknowledge: true } });
  await client.service.grantAdmin(String(author.body.authorId));
  const invite = await client.call("/api/admin/invites", { body: { maxRedemptions: 2 } });
  await client.call("/api/invites/redeem", { body: { code: invite.body.code } });
  const mine = await client.call("/api/interpret", { body: { text: PHRASE, anchorId: cafe.id } });
  const mineConfirm = await client.call(`/api/proposals/${String(mine.body.proposalId)}/confirm`, { body: { idempotencyKey: "mine" } });
  const minePub = await client.call(`/api/proposals/${String(mine.body.proposalId)}/publish`, {
    body: { proposalVersion: mineConfirm.body.proposalVersion, key: mineConfirm.body.confirmKey },
  });
  const placed = await pool.query<{ id: string; contribution_id: string }>("SELECT id, contribution_id FROM placed_objects WHERE contribution_id = $1", [minePub.body.contributionId]);
  const other = await boot(pool);
  await other.call("/api/identity", { body: { pseudonym: "Sky North", acknowledge: true } });
  await other.call("/api/invites/redeem", { body: { code: invite.body.code } });
  const preview = await other.call("/api/interpret", { body: { text: PHRASE, anchorId: placed.rows[0]?.id } });
  const confirmed = await other.call(`/api/proposals/${String(preview.body.proposalId)}/confirm`, { body: { idempotencyKey: "cont" } });
  const published = await other.call(`/api/proposals/${String(preview.body.proposalId)}/publish`, {
    body: { proposalVersion: confirmed.body.proposalVersion, key: confirmed.body.confirmKey },
  });
  expect(published.body.code).toBe("published");
  const parent = await pool.query<{ parent_contribution_id: string }>("SELECT parent_contribution_id FROM contributions WHERE id = $1", [published.body.contributionId]);
  expect(parent.rows[0]?.parent_contribution_id).toBe(placed.rows[0]?.contribution_id);
  const noted = await client.call("/api/world");
  expect(String((noted.body.returnNote as { text?: string } | null)?.text ?? "")).toContain("Sky North");
  const again = await client.call("/api/world");
  expect(again.body.returnNote).toBeTruthy();
  await client.call("/api/return/dismiss", { body: {} });
  const gone = await client.call("/api/world");
  expect(gone.body.returnNote).toBeNull();
  const revisionBeforeHide = await pool.query<{ placement_revision: string }>("SELECT placement_revision FROM world WHERE id = 1");
  await client.call("/api/admin/hide", { body: { contributionId: published.body.contributionId } });
  const revisionAfter = await pool.query<{ placement_revision: string }>("SELECT placement_revision FROM world WHERE id = 1");
  expect(Number(revisionAfter.rows[0]?.placement_revision)).toBeGreaterThan(Number(revisionBefore.rows[0]?.placement_revision));
  expect(revisionAfter.rows[0]?.placement_revision).toBe(revisionBeforeHide.rows[0]?.placement_revision);
  await other.close();
  await close();
});

test("t.share.opaque and t.gate.six-shape fingerprint", async () => {
  const world = await client.call("/api/world");
  const id = (world.body.objects as { id: string }[])[0]?.id ?? "";
  expect(id).toMatch(/^[0-9a-f-]{36}$/);
  const share = await fetch(`${client.url}/share`);
  const html = await share.text();
  expect(html).toContain("<title>Shared world</title>");
  expect(html).not.toContain("Café");
  const fp1 = fingerprint({
    proposalId: id,
    proposalVersion: 1,
    action: { type: "PlaceObject", assetId: "bus_stop", anchorId: null, relation: "next_to", placement: { x: 1, y: 1 } },
    authorId: id,
    catalogVersion: "1",
    policyVersion: "1",
  });
  const fp2 = fingerprint({
    proposalId: id,
    proposalVersion: 2,
    action: { type: "PlaceObject", assetId: "bus_stop", anchorId: null, relation: "next_to", placement: { x: 1, y: 1 } },
    authorId: id,
    catalogVersion: "1",
    policyVersion: "1",
  });
  expect(fp1).not.toBe(fp2);
  await close();
});

test("t.static.escape and adjacent paths", () => {
  expect(staticTarget("/assets/../package.json")?.endsWith("/dist/package.json")).toBe(true);
  expect(staticTarget("/assets/../../etc/passwd")).toBeNull();
  expect(staticTarget("/assets/./../../src/server/service.ts")).toBeNull();
  expect(staticTarget("/assets/foo/../../../package.json")).toBeNull();
  const index = staticTarget("/");
  const deepLink = staticTarget("/c/00000000-0000-4000-8000-000000000000");
  const asset = staticTarget("/assets/app.js");
  expect(index?.endsWith("/dist/index.html")).toBe(true);
  expect(deepLink).toBe(index);
  expect(asset?.endsWith("/dist/assets/app.js")).toBe(true);
  expect(asset?.includes("..")).toBe(false);
});

test("t.copy.invite-required is not the closed message", () => {
  expect(stageNotice("invite_required")).toBe("An invitation is required before publishing.");
  expect(stageNotice("publishing_closed")).toBe("Publishing isn't open yet");
  expect(stageNotice("invite_refused")).toBeNull();
  expect(stageNotice("published")).toBeNull();
  expect(stageNotice("unsupported")).toContain("isn’t supported yet");
  expect(stageNotice("pii")).toContain("personal data");
  expect(stageNotice("empty")).toContain("short phrase");
  expect(stageNotice("provider_failed")).toContain("unavailable");
  expect(stageNotice("superseded")).toContain("newer preview");
  expect(stageNotice("")).toBeNull();
});
