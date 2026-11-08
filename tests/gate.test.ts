import { readdirSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";
import gate from "../scripts/privacy-gate.mjs";

const { scanPdf, scanPngBytes, scanText } = gate;

test("t.gate.six-png", () => {
  const files = readdirSync("docs/prototypes").filter((name) => name.endsWith(".png")).sort();
  expect(files).toEqual([
    "prototype-00.png",
    "prototype-01.png",
    "prototype-02.png",
    "prototype-03.png",
    "prototype-04.png",
    "prototype-05.png",
  ]);
  const manifest = JSON.parse(readFileSync("docs/prototypes/manifest.json", "utf8")) as { images: { sha256: string; source_image_sha256?: string }[] };
  expect(manifest.images).toHaveLength(6);
  expect(manifest.images.every((image) => image.source_image_sha256 === undefined)).toBe(true);
});

test("t.gate.staged denylist and t.art.provenance", () => {
  const rooted = "/" + "work" + "space" + "/secret";
  expect(scanText(rooted, "sample").length).toBeGreaterThan(0);
  expect(scanText("account/workspace eligibility", "sample")).toEqual([]);
  const catalog = readFileSync("assets/catalog/catalog.json", "utf8");
  const manifest = JSON.parse(readFileSync("docs/prototypes/manifest.json", "utf8")) as { images: { sha256: string }[] };
  for (const image of manifest.images) expect(catalog.includes(image.sha256)).toBe(false);
  expect(catalog.includes("\"thirdPartyReference\": false")).toBe(true);
  const pdf = readFileSync("docs/source/user-journey-v0.1.pdf");
  expect(scanPdf(pdf, "journey.pdf")).toEqual([]);
  const encoded = Buffer.from("/A#75thor /C#72eationDate");
  expect(scanPdf(encoded, "encoded.pdf").length).toBeGreaterThan(0);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const liar = Buffer.concat([png, Buffer.from("tEXt")]);
  expect(scanPngBytes(liar, "liar.png").some((hit) => hit.includes("tEXt"))).toBe(true);
  const docx = readFileSync("docs/source/user-journey-v0.1.docx");
  expect(docx.includes(Buffer.from("Optional related working notes"))).toBe(false);
});

test("t.plan.milestones and t.rtm.coverage", () => {
  const plan = readFileSync("docs/plan/implementation-plan.md", "utf8");
  for (const milestone of ["M1 Explore", "M2 Try", "M3 Publish", "M4 Continue", "M5 Deliver"]) {
    expect(plan).toContain(milestone);
  }
  expect(plan).toContain("fixture interpreter — not acceptance-ready");
  const ledger = readFileSync("docs/plan/findings-resolution-ledger.md", "utf8");
  expect(ledger).toContain("t.pub.conflict.persist");
  expect(ledger).toContain("t.mod.scope");
});
