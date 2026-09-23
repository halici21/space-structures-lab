/**
 * Automated accessibility scan (axe-core, WCAG 2.1 A/AA rules) of the main
 * states. Fails on serious or critical violations.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { freshModel } from "./helpers";

async function scan(page: Page, label: string) {
  // Let entrance animations and theme colour transitions finish: axe measures
  // contrast from the colours rendered at scan time.
  await page.waitForTimeout(450);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = bad.map((v) => `${label}: [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length}) ${v.nodes[0]?.target.join(" ")}`);
  expect(summary, summary.join("\n")).toEqual([]);
}

test("empty state", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await scan(page, "empty");
});

test("model workspace, dark and light", async ({ page }) => {
  await freshModel(page);
  await scan(page, "model-dark");
  await page.getByTestId("toggle-theme").click();
  await scan(page, "model-light");
});

test("analyze, learn and assumptions", async ({ page }) => {
  await freshModel(page);
  await page.getByTestId("ws-analyze").click();
  await scan(page, "analyze");
  await page.getByTestId("ws-learn").click();
  await scan(page, "learn");
  await page.getByTestId("dock-tab-assumptions").click();
  await scan(page, "assumptions");
});

test("why popover and library dialog", async ({ page }) => {
  await freshModel(page);
  await page.locator('[data-why="tipDeflection"]').click();
  await scan(page, "why");
  await page.keyboard.press("Escape");
  await page.getByTestId("open-library").click();
  await scan(page, "library");
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("viewport and properties sheet", async ({ page }) => {
    await freshModel(page);
    await scan(page, "mobile");
    await page.getByTestId("mobile-nav-inspector").click();
    await scan(page, "mobile-sheet");
  });
});
