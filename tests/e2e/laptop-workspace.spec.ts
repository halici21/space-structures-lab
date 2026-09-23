import { expect, test } from "@playwright/test";
import { freshModel } from "./helpers";

test.use({ viewport: { width: 1024, height: 768 } });

test("Analyze and Learn use a side workspace while the model keeps its inspector", async ({ page }) => {
  await freshModel(page);
  await page.getByTestId("ws-learn").click();
  await expect(page.getByTestId("side-dock")).toBeVisible();
  await expect.poll(async () => (await page.getByRole("main", { name: "Viewport" }).boundingBox())!.height).toBeGreaterThan(500);
  await page.getByTestId("ws-model").click();
  await expect(page.getByTestId("side-dock")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Section properties" })).toBeVisible();

  await page.getByTestId("ws-analyze").click();
  await expect(page.getByTestId("side-dock")).toBeVisible();
  await page.getByTestId("toggle-inspector").click();
  await expect(page.getByTestId("side-dock")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Section properties" })).toBeVisible();
  await page.getByTestId("all-results").click();
  await expect(page.getByTestId("side-dock")).toBeVisible();
  await expect(page.getByTestId("result-details")).toBeVisible();
});
