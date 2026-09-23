import { expect, test } from "@playwright/test";
import { camera, clickWorld, freshModel, openTree, setField, shown } from "./helpers";

const dist = (a: number[], b: number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

test.describe("selection synchronisation", () => {
  test("tree → viewport → inspector", async ({ page }) => {
    await freshModel(page);
    await openTree(page);
    await page.getByTestId("tree-item-load-tip-01").click();
    await expect(page.getByTestId("tree-item-load-tip-01")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("inspector").getByRole("heading", { name: "Tip Force" })).toBeVisible();
    // The viewport's force label is highlighted for the selected load.
    await expect(page.getByTestId("vp-label-force")).toHaveClass(/vp-label-selected/);
  });

  test("viewport click → tree + inspector; empty click and Esc clear", async ({ page }) => {
    await freshModel(page);
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-testid^="tree-item-"][data-selected]')).toHaveCount(0);

    // A point on the drawn (1×) beam, a quarter of the way along: v(0.25) = F z²(3L−z)/(6EI).
    const z = 0.25;
    const v = (100 * z * z * (3 - z)) / (6 * 21.5625);
    await clickWorld(page, [0, -v, z]);
    await expect(page.getByTestId("tree-item-geo-beam-01")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("inspector").getByRole("heading", { name: "Beam 01" })).toBeVisible();

    // The support plate sits just behind z = 0.
    await clickWorld(page, [0, 0.03, -0.003]);
    await expect(page.getByTestId("tree-item-con-fixed-01")).toHaveAttribute("aria-selected", "true");

    // Empty space clears the selection.
    const box = (await page.locator("canvas").boundingBox())!;
    await page.mouse.click(box.x + box.width - 40, box.y + box.height / 2);
    await expect(page.locator('[data-testid^="tree-item-"][data-selected]')).toHaveCount(0);

    // Escape also clears.
    await openTree(page);
    await page.getByTestId("tree-item-geo-beam-01").click();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("tree-item-geo-beam-01")).toHaveAttribute("aria-selected", "false");
  });

  test("hover in the tree highlights in the viewport status", async ({ page }) => {
    await freshModel(page);
    await openTree(page);
    await page.getByTestId("tree-item-con-fixed-01").hover();
    await expect(page.getByTestId("status-bar")).toContainText("Hover: Fixed Support");
  });
});

test.describe("camera", () => {
  test("orbit, pan and zoom move the camera; Home restores it; Fit frames", async ({ page }) => {
    await freshModel(page);
    const home = await camera(page);
    const box = (await page.locator("canvas").boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Orbit (left drag)
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 140, cy + 40, { steps: 10 });
    await page.mouse.up();
    const orbited = await camera(page);
    expect(dist(orbited.position, home.position)).toBeGreaterThan(0.05);
    // Orbiting keeps the target and the distance to it.
    expect(dist(orbited.target!, home.target!)).toBeLessThan(1e-6);

    // Pan (right drag) moves the target.
    await page.mouse.move(cx, cy);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(cx + 80, cy, { steps: 8 });
    await page.mouse.up({ button: "right" });
    const panned = await camera(page);
    expect(dist(panned.target!, orbited.target!)).toBeGreaterThan(1e-3);

    // Zoom (wheel) changes the distance to the target.
    const d0 = dist(panned.position, panned.target!);
    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, -600);
    await page.waitForTimeout(200);
    const zoomed = await camera(page);
    expect(dist(zoomed.position, zoomed.target!)).toBeLessThan(d0);

    // Home returns to the home pose.
    await page.getByTestId("vp-home").click();
    await page.waitForTimeout(200);
    const back = await camera(page);
    expect(dist(back.position, home.position)).toBeLessThan(1e-3);

    // Fit keeps the view direction and re-frames (animated).
    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, -900);
    await page.getByTestId("vp-fit").click();
    await page.waitForTimeout(500);
    const fitted = await camera(page);
    expect(dist(fitted.position, home.position)).toBeLessThan(1e-2);
  });

  test("perspective / orthographic toggle", async ({ page }) => {
    await freshModel(page);
    expect((await camera(page)).type).toBe("PerspectiveCamera");
    await page.getByTestId("vp-projection").click();
    await expect(page.getByTestId("vp-projection")).toContainText("Ortho");
    await page.waitForTimeout(200);
    expect((await camera(page)).type).toBe("OrthographicCamera");
    await page.keyboard.press("p");
    await page.waitForTimeout(200);
    expect((await camera(page)).type).toBe("PerspectiveCamera");
  });
});

