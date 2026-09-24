import { expect, test } from "@playwright/test";
import { freshModel, setField } from "./helpers";

test("the first lesson leads from the invalid beam to its length input", async ({ page }) => {
  await freshModel(page);
  const action = page.getByTestId("guide-first-experiment");
  await expect(action).toContainText("0.25 m");
  await page.getByTestId("toggle-inspector").click();
  await expect(page.getByTestId("toggle-inspector")).toHaveAttribute("aria-expanded", "false");
  await action.click();
  await expect(page.getByTestId("toggle-inspector")).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("field-L")).toBeFocused();
  await setField(page, "field-L", "0.25");
  await expect(page.getByTestId("validity-notice")).toHaveAttribute("data-status", "caution");
  await expect(action).toHaveCount(0);
  await page.getByRole("button", { name: "Expand guide" }).click();
  await expect(page.getByTestId("onboarding-lengthChanged")).toHaveAttribute("data-complete", "true");
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("the Results warning opens the beam length input", async ({ page }) => {
    await freshModel(page);
    await page.getByTestId("mobile-result-chip").click();
    const action = page.getByTestId("mobile-first-experiment");
    await expect(action).toContainText("0.25 m");
    await action.click();
    await expect(page.getByTestId("sheet-inspector")).toBeVisible();
    await expect(page.getByTestId("field-L")).toBeFocused();
  });
});
