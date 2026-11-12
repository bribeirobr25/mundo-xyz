import { expect, test } from "vitest";
import { originAllowed } from "../src/server/origin.js";
import { boot, preparePool } from "./harness.js";

const PHRASE = "A bus stop for the café's regulars.";

test("t.origin.loopback and adjacent addresses", () => {
  expect(originAllowed("http://127.0.0.1:4500", "http://127.0.0.1:4500", "local-test", 4500)).toBe(true);
  expect(originAllowed("http://localhost:4500", "http://127.0.0.1:4500", "local-test", 4500)).toBe(true);
  expect(originAllowed("http://[::1]:4500", "http://127.0.0.1:4500", "local-test", 4500)).toBe(true);
  expect(originAllowed("http://LOCALHOST:4500", "http://127.0.0.1:3000", "local-test", 4500)).toBe(true);
  expect(originAllowed(undefined, "http://127.0.0.1:4500", "local-test", 4500)).toBe(false);
  expect(originAllowed("null", "http://127.0.0.1:4500", "local-test", 4500)).toBe(false);
  expect(originAllowed("https://evil.example", "http://127.0.0.1:4500", "local-test", 4500)).toBe(false);
  expect(originAllowed("http://localhost:4501", "http://127.0.0.1:4500", "local-test", 4500)).toBe(false);
  expect(originAllowed("https://localhost:4500", "http://127.0.0.1:4500", "local-test", 4500)).toBe(false);
  expect(originAllowed("http://localhost.evil.example:4500", "http://127.0.0.1:4500", "local-test", 4500)).toBe(false);
  expect(originAllowed("http://user:pass@localhost:4500", "http://127.0.0.1:4500", "local-test", 4500)).toBe(false);
  expect(originAllowed("http://127.0.0.1:4500/extra", "http://127.0.0.1:4500", "local-test", 4500)).toBe(false);
  expect(originAllowed("http://localhost:4500", "https://example.test", "production", 4500)).toBe(false);
  expect(originAllowed("https://example.test", "https://example.test", "production", 4500)).toBe(true);
  expect(originAllowed("https://example.test.", "https://example.test", "production", 4500)).toBe(false);
});

test("t.origin.http preview recovery and rejected", async () => {
  const pool = await preparePool();
  const client = await boot(pool, { appOrigin: "http://127.0.0.1:3000" });
  const port = new URL(client.url).port;
  try {
    const preview = await client.call("/api/interpret", { body: { text: PHRASE }, origin: `http://localhost:${port}` });
    expect(preview.status).toBe(200);
    expect(preview.body.code).toBe("ready");
    const numeric = await client.call("/api/interpret", { body: { text: PHRASE }, origin: `http://127.0.0.1:${port}` });
    expect(numeric.status).toBe(200);
    const v6 = await client.call("/api/interpret", { body: { text: PHRASE }, origin: `http://[::1]:${port}` });
    expect(v6.status).toBe(200);
    const foreign = await client.call("/api/interpret", { body: { text: PHRASE }, origin: "https://evil.example" });
    expect(foreign.status).toBe(403);
    expect(foreign.body).toEqual({ code: "origin" });
    const missing = await client.call("/api/interpret", { body: { text: PHRASE }, origin: null });
    expect(missing.status).toBe(403);
    expect(missing.body.code).toBe("origin");
    const otherPort = await client.call("/api/interpret", { body: { text: PHRASE }, origin: `http://localhost:${Number(port) + 1}` });
    expect(otherPort.status).toBe(403);
    const secure = await client.call("/api/interpret", { body: { text: PHRASE }, origin: `https://localhost:${port}` });
    expect(secure.status).toBe(403);
    const lookalike = await client.call("/api/interpret", { body: { text: PHRASE }, origin: `http://localhost.evil.example:${port}` });
    expect(lookalike.status).toBe(403);
    const recovery = await client.call("/api/recover", { body: { code: "not-a-real-code" }, origin: `http://localhost:${port}` });
    expect(recovery.status).toBe(400);
    expect(recovery.body.code).toBe("recovery_refused");
    const world = await client.call("/api/world", { method: "GET", origin: "https://evil.example" });
    expect(world.status).toBe(200);
  } finally {
    await client.close();
    await pool.end();
  }
});

test("t.origin.production stays exact", async () => {
  const pool = await preparePool();
  const client = await boot(pool, {
    runMode: "production",
    pepper: "production-test-pepper",
    appOrigin: "https://example.test",
  });
  const port = new URL(client.url).port;
  try {
    const local = await client.call("/api/interpret", { body: { text: PHRASE }, origin: `http://localhost:${port}` });
    expect(local.status).toBe(403);
    expect(local.body.code).toBe("origin");
    const exact = await client.call("/api/interpret", { body: { text: PHRASE }, origin: "https://example.test" });
    expect(exact.status).toBe(503);
    expect(exact.body.code).toBe("preview_unavailable");
    const recover = await client.call("/api/recover", { body: { code: "not-a-real-code" }, origin: "https://evil.example" });
    expect(recover.status).toBe(403);
    expect(recover.body.code).toBe("origin");
  } finally {
    await client.close();
    await pool.end();
  }
});