test.describe("live editing", () => {
  test("invalid input is rejected with a contextual message and the model keeps its last valid state", async ({ page }) => {
    await freshModel(page);
    await setField(page, "field-L", "0");
    await expect(page.getByRole("alert")).toContainText("Length must be greater than 0");
    await expect(page.getByTestId("field-L")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByTestId("invalid-notice")).toBeVisible();
    await expect(shown(page, "tipDeflection")).toHaveText("1546");
    await expect(page.locator("canvas")).toBeVisible();

    await setField(page, "field-h", "abc");
    await expect(page.getByText("Enter a number.")).toBeVisible();

    // Escape reverts the draft and clears the error.
    await page.getByTestId("field-h").click();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("field-h")).toHaveValue("5");
    // Fix L; errors disappear.
    await setField(page, "field-L", "0.8");
    await expect(page.getByTestId("invalid-notice")).toHaveCount(0);
  });

  test("arrow keys step values", async ({ page }) => {
    await freshModel(page);
    const f = page.getByTestId("field-h");
    await f.click();
    await f.press("ArrowUp");
    await expect(f).toHaveValue("5.1");
    await f.press("Shift+ArrowDown");
    await expect(f).toHaveValue("4.1");
  });

  test("material preset and CFRP disclosure", async ({ page }) => {
    await freshModel(page);
    await page.getByTestId("material-preset").selectOption("cfrp-qi-simplified");
    await expect(page.getByTestId("field-E")).toHaveValue("50");
    await expect(page.getByTestId("cfrp-note")).toContainText("Simplified isotropic / educational");
    // Editing a value turns the material into a labelled custom one.
    await setField(page, "field-E", "60");
    await expect(page.getByTestId("material-preset")).toHaveValue("custom");
    await expect(page.getByTestId("tree-item-mat-01")).toContainText("Custom (from CFRP");
  });

  test("lateral load switches the governing second moment", async ({ page }) => {
    await freshModel(page);
    await openTree(page);
    await page.getByTestId("tree-item-load-tip-01").click();
    await page.getByTestId("load-plane").getByRole("radio", { name: /lateral/ }).click();
    // Iyy / Ixx = (b/h)² = 36 → δ ÷ 36: 1546 mm → 42.94 mm
    await expect(shown(page, "tipDeflection")).toHaveText("42.94");
  });
});

test.describe("deformation display", () => {
  test("scales are labelled as exaggerated or reduced, never implied true", async ({ page }) => {
    await freshModel(page);
    await expect(page.getByTestId("scale-badge")).toHaveText("True scale");
    await page.getByTestId("deform-scale").getByRole("radio", { name: "50×" }).click();
    await expect(page.getByTestId("scale-badge")).toContainText("Exaggerated ×50");
    await expect(page.getByTestId("vp-label-deflection")).toContainText("drawn ×50");
    // Auto draws the tip at 20 % of L: for δ = 1.546 m that is a reduction (×0.129).
    await page.getByTestId("deform-scale").getByRole("radio", { name: "Auto" }).click();
    await expect(page.getByTestId("scale-badge")).toContainText("Reduced ×0.129");
    // True value is always shown.
    await expect(page.getByTestId("scale-badge")).toContainText("true δ 1546 mm");
  });
});

test.describe("explanations", () => {
  test("Why? explains deflection drivers analytically", async ({ page }) => {
    await freshModel(page);
    await page.locator('[data-why="tipDeflection"]').click();
    const why = page.getByTestId("why-tipDeflection");
    await expect(why).toContainText("Why is the tip deflection this large?");
    await expect(why).toContainText("Length");
    await expect(why).toContainText("+33.1%");
    await expect(why).toContainText("×8");
    await page.getByRole("button", { name: "Expand guide" }).click();
    await expect(page.getByTestId("onboarding-whyOpened")).toHaveAttribute("data-complete", "true");
    await page.keyboard.press("Escape");
    await expect(why).toHaveCount(0);
  });

  test("Learn mode states the doubling law with this beam's numbers", async ({ page }) => {
    await freshModel(page);
    await page.getByTestId("ws-learn").click();
    await expect(page.getByTestId("learn-doubling")).toContainText(
      "Doubling this beam's length increases its tip deflection by 8×.",
    );
    await expect(page.getByTestId("learn-doubling")).toContainText("1546 mm → 12367 mm");
    // What-changed decomposition after an edit.
    await setField(page, "field-L", "0.3");
    await expect(page.getByTestId("change-explainer")).toContainText("÷37");
    await expect(page.getByTestId("learn-change")).toBeInViewport();
  });

  test("assumptions are disclosed and checked", async ({ page }) => {
    await freshModel(page);
    await page.getByTestId("status-chip").click();
    const panel = page.getByTestId("assumptions-panel");
    await expect(panel).toContainText("Euler–Bernoulli");
    await expect(page.getByTestId("assumption-small-deformation")).toHaveAttribute("data-status", "violated");
    await expect(page.getByTestId("assumption-linear-elastic")).toHaveAttribute("data-status", "violated");
    await expect(page.getByTestId("assumption-slender")).toHaveAttribute("data-status", "ok");
    // Shorten and unload the beam: every check passes.
    await setField(page, "field-L", "0.3");
    await openTree(page);
    await page.getByTestId("tree-item-load-tip-01").click();
    await setField(page, "field-F", "5");
    await expect(page.getByTestId("status-chip")).toHaveAttribute("data-status", "ok");
  });

  test("sensitivity plot follows the parameter and response", async ({ page }) => {
    await freshModel(page);
    await page.getByTestId("ws-analyze").click();
    await expect(page.getByTestId("sensitivity-chart").locator("svg")).toHaveAttribute("aria-label", /Exponent 3\./);
    await page.getByTestId("sens-param").getByRole("radio", { name: "h" }).click();
    await expect(page.getByTestId("sensitivity-chart").locator("svg")).toHaveAttribute("aria-label", /Exponent -3\./);
    await page.getByTestId("sens-response").selectOption("maxBendingStress");
    await expect(page.getByTestId("sensitivity-chart").locator("svg")).toHaveAttribute("aria-label", /Exponent -2\./);
  });
});

