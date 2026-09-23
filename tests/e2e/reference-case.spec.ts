/**
 * Full-chain numerical check: values typed into the real UI → store (SI) →
 * solver → formatted display. Expected numbers are hand-derived here and do
 * not use the application's own formulas.
 *
 *   A   = 0.03 × 0.005                   = 1.5e-4 m²      → 150 mm²
 *   Ixx = 0.03 × 0.005³ / 12             = 3.125e-10 m⁴   → 312.5 mm⁴
 *   Iyy = 0.005 × 0.03³ / 12             = 1.125e-8 m⁴    → 11250 mm⁴
 *   EI  = 69e9 × 3.125e-10               = 21.5625 N·m²   → 21.56
 *   δ   = 100 × 1³ / (3 × 21.5625)       = 1.54589 m      → 1546 mm
 *   M   = 100 × 1                        = 100 N·m
 *   σ   = 100 × 0.0025 / 3.125e-10       = 8.0e8 Pa       → 800 MPa
 *   m   = 2700 × 1.5e-4 × 1              = 0.405 kg
 *   k   = 3 × 21.5625 / 1³               = 64.6875 N/m    → 64.69
 *   EA  = 69e9 × 1.5e-4                  = 1.035e7 N      → 10.35 MN
 */
import { expect, test } from "@playwright/test";
import { freshModel, openTree, physical, setField, shown, unit } from "./helpers";

test("reference case typed through the UI reproduces the hand calculation", async ({ page }) => {
  await freshModel(page);

  // Move every input away from the reference first, so the test proves the UI path.
  await setField(page, "field-L", "0.5");
  await setField(page, "field-b", "20");
  await setField(page, "field-h", "8");
  await setField(page, "field-E", "200");
  await setField(page, "field-rho", "8000");
  await expect(shown(page, "tipDeflection")).not.toHaveText("1546");

  // Now enter the reference case.
  await setField(page, "field-L", "1.0");
  await setField(page, "field-b", "30");
  await setField(page, "field-h", "5");
  await setField(page, "field-E", "69");
  await setField(page, "field-rho", "2700");
  await openTree(page);
  await page.getByTestId("tree-item-load-tip-01").click();
  await setField(page, "field-F", "100");

  // Store holds SI values.
  const p = await physical(page);
  expect(p.L).toBeCloseTo(1.0, 12);
  expect(p.b).toBeCloseTo(0.03, 12);
  expect(p.h).toBeCloseTo(0.005, 12);
  expect(p.E).toBeCloseTo(69e9, 0);
  expect(p.rho).toBeCloseTo(2700, 9);
  expect(p.F).toBeCloseTo(100, 9);

  // Displayed results and units.
  await expect(shown(page, "tipDeflection")).toHaveText("1546");
  await expect(unit(page, "tipDeflection")).toHaveText("mm");
  await expect(shown(page, "maxBendingStress")).toHaveText("800");
  await expect(unit(page, "maxBendingStress")).toHaveText("MPa");
  await expect(shown(page, "tipStiffness")).toHaveText("64.69");

  // Secondary values remain available in the on-demand results table.
  await page.getByTestId("all-results").click();
  const details = page.getByTestId("result-details");
  for (const [label, value, displayUnit] of [
    ["Root moment", "100", "N·m"],
    ["Mass", "0.405", "kg"],
    ["Flexural stiffness", "21.56", "N·m²"],
  ] as const) {
    const row = details.getByText(label, { exact: true }).locator("..");
    await expect(row.locator("dd")).toHaveText(value);
    await expect(row.locator("span").filter({ hasText: displayUnit }).first()).toBeVisible();
  }

  // Section properties and derived values in the inspector.
  await openTree(page);
  await page.getByTestId("tree-item-geo-beam-01").click();
  await page.getByRole("button", { name: "Section properties" }).click();
  await page.getByRole("button", { name: "Derived" }).click();
  await expect(page.getByTestId("out-A")).toHaveText("150");
  await expect(page.getByTestId("out-Ixx")).toHaveText("312.5");
  await expect(page.getByTestId("out-Iyy")).toHaveText("11250");
  await expect(page.getByTestId("out-EA")).toHaveText("10.35");
  await expect(page.getByTestId("out-mass")).toHaveText("0.405");
});

test("switching display units never changes the physical state", async ({ page }) => {
  await freshModel(page);
  const before = await physical(page);

  await page.getByTestId("status-units").selectOption("si");
  await expect(shown(page, "tipDeflection")).toHaveText("1.546");
  await expect(unit(page, "tipDeflection")).toHaveText("m");
  await expect(shown(page, "maxBendingStress")).toHaveText("8 × 10⁸");
  await expect(unit(page, "maxBendingStress")).toHaveText("Pa");
  await expect(page.getByTestId("field-b")).toHaveValue("0.03");
  expect(await physical(page)).toEqual(before);

  // Editing in SI units stores SI directly.
  await setField(page, "field-b", "0.06");
  expect((await physical(page)).b).toBeCloseTo(0.06, 12);

  await page.getByTestId("status-units").selectOption("engineering");
  await expect(page.getByTestId("field-b")).toHaveValue("60");
});

test("mandatory scaling laws hold through the UI", async ({ page }) => {
  await freshModel(page);

  // L × 2 → δ × 8 (1546 mm → 12367 mm), shown as a ratio chip.
  await setField(page, "field-L", "2");
  await expect(shown(page, "tipDeflection")).toHaveText("12367");
  await expect(page.getByTestId("result-tipDeflection").getByTestId("ratio-chip")).toHaveText("×8");
  await setField(page, "field-L", "1");

  // h × 2 → δ ÷ 8 (1546 → 193.2 mm) and σ ÷ 4 (800 → 200 MPa).
  await setField(page, "field-h", "10");
  await expect(shown(page, "tipDeflection")).toHaveText("193.2");
  await expect(shown(page, "maxBendingStress")).toHaveText("200");
  await expect(page.getByTestId("result-tipDeflection").getByTestId("ratio-chip")).toHaveText("÷8");
  await setField(page, "field-h", "5");

  // E × 2 → δ ÷ 2 (1546 → 772.9 mm); stress unchanged.
  await setField(page, "field-E", "138");
  await expect(shown(page, "tipDeflection")).toHaveText("772.9");
  await expect(shown(page, "maxBendingStress")).toHaveText("800");
});
