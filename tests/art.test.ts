import { afterAll, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import catalogJson from "../assets/catalog/catalog.json" with { type: "json" };
import {
  acceptedPalette,
  loadCatalog,
  shownAsset,
  validateCatalog,
  type Catalog,
} from "../src/domain/catalog.js";
import { FRAME_SOURCES } from "../src/scene/frames.js";
import { place } from "../src/domain/placement.js";
import { buildingHit, cellToScreen, footprintQuad, pointInPoly } from "../src/scene/iso.js";
import { partPose } from "../src/scene/pose.js";
import { boot, preparePool, type Client } from "./harness.js";
import type pg from "pg";

const catalog = loadCatalog();

test("t.art.script-coverage and t.art.provenance and t.art.palette", () => {
  expect(catalog.assets.map((asset) => asset.id)).toEqual([
    "cafe_for_birds", "bus_stop", "red_tower", "color_frames", "house_blue", "house_gold",
    "red_pavilion", "yellow_bus", "canal_boat", "red_bridge", "round_tree", "pointed_tree",
    "bench", "blue_bird", "red_bird", "gold_bird", "bird_cyclist", "shrub",
  ]);
  expect(catalog.assets.every((asset) => asset.provenance.thirdPartyReference === false)).toBe(true);
  const files = catalog.assets.flatMap((asset) => asset.layers.map((layer) => layer.file));
  expect(new Set(files)).toEqual(new Set(Object.keys(FRAME_SOURCES)));
  expect(files.filter((file) => file === "frames/bird.svg")).toHaveLength(4);
  expect(files.filter((file) => file === "frames/bird-sit.svg")).toHaveLength(8);
  const moving = catalog.assets.flatMap((asset) => asset.layers).filter((layer) => layer.motion !== "none");
  expect(moving.map((layer) => layer.motion).sort()).toEqual(["drift", "glance"]);
  expect(JSON.stringify(catalogJson)).not.toContain("prototypes/");
  const bird = readFileSync("assets/catalog/frames/bird.svg", "utf8");
  expect(bird.match(/<svg/g)).toHaveLength(1);
  const cafe = catalog.assets[0];
  const stop = catalog.assets[1];
  if (!cafe || !stop) throw new Error("catalog");
  expect(acceptedPalette(cafe, "cafe-day", catalog.palettes)?.id).toBe("cafe-day");
  expect(acceptedPalette(cafe, "stop-day", catalog.palettes)).toBeNull();
  expect(acceptedPalette(cafe, "cafe-day", [])).toBeNull();
  expect(acceptedPalette(stop, "not-a-palette", catalog.palettes)).toBeNull();
});

test("t.art.variant-separation rejects a broken catalog", () => {
  const base = structuredClone(catalog) as Catalog;
  const read = (file: string) => FRAME_SOURCES[file] ?? "";
  expect(() => validateCatalog(base, read)).not.toThrow();
  const missingRole = structuredClone(base);
  delete missingRole.palettes[1]?.roles.roof;
  expect(() => validateCatalog(missingRole, read)).toThrow(/missing atlas frame/);
  const badHex = structuredClone(base);
  const plaza = badHex.palettes[0];
  if (!plaza) throw new Error("palette");
  plaza.roles.field = "red";
  expect(() => validateCatalog(badHex, read)).toThrow(/missing atlas frame/);
  const injected = structuredClone(base);
  expect(() => validateCatalog(injected, () => "<svg>{{wall}}</svg><script></script>")).toThrow(/missing atlas frame/);
  expect(() => validateCatalog(injected, () => "<svg>{{wall}} prototypes/</svg>")).toThrow(/missing atlas frame/);
  expect(() => validateCatalog(injected, () => "<svg>{{wall}} data:image/png;base64,aa</svg>")).toThrow(/missing atlas frame/);
  expect(() => validateCatalog(injected, () => "<svg>{{wall}}<image href='x'/></svg>")).toThrow(/missing atlas frame/);
  expect(() => validateCatalog(injected, () => "<svg>{{wall}} deadbeef</svg>", { digests: ["deadbeef"] })).toThrow(/missing atlas frame/);
  expect(() => validateCatalog(injected, () => "<svg>{{wall}} {{extra}}</svg>")).toThrow(/missing atlas frame/);
  const dropped = structuredClone(base);
  dropped.assets = dropped.assets.filter((asset) => asset.id !== "bus_stop");
  expect(() => validateCatalog(dropped, read)).toThrow(/bus_stop/);
  const copy = JSON.parse(readFileSync("copy/en.json", "utf8")) as Record<string, unknown>;
  const copyKeys = new Set(Object.keys(copy).filter((key) => typeof copy[key] === "string"));
  expect(() => validateCatalog(base, read, { copyKeys })).not.toThrow();
  const typo = structuredClone(base);
  const cafeAsset = typo.assets[0];
  if (!cafeAsset) throw new Error("catalog");
  cafeAsset.copyKey = "asset.missing";
  expect(() => validateCatalog(typo, read, { copyKeys })).toThrow(/missing provenance/);
  const extra = structuredClone(base);
  const stopAsset = extra.assets[1];
  if (!stopAsset) throw new Error("catalog");
  extra.assets.push({ ...stopAsset, id: "lantern" });
  expect(() => validateCatalog(extra, read)).not.toThrow();
});

test("t.art.hidden-asset and t.art.motion and t.art.hit", () => {
  expect(shownAsset(true, false, "cafe_for_birds", "cafe-day")).toEqual({ assetId: null, paletteId: null });
  expect(shownAsset(true, true, "cafe_for_birds", "cafe-day").assetId).toBe("cafe_for_birds");
  expect(shownAsset(false, false, "bus_stop", "stop-day").paletteId).toBe("stop-day");
  expect(shownAsset(false, true, "bus_stop", "stop-day").assetId).toBe("bus_stop");

  const step = 480;
  expect(partPose("hop", 0, step, 4, 0, 8, true)).toEqual({ x: 0, y: 0, rotation: 0 });
  expect(partPose("hop", 0, step, 4, 0, 8, false).y).toBe(0);
  expect(partPose("hop", step * 2, step, 4, 0, 8, false).y).toBeCloseTo(-8, 5);
  const rising = partPose("hop", step, step, 4, 0, 8, false);
  const earlier = partPose("hop", step / 2, step, 4, 0, 8, false);
  expect(rising.y).toBeLessThan(-1);
  expect(rising.y).toBeGreaterThan(-8);
  expect(earlier.y).toBeLessThan(0);
  expect(earlier.y).toBeGreaterThan(rising.y);
  expect(partPose("hop", 0, step, 4, 1, 8, false).y).toBeCloseTo(rising.y, 5);
  expect(partPose("sway", 0, step, 4, 0, 4, false).rotation).toBe(0);
  const swayPeak = partPose("sway", step, step, 4, 0, 4, false);
  const swayBetween = partPose("sway", step / 2, step, 4, 0, 4, false);
  expect(swayPeak.rotation).toBeCloseTo((4 * Math.PI) / 180, 5);
  expect(swayBetween.rotation).toBeGreaterThan(0);
  expect(swayBetween.rotation).toBeLessThan(swayPeak.rotation);
  expect(partPose("glance", 0, 2000, 8, 0, 3, false).y).toBe(0);
  expect(partPose("glance", 2000 * 8 * 0.04, 2000, 8, 0, 3, false).y).toBeLessThan(0);
  expect(partPose("glance", 2000 * 8 * 0.5, 2000, 8, 0, 3, false)).toEqual({ x: 0, y: 0, rotation: 0 });
  expect(partPose("drift", 0, 2000, 8, 0, 5, false).x).toBe(0);
  expect(partPose("drift", 2000 * 2, 2000, 8, 0, 5, false).x).toBeCloseTo(5, 5);
  expect(partPose("drift", 2000 * 8, 2000, 8, 0, 5, false).x).toBeCloseTo(0, 5);
  expect(partPose("none", step, step, 4, 1, 8, false)).toEqual({ x: 0, y: 0, rotation: 0 });
  expect(partPose("hop", step, step, 1, 0, 8, false)).toEqual({ x: 0, y: 0, rotation: 0 });

  const quad = footprintQuad(4, 4, 2, 2);
  const center = cellToScreen(5, 5);
  expect(pointInPoly(center.sx, center.sy, quad)).toBe(true);
  const neighbor = cellToScreen(3.5, 4.5);
  expect(pointInPoly(neighbor.sx, neighbor.sy, quad)).toBe(false);
  const hit = buildingHit(quad, 80);
  const north = quad[0];
  if (!north) throw new Error("quad");
  expect(pointInPoly(north.sx, north.sy - 40, hit)).toBe(true);
  expect(pointInPoly(neighbor.sx, neighbor.sy - 40, hit)).toBe(false);
  expect(pointInPoly(north.sx - 400, north.sy, hit)).toBe(false);

  const stop = catalog.assets.find((asset) => asset.id === "bus_stop");
  const cafe = catalog.assets.find((asset) => asset.id === "cafe_for_birds");
  if (!stop || !cafe) throw new Error("catalog");
  const occupants = [{ x: 4, y: 4, w: 2, h: 2, hidden: false }];
  const bounds = { w: 16, h: 16 };
  const beside = place(stop, { x: 4, y: 4 }, "next_to", occupants, bounds, 0);
  const otherSide = place(stop, { x: 4, y: 4 }, "next_to", occupants, bounds, 1);
  const back = place(stop, { x: 4, y: 4 }, "next_to", occupants, bounds, 4);
  expect(beside).toEqual({ x: 5, y: 3 });
  expect(otherSide).toEqual({ x: 3, y: 5 });
  expect((back?.x ?? 0) + (back?.y ?? 0)).toBeLessThan((beside?.x ?? 0) + (beside?.y ?? 0));
  expect(place(stop, null, "next_to", occupants, bounds, 0)).toEqual({ x: 1, y: 1 });
  expect(place(cafe, { x: 4, y: 4 }, "near", occupants, bounds, 0)?.x).toBeGreaterThanOrEqual(0);
  expect(place(stop, { x: 4, y: 4 }, "across_from", occupants, bounds, 0)?.x).toBeLessThan(4);
});

let pool: pg.Pool | undefined;
let client: Client;

test("t.art.instances separate rows and hidden marker", async () => {
  pool = await preparePool();
  const { resetDatabase } = await import("../src/server/db.js");
  await resetDatabase(pool);
  client = await boot(pool);
  const phrase = "A bus stop for the café's regulars.";
  const me = await client.call("/api/identity", { body: { pseudonym: "River Stone", acknowledge: true } });
  await client.service.grantAdmin(String(me.body.authorId));
  const invite = await client.call("/api/admin/invites", { body: {} });
  await client.call("/api/invites/redeem", { body: { code: invite.body.code } });
  async function placeStop(confirmKey: string): Promise<{ proposalId: string; key: string; version: number }> {
    const preview = await client.call("/api/interpret", { body: { text: phrase } });
    const proposalId = String(preview.body.proposalId);
    const confirmed = await client.call(`/api/proposals/${proposalId}/confirm`, { body: { idempotencyKey: confirmKey } });
    const key = String(confirmed.body.confirmKey);
    const version = Number(confirmed.body.proposalVersion);
    const published = await client.call(`/api/proposals/${proposalId}/publish`, { body: { proposalVersion: version, key } });
    expect(published.body.code).toBe("published");
    return { proposalId, key, version };
  }
  const first = await placeStop("stop-a");
  const replayed = await client.call(`/api/proposals/${first.proposalId}/publish`, {
    body: { proposalVersion: first.version, key: first.key },
  });
  expect(replayed.body.code).toBe("already_published");
  const onceBody = await client.call("/api/world");
  const once = onceBody.body.objects as { id: string; assetId: string; administrator?: boolean }[];
  const seed = once.find((object) => object.assetId === "cafe_for_birds");
  expect(seed?.administrator).toBe(true);
  expect(onceBody.body.homeId).toBe(seed?.id);
  expect(once.filter((object) => object.assetId === "bus_stop")).toHaveLength(1);
  await placeStop("stop-b");
  const twice = (await client.call("/api/world")).body.objects as { id: string; assetId: string; x: number; y: number }[];
  const stops = twice.filter((object) => object.assetId === "bus_stop");
  expect(stops).toHaveLength(2);
  expect(new Set(stops.map((object) => object.id)).size).toBe(2);
  expect(new Set(stops.map((object) => `${object.x},${object.y}`)).size).toBe(2);
  const rows = await pool.query<{ id: string }>("SELECT id FROM placed_objects");
  expect(rows.rows.map((row) => row.id).sort()).toEqual(twice.map((object) => object.id).sort());
  await pool.query("UPDATE placed_objects SET hidden = true WHERE catalog_asset_id = 'cafe_for_birds'");
  const hiddenBody = await client.call("/api/world");
  const hidden = hiddenBody.body.objects as { id: string; assetId: string | null; name: string; hidden?: boolean; authorLabel?: string }[];
  const cafe = hidden.find((object) => object.hidden);
  expect(cafe?.id).toBe(seed?.id);
  expect(hiddenBody.body.homeId).toBe(seed?.id);
  expect(cafe?.assetId).toBeNull();
  expect(cafe?.name).toBe("an unavailable place");
  expect(cafe?.authorLabel).toBeUndefined();
  expect(hidden.filter((object) => object.assetId === "bus_stop")).toHaveLength(2);
  expect(hidden.filter((object) => object.assetId === "bus_stop").every((object) => object.id !== hiddenBody.body.homeId)).toBe(true);
  await client.close();
});

afterAll(async () => {
  await pool?.end();
});
