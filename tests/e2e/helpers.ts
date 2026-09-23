import { expect, type Page } from "@playwright/test";

/** Loads the app with empty storage and creates the cantilever example. */
export async function freshModel(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId("create-cantilever").click();
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForFunction(() => !!window.__ssl);
  await expect.poll(() => page.evaluate(() => window.__ssl!.state().selection)).toBe("geo-beam-01");
  // Let the camera settle its first fit.
  await page.waitForTimeout(400);
}

/** Opens the on-demand model drawer in desktop layouts. */
export async function openTree(page: Page) {
  const toggle = page.getByTestId("toggle-tree");
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("tree-item-geo-beam-01")).toBeVisible();
}

/** Types a value into an inspector field and commits it with Enter. */
export async function setField(page: Page, testId: string, text: string) {
  const f = page.getByTestId(testId);
  await f.click();
  await f.fill(text);
  await f.press("Enter");
}

export const shown = (page: Page, key: string) => page.getByTestId(`value-${key}`);
export const unit = (page: Page, key: string) => page.getByTestId(`unit-${key}`);

/** Clicks the viewport at the screen position of a world point. */
export async function clickWorld(page: Page, p: [number, number, number]) {
  await page.waitForFunction(() => typeof window.__ssl?.project === "function");
  const [x, y] = await page.evaluate((pt) => window.__ssl!.project(pt), p);
  const box = (await page.locator("canvas").boundingBox())!;
  await page.mouse.click(box.x + x, box.y + y);
}

/** Physical (SI) state straight from the store. */
export async function physical(page: Page) {
  return page.evaluate(() => {
    const d = window.__ssl!.state().doc!;
    return {
      L: d.geometry[0]!.length,
      b: d.geometry[0]!.section.b,
      h: d.geometry[0]!.section.h,
      E: d.materials[0]!.E,
      rho: d.materials[0]!.rho,
      F: d.loads[0]!.magnitude,
    };
  });
}

export async function camera(page: Page) {
  return page.evaluate(() => window.__ssl!.camera());
}