test.describe("shell", () => {
  test("focused first view keeps the validity context and reveals secondary controls on demand", async ({ page }) => {
    await freshModel(page);
    await expect(page.getByTestId("toggle-tools")).toHaveAttribute("aria-expanded", "false");
    const toolDrawer = page.locator(".workspace-tools-wrap");
    await expect(toolDrawer).toHaveAttribute("aria-hidden", "true");
    await expect.poll(async () => (await toolDrawer.boundingBox())!.height).toBeLessThan(1);
    await expect(page.getByRole("button", { name: "Expand guide" })).toBeVisible();
    await expect(page.getByTestId("validity-notice")).toHaveAttribute("data-status", "violated");
    await expect(page.getByTestId("validity-notice")).toContainText("δ/L = 155%");
    await expect(page.getByTestId("all-results")).toBeVisible();

    await setField(page, "field-L", "0.25");
    await expect(page.getByTestId("validity-notice")).toHaveAttribute("data-status", "caution");
    await openTree(page);
    await page.getByTestId("tree-item-load-tip-01").click();
    await setField(page, "field-F", "5");
    await expect(page.getByTestId("validity-notice")).toHaveCount(0);
    await expect(page.getByTestId("status-chip")).toHaveAttribute("data-status", "ok");
  });

  test("workspaces switch the ribbon and dock over the same viewport", async ({ page }) => {
    await freshModel(page);
    await page.getByTestId("toggle-tools").click();
    const canvas = page.locator("canvas");
    for (const [ws, tool] of [
      ["physics", "tool-support"],
      ["analyze", "tool-static"],
      ["model", "tool-beam"],
    ] as const) {
      await page.getByTestId(`ws-${ws}`).click();
      await expect(page.getByTestId(tool)).toBeVisible();
      await expect(canvas).toHaveCount(1);
    }
    await page.keyboard.press("4");
    await expect(page.getByTestId("ws-learn")).toHaveAttribute("aria-selected", "true");
  });

  test("panels collapse and the dock resizes", async ({ page }) => {
    await freshModel(page);
    // A collapsed panel has zero width (toBeInViewport cannot tell: zero-area
    // elements report an intersection ratio of 1).
    const treeWidth = async () => (await page.locator("#tree").boundingBox())!.width;
    const inspectorWidth = async () => (await page.locator("#inspector").boundingBox())!.width;
    await expect.poll(treeWidth).toBeLessThan(1);
    expect(await inspectorWidth()).toBeGreaterThan(280);
    await page.getByTestId("toggle-tree").click();
    await expect.poll(treeWidth).toBeGreaterThan(200);
    await expect(page.getByTestId("toggle-tree")).toHaveAttribute("aria-expanded", "true");
    await page.getByTestId("toggle-tree").click();
    await expect.poll(treeWidth).toBeLessThan(1);
    await page.getByTestId("toggle-inspector").click();
    await expect.poll(inspectorWidth).toBeLessThan(1);
    await expect(page.getByTestId("toggle-inspector")).toHaveAttribute("aria-expanded", "false");
    await page.getByTestId("toggle-inspector").click();
    await expect.poll(inspectorWidth).toBeGreaterThan(280);

    await page.getByTestId("dock-toggle").click();
    const dock = page.getByTestId("dock");
    const h0 = (await dock.boundingBox())!.height;
    const handle = (await page.getByTestId("dock-resize").boundingBox())!;
    await page.mouse.move(handle.x + 200, handle.y + 3);
    await page.mouse.down();
    await page.mouse.move(handle.x + 200, handle.y - 60, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(250);
    expect((await dock.boundingBox())!.height).toBeGreaterThan(h0 + 40);
  });

  test("library shows planned structures as unavailable", async ({ page }) => {
    await freshModel(page);
    await page.getByTestId("open-library").click();
    const lib = page.getByTestId("library");
    await expect(lib).toContainText("TRAC boom");
    await expect(lib).toContainText("Planned · M7");
    await expect(lib.getByRole("button", { name: /TRAC/ })).toHaveCount(0);
    await lib.getByTestId("library-open-beam").click();
    await expect(lib).toHaveCount(0);
  });

  test("model persists across reload", async ({ page }) => {
    await freshModel(page);
    await setField(page, "field-L", "0.7");
    await page.reload();
    await openTree(page);
    await expect(page.getByTestId("tree-item-geo-beam-01")).toBeVisible();
    await page.getByTestId("tree-item-geo-beam-01").click();
    await expect(page.getByTestId("field-L")).toHaveValue("0.7");
  });
});
