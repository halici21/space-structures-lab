/**
 * Captures the review screenshots listed in docs/UI_VALIDATION_REPORT.md at
 * each target viewport. Also asserts basic layout health on every capture:
 * no horizontal page overflow and no console errors.
 */
import { expect, test, type Page } from "@playwright/test";
import { freshModel } from "../e2e/helpers";

const OUT = "docs/screenshots";

const VIEWPORTS = [
  { name: "desktop-1280x900", width: 1280, height: 900 },
  { name: "large-1440x1000", width: 1440, height: 1000 },
  { name: "laptop-1024x768", width: 1024, height: 768 },
] as const;

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

for (const vp of VIEWPORTS) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("capture states", async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto("/");
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await expect(page.getByTestId("empty-state")).toBeVisible();
      await page.screenshot({ path: `${OUT}/${vp.name}-01-initial.png` });
      await noHorizontalOverflow(page);

      await freshModel(page);
      await page.screenshot({ path: `${OUT}/${vp.name}-02-beam-selected.png` });
      await noHorizontalOverflow(page);

      await page.getByTestId("ws-learn").click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/${vp.name}-03-learn.png` });
      await noHorizontalOverflow(page);

      await page.getByTestId("ws-analyze").click();
      await page.getByTestId("dock-tab-details").click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/${vp.name}-04-analysis-results.png` });

      await page.getByTestId("dock-tab-sensitivity").click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${vp.name}-05-analysis-sensitivity.png` });

      await page.locator('[data-why="tipDeflection"]').click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${vp.name}-06-why.png` });
      await page.keyboard.press("Escape");

      expect(errors).toEqual([]);
    });
  });
}

test.describe("mobile-390x844", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("capture states", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.screenshot({ path: `${OUT}/mobile-390x844-01-initial.png` });
    await noHorizontalOverflow(page);

    await freshModel(page);
    await page.screenshot({ path: `${OUT}/mobile-390x844-02-viewport.png` });
    await noHorizontalOverflow(page);

    await page.getByTestId("mobile-nav-inspector").click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/mobile-390x844-03-properties-sheet.png` });
    await page.keyboard.press("Escape");

    await page.getByTestId("mobile-result-chip").click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/mobile-390x844-04-results-sheet.png` });
    await page.keyboard.press("Escape");

    await page.getByTestId("mobile-nav-learn").click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/mobile-390x844-05-learn-sheet.png` });
    await page.keyboard.press("Escape");

    await page.getByTestId("mobile-nav-tree").click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/mobile-390x844-06-tree-sheet.png` });
    await noHorizontalOverflow(page);

    expect(errors).toEqual([]);
  });
});

test.describe("light theme", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });
  test("capture", async ({ page }) => {
    await freshModel(page);
    await page.getByTestId("toggle-theme").click();
    await page.getByTestId("ws-analyze").click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/large-1440x1000-07-light-analyze.png` });
  });
});
