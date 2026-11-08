import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("t.e2e.j1 explore and t.e2e.j3 preview", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Test mode — fixture interpreter")).toBeVisible();
  await expect(page.getByRole("button", { name: /Café for birds/ })).toBeVisible();
  await page.getByRole("button", { name: /Café for birds/ }).click();
  await expect(page.getByText("Created by Administrator.")).toBeVisible();
  await page.getByRole("button", { name: "A bus stop for the café's regulars.", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Private preview — only you can see this." })).toBeVisible();
  await page.screenshot({ path: "test-results/journey-preview.png", fullPage: true });
  const axe = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  const serious = axe.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  expect(serious.map((item) => item.id)).toEqual([]);
});

test("t.a11y.dom webgl off still lists the world", async ({ page }) => {
  await page.goto("/?webgl=0");
  await expect(page.getByText("Illustration unavailable. The list still works.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Café for birds/ })).toBeVisible();
  await page.screenshot({ path: "test-results/journey-dom-list.png", fullPage: true });
});

test("t.e2e.j5 browser publish with invite", async ({ page }) => {
  const name = `Lane ${Math.floor(Math.random() * 9000) + 1000}`;
  await page.goto("/");
  await page.getByRole("button", { name: /Café for birds/ }).click();
  await page.getByRole("button", { name: "A bus stop for the café's regulars.", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Private preview — only you can see this." })).toBeVisible();
  await page.getByRole("button", { name: "This looks right" }).click();
  await page.getByLabel("Pseudonym").fill(name);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create pseudonym" }).click();
  await expect(page.getByText("Recovery code:")).toBeVisible();
  const me = await page.evaluate(async () => {
    const response = await fetch("/api/me");
    return response.json() as Promise<{ authorId?: string }>;
  });
  expect(me.authorId).toBeTruthy();
  execFileSync("npx", ["tsx", "src/server/cli.ts", "grant-admin", me.authorId!], { cwd: process.cwd() });
  const minted = execFileSync("npx", ["tsx", "src/server/cli.ts", "mint-invite", me.authorId!], { cwd: process.cwd(), encoding: "utf8" }).trim().split("\n").at(-1) ?? "";
  await page.getByLabel("Use invitation").fill(minted);
  await page.getByRole("button", { name: "Use invitation" }).click();
  await page.getByRole("button", { name: "This looks right" }).click();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published. It’s part of the shared world.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Bus stop/ }).first()).toBeVisible();
  await page.getByText("Recovery code:").evaluate((node) => {
    node.textContent = "Recovery code: hidden in this capture";
  });
  await page.getByLabel("Use invitation").fill("");
  await page.screenshot({ path: "test-results/journey-published.png", fullPage: true });
});

test("t.vis.mobile explore", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Café for birds/ })).toBeVisible();
  await page.screenshot({ path: "test-results/journey-mobile.png", fullPage: true });
});

test("t.vis.pause-resume and reduced motion", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => {
    const hook = (window as unknown as { __sharedWorldTest?: { tickerStarted: () => boolean } }).__sharedWorldTest;
    return hook?.tickerStarted() === true;
  });
  await page.getByRole("button", { name: "Pause motion" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __sharedWorldTest: { tickerStarted: () => boolean } }).__sharedWorldTest.tickerStarted())).toBe(false);
  await page.getByRole("button", { name: "Resume motion" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __sharedWorldTest: { tickerStarted: () => boolean } }).__sharedWorldTest.tickerStarted())).toBe(true);
  await page.getByRole("button", { name: "Reduced motion" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __sharedWorldTest: { tickerStarted: () => boolean } }).__sharedWorldTest.tickerStarted())).toBe(false);
  await page.getByRole("button", { name: "Reduced motion" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __sharedWorldTest: { tickerStarted: () => boolean } }).__sharedWorldTest.tickerStarted())).toBe(true);
});

test("t.copy.unsupported and curly suggestion", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Preview privately" }).click();
  await expect(page.getByText("Write a short phrase first.")).toBeVisible();
  await page.getByLabel("What would you add?").fill("leave it as it is");
  await page.getByRole("button", { name: "Preview privately" }).click();
  await expect(page.getByText("That phrase does not change the world.")).toBeVisible();
  await page.getByLabel("What would you add?").fill("A bus stop for the café’s regulars.");
  await page.getByRole("button", { name: "Preview privately" }).click();
  await expect(page.getByRole("heading", { name: "Private preview — only you can see this." })).toBeVisible();
});

test("t.vis.reload keeps the illustration", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Reload illustration" }).click();
  await expect(page.locator("[data-scene-host]")).toBeVisible();
  await expect(page.getByText("Illustration unavailable. The list still works.")).toHaveCount(0);
});

test("t.vis.hidden-no-ticker", async ({ page }) => {
  await page.goto("/?scene=deterministic");
  await page.waitForTimeout(500);
  const started = await page.evaluate(() => {
    const hook = (window as unknown as { __sharedWorldTest?: { tickerStarted: () => boolean } }).__sharedWorldTest;
    return hook?.tickerStarted() ?? null;
  });
  expect(started).toBe(false);
});
