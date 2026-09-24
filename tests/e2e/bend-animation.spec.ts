import { expect, test } from "@playwright/test";
import { freshModel, setField } from "./helpers";

test.use({ viewport: { width: 1024, height: 768 } });

test("static bend preview can play, pause, resume and returns to the solved shape", async ({ page }) => {
  await freshModel(page);
  await setField(page, "field-L", "0.25");
  const viewport = page.getByTestId("viewport-scene");
  const progress = async () => Number(await viewport.getAttribute("data-ramp-progress"));
  const toggle = page.getByTestId("bend-animation-toggle");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect.poll(progress).toBeLessThan(1);
  await page.waitForTimeout(520);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  const paused = await progress();
  expect(paused).toBeGreaterThan(0.05);
  expect(paused).toBeLessThan(0.95);
  await page.waitForTimeout(180);
  expect(await progress()).toBeCloseTo(paused, 2);
  await page.screenshot({ path: "docs/screenshots/laptop-1024x768-09-bend-preview.png" });

  await page.getByTestId("ws-analyze").click();
  await expect(page.getByTestId("contour-legend")).toBeVisible();
  await expect.poll(async () => {
    const barBox = await page.getByTestId("deformation-bar").boundingBox();
    const legendBox = await page.getByTestId("contour-legend").boundingBox();
    return barBox && legendBox ? barBox.x + barBox.width - legendBox.x : Infinity;
  }).toBeLessThan(0);
  await page.screenshot({ path: "docs/screenshots/laptop-1024x768-10-bend-analyze.png" });

  await toggle.click();
  await expect.poll(progress).toBe(1);
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("vp-label-deflection")).toContainText("24.15 mm");
  await expect(page.getByTestId("vp-label-force")).toContainText("F = 100 N");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("keeps the solved shape still", async ({ page }) => {
    await freshModel(page);
    await expect(page.getByTestId("bend-animation-toggle")).toBeDisabled();
    await expect(page.getByTestId("viewport-scene")).toHaveAttribute("data-ramp-progress", "1.000");
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("keeps the load ramp control usable beside deformation scale", async ({ page }) => {
    await freshModel(page);
    await page.getByTestId("mobile-nav-inspector").click();
    await setField(page, "field-L", "0.25");
    await page.keyboard.press("Escape");
    const toggle = page.getByTestId("bend-animation-toggle");
    await expect(toggle).toBeVisible();
    await toggle.click();
    await page.waitForTimeout(520);
    await toggle.click();
    const progress = Number(await page.getByTestId("viewport-scene").getAttribute("data-ramp-progress"));
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(1);
    await page.screenshot({ path: "docs/screenshots/mobile-390x844-07-bend-preview.png" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
});
