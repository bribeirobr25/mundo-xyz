import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { SCENE_MAX_RESOLUTION } from "../src/scene/limits.js";

test("t.perf.poll-once and t.perf.resolution-cap and adjacent", () => {
  const scene = readFileSync("src/web/scene.tsx", "utf8");
  const app = readFileSync("src/web/App.tsx", "utf8");
  expect(scene).not.toContain("shared-world-visible");
  expect(app).not.toContain("shared-world-visible");
  expect(app).toContain('addEventListener("visibilitychange"');
  expect(app).toContain('addEventListener("focus"');
  expect(app).toContain('addEventListener("pageshow"');
  expect(app).toContain('addEventListener("online"');
  expect(app).toContain("if-none-match");
  expect(app).toContain("import(\"./scene.js\")");
  expect(scene).toContain("SCENE_MAX_RESOLUTION");
  expect(SCENE_MAX_RESOLUTION).toBe(2);
  expect(scene).toContain("created.stop()");
  expect(scene).toContain('document.visibilityState === "hidden"');
  expect(scene).toContain('removeEventListener("visibilitychange"');
  expect(scene).toContain('removeEventListener("focus"');
  expect(app).toContain("setInterval(poll, config.pollIntervalMs)");
  expect(app).toContain("IllustrationBoundary");
  expect(app).toContain("POLL_BURST_MS");
  expect(app).toContain("isLatestPoll");
});
