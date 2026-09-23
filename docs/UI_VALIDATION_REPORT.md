# UI Validation Report

Milestone 0 + 1 · 2026-09-22/23 · Space Structures Lab v0.1.0

## 1. Method

Every stage was run in a real browser and inspected from screenshots:

```
implement → run → screenshot → inspect → identify issue → fix → re-test
```

**Environment**

- Windows 11
- Vite 7 dev server
- Chromium via Playwright 1.63, with software WebGL (SwiftShader), so results do not depend on a GPU

**Evidence**

- `tests/visual/screenshots.spec.ts` captures every required state and
  asserts that there is no horizontal page overflow and no console error on
  each viewport.
- `tests/e2e/` drives the interactions.
- `tests/e2e/a11y.spec.ts` runs axe-core.

All screenshots were **opened and reviewed**, not just produced. The findings
below come from that review.

## 2. Viewports and screenshots

All screenshots are in [`docs/screenshots/`](screenshots/).

| Viewport | Size | Captures |
|---|---|---|
| Desktop | 1280 × 900 | 01 initial · 02 beam selected · 03 Learn · 04 analysis results · 05 sensitivity · 06 Why? |
| Large desktop | 1440 × 1000 | same six, plus 07 light theme (Analyze) |
| Laptop | 1024 × 768 | same six (tree panel folded by default) |
| Mobile | 390 × 844 | 01 initial · 02 viewport · 03 properties sheet · 04 results sheet · 05 Learn sheet · 06 tree sheet |

The required set, mapped to files:

- **Initial cantilever workspace:** `*-01-initial`, `*-02-beam-selected`
- **Beam selected:** `*-02-beam-selected`
- **Learn mode:** `*-03-learn`, `mobile-*-05-learn-sheet`
- **Analysis results:** `*-04-analysis-results`, `*-05-analysis-sensitivity`
- **Mobile viewport:** `mobile-390x844-02-viewport`

## 3. Numerical UI reference case

`tests/e2e/reference-case.spec.ts` first moves every input *away* from the
reference case. It then types the reference case into the real inspector
fields and checks the chain

**UI → store (SI) → solver → formatted display**

against hand-derived values. None of those values use the app's formulas.

| Input (typed) | Stored (SI) |
|---|---|
| L = `1.0` m | 1.0 m |
| b = `30` mm | 0.03 m |
| h = `5` mm | 0.005 m |
| E = `69` GPa | 6.9e10 Pa |
| ρ = `2700` kg/m³ | 2700 kg/m³ |
| F = `100` N | 100 N |

| Result | Hand calculation | Displayed | ✓ |
|---|---|---|---|
| A | 1.5e-4 m² | **150 mm²** | ✓ |
| Ixx | 3.125e-10 m⁴ | **312.5 mm⁴** | ✓ |
| Iyy | 1.125e-8 m⁴ | **11250 mm⁴** | ✓ |
| EI | 21.5625 N·m² | **21.56 N·m²** | ✓ |
| EA | 1.035e7 N | **10.35 MN** | ✓ |
| Tip displacement δ | 1.545894 m | **1546 mm** | ✓ |
| Max stress σ | 8.0e8 Pa | **800 MPa** | ✓ |
| Root moment | 100 N·m | **100 N·m** | ✓ |
| Mass | 0.405 kg | **0.405 kg** | ✓ |
| Tip stiffness k | 64.6875 N/m | **64.69 N/m** | ✓ |

The same test file also checks:

- **SI display:** δ = 1.546 m and σ = 8 × 10⁸ Pa, with the stored state
  identical before and after the switch.
- **Scaling laws through the UI:**

  | Edit | Expected | Displayed |
  |---|---|---|
  | L → 2 m | δ ×8 | 12367 mm, ratio chip **×8** |
  | h → 10 mm | δ ÷8, σ ÷4 | 193.2 mm (chip **÷8**), 200 MPa |
  | E → 138 GPa | δ ÷2, σ unchanged | 772.9 mm, 800 MPa |

## 4. Interaction flows tested

Automated in `tests/e2e/interactions.spec.ts` (21 end-to-end tests pass):

| Flow | Verified behaviour |
|---|---|
| Tree → viewport | Selecting Tip Force selects it in the tree, opens its inspector and highlights its viewport label |
| Viewport → tree | Clicking the beam (projected from its analytical position) and the support selects them in the tree and inspector |
| Clear selection | Clicking empty space clears it; Esc clears it; a click that ends an orbit drag does not |
| Hover sync | Hovering a tree row reports the entity in the status bar and highlights it in 3D |
| Orbit | Left drag moves the camera, keeps the target and keeps the distance |
| Pan | Right drag moves the target |
| Zoom | The wheel reduces the distance |
| Home | Restores the home pose to 1e-3 |
| Fit | Re-frames along the current direction |
| Projection | Perspective ↔ orthographic, by button and by `P` |
| Live edits | L, b, h, E, ρ, F change results immediately; ratio chips show the change factor |
| Validation | L = 0 → "Length must be greater than 0", `aria-invalid`, strip notice, last valid results kept; "abc" → "Enter a number."; Esc reverts |
| Keyboard stepping | ↑ on h gives 5.1; Shift+↓ gives 4.1 |
| Materials | CFRP preset shows the simplified-isotropic note; editing E turns it into "Custom (from CFRP …)" |
| Load plane | Lateral load switches to Iyy: δ ÷36 → 42.94 mm |
| Deformation scale | 1× "True scale"; 50× "Exaggerated ×50" with the label "drawn ×50"; Auto "Reduced ×0.129"; the true δ is always shown |
| Why? | Opens with drivers and what-ifs (+33.1 %, ×8), marks the onboarding step, closes on Esc |
| Learn | "Doubling this beam's length increases its tip deflection by 8×. (1546 mm → 12367 mm)"; the what-changed table after L → 0.3 m shows ÷37 |
| Assumptions | Default: small deformation and linear elastic violated. L = 0.3 m with F = 5 N: all within |
| Sensitivity | Chart exponent 3 (L), −3 (h), −2 (σ vs h) |
| Workspaces | Ribbon tools change while the single canvas persists; key `4` selects Learn |
| Panels | Tree collapses to 0 px and restores; the dock resizes by drag |
| Library | Planned items (TRAC, …) are listed as "Planned · M7" and not clickable; "Go to beam" works |
| Persistence | L = 0.7 m survives a reload |

Accessibility (`tests/e2e/a11y.spec.ts`): axe-core with WCAG 2.1 A/AA tags on
the empty state, model (dark and light), Analyze, Learn, Assumptions, the
Why? popover, the library dialog, and mobile with its sheet. **0 serious or
critical violations.**

## 5. Issues found and corrected

In discovery order. The "Found by" column records which check caught each one.

| # | Issue | Found by | Correction |
|---|---|---|---|
| 1 | **Initial camera framing wrong.** The deformed beam ran off-screen, and the camera was left at its placeholder pose. Manual Fit worked, which pointed to a timing problem. | Screenshot 02 | The rig acts only when the orbit controls drive the rendered camera (`controls.object === camera`). At start-up drei replaces R3F's default camera and the controls are rebuilt with target (0,0,0). The rig also re-fits on layout changes while the view is pristine. |
| 2 | 3 × React "synchronously unmount a root" console errors | Console capture | Replaced drei `<Html>` (a nested React root per label) with a DOM label layer projected in `useFrame` |
| 3 | **Symbols rendered as words** ("Tip displacement delta"). `meta.ts` held `"\delta"`, and `"\nu"` was newline + "u". A unit test passed **vacuously** because its expected string had the same corruption. | Screenshot, strip crop | Backslashes written through a shell heredoc had collapsed. Fixed the files, and added a guard test (no control characters; every symbol parses in KaTeX with `throwOnError`). |
| 4 | Toolbar brand truncated ("Space Structures…") | Screenshot | Removed the duplicate document name; brand block aligned to the tree panel |
| 5 | **Get-started card covered the beam root and support** | Screenshot | Card moved into the tree panel. When the tree is folded it overlays the viewport and the camera fit reserves a left inset for it. |
| 6 | Ribbon showed a wall of 5 disabled "planned" tools | Screenshot | Consolidated into one "N planned ▾" menu per group |
| 7 | Grid almost invisible | Close-up screenshot | Grid contrast raised |
| 8 | Legend title rendered **"Σ_ZZ"**: the uppercase style turned σ into Σ | Screenshot | Symbol rendered with KaTeX outside the caps style |
| 9 | Selection tint washed out the stress contour | Screenshot | No emissive tint while the contour is on; thin outline instead |
| 10 | Sensitivity side panel text clipped | Screenshot | Tightened spacing; dock default heights set per tab |
| 11 | Learn content cut off in a short dock | Screenshot | Per-tab dock heights (Learn 430 px), user-resizable |
| 12 | Why? driver rows wrapped ("+10% →" on two lines) | Screenshot | Table with column headers |
| 13 | **Laptop Learn squeezed the 3D view to ~240 px** | Screenshot, 1024 × 768 | Dock capped so the viewport keeps ≥ 320 px; guide auto-collapses in a short viewport |
| 14 | δ label clipped at the viewport edge (mobile) | Screenshot, 390 px | Labels clamp inside the viewport; right-aligned labels flip left near the edge |
| 15 | Mobile properties sheet had two headers and two ✕ | Screenshot | Single sheet header; entity name moved into the subtitle |
| 16 | Mobile sheet covered 78 % of the screen, so edits could not be watched | Screenshot | 62 vh sheet; result chip and model stay visible |
| 17 | With the dock open, the guide card covered the tree's Static Bending row | Screenshot, 1280 Analyze | Tree and guide share one scroll column |
| 18 | **Light theme: 3D viewport stayed dark** | Screenshot 07 | Race: the palette read CSS variables before an effect set `data-theme`. The theme is now applied inside the store action and on hydration. |
| 19 | Light theme force (3.77:1) and ok (4.36:1) text below WCAG AA | Contrast calculation | Tokens darkened to 5.0:1 and 5.5:1 |
| 20 | **Esc on an invalid field left a stuck error.** `blur()` fired `onBlur` synchronously with a stale `pendingError` closure. | E2E test failure | Pending error held in a ref |
| 21 | Re-focusing an invalid field replaced the typed text with the last valid value | Code review while fixing 20 | Invalid draft kept on re-focus |
| 22 | axe: primary button 2.7:1; dimmed chip text; `aria-label` on a role-less canvas div | axe scan | Dedicated `--primary` token (4.8:1); no reduced-opacity text; canvas is `role="img"` with a live description (length, δ, drawn scale) |
| 23 | Margin-of-safety note truncated in the unit column | Screenshot | Formula moved to a hint on the label |
| 24 | Unit-system select truncated | Screenshot | Shorter labels |
| 25 | CFRP note repeated "Simplified isotropic / educational" | Screenshot | Duplicate removed |
| 26 | **Engineering gap:** lateral–torsional buckling unaddressed. The lateral case bends a 30 × 5 mm strip about its strong axis. | Self-review while documenting | New live check "No lateral–torsional buckling": caution when I_gov / I_other ≥ 4 |
| 27 | Onboarding step 1 generic while the default model is invalid | Design critique | Hint is now computed: "δ/L is 155 % — far outside linear theory. Try L = 0.25 m: δ/L falls to 9.7 %." |
| 28 | No pointer cursor over pickable 3D objects | Design critique | Pointer cursor while a pickable object is hovered |
| 29 | Dock panel scrollable but not keyboard-focusable. This appeared once the new buckling row made the Assumptions content overflow. | axe scan (final full run) | `tabIndex={0}` on the tab panel (WAI-ARIA tabs pattern) |

**Test-harness defects found along the way** (not application bugs, but they
would have hidden or invented failures):

- `toBeInViewport` reports a collapsed zero-area panel as visible (ratio 1). The test asserts width instead.
- axe measured contrast mid-fade (180 ms entrance animations). Scans now wait for animations to settle. The real contrast findings were fixed first.
- A formatter test used 0.0012345, which is a binary tie that correctly rounds down.

## 6. Visual QA checklist (final state)

| Check | Result |
|---|---|
| No horizontal overflow | Asserted at all 4 viewports |
| No clipped controls / text overlap / panel collision | Reviewed. Fixed #4, #5, #10–17, #23, #24. |
| No unreadably small labels | Minimum 10 px (ribbon group captions), 10.5 px caps headers, 11–12 px body |
| No giant dead space | Tree panel's empty area now hosts the guide; empty viewport has a start card |
| No viewport occlusion | Guide moved out of the viewport (#5); HUD insets respected by Fit |
| Tree hierarchy readable | Groups with counts, 26 px rows, selection bar + tint |
| Inspector alignment | One 4-column grid (label, symbol, value, unit) for every row |
| Toolbar states obvious | Active workspace underline; pressed tools tinted; planned tools in menus |
| Selection obvious | Accent outline + tint in 3D, accent bar in tree, label ring for the load |
| Load arrow readable | Orange arrow + "F = 100 N" label |
| Support symbol readable | Wall plate with hatch whiskers; oversized hit volume |
| Result units visible | Every value has its unit; engineering/SI switch in the status bar |
| Camera framed correctly | Fixed (#1); re-frames on dock/panel changes while pristine |
| Contrast | Dark ≥ 5.3:1 for all text tokens; light ≥ 4.6:1; axe clean |

## 7. Design self-critique

Remaining weaknesses, by category. High-impact items found during this critique were fixed (#26–28). What follows is what remains.

- **Composition.** In Analyze and Learn the dock takes about 40 % of the height. At 1024 × 768 the viewport keeps only its 320 px floor. It is resizable, but a split view (dock beside the viewport on wide screens) would suit reading tasks better.
- **Visual hierarchy.** On first load the red "Outside assumptions" chip is the most saturated element. That is intended, because the brief's default is outside the model, but it draws the eye before the geometry does.
- **Density.** The beam inspector is long. At 900 px height the Derived block is below the fold. Collapsible sections help, but there is no pinned summary.
- **Readability.** The 10–10.5 px uppercase captions sit at the lower bound. They are only secondary labels.
- **3D viewport priority.** True proportions make a 5 mm section on a 1 m span a thin line at fit zoom. The stress contour needs a Frame or zoom to read well. A section-exaggeration option was deliberately not added, because it would misrepresent geometry.
- **CAD-like affordance.** Present: gizmo axes that click to a view, Fit/Home, projection, Frame from the tree, visibility toggles. Missing: a face-clickable view cube, standard named views, and a context menu.
- **Interaction clarity.** The dock is collapsed by default in Model/Physics, so first-time users may not find the Results/Learn tabs there. Onboarding step 4 opens it.
- **Engineering credibility.** Strong: SI storage, explicit units, live assumption checks, and true values beside exaggerated drawings. The weak spot is the brief's default beam (δ = 1.5 m), which can look like a bug until the status and hint are read.
- **Modernity.** Restrained tokens, KaTeX typography, and no decorative effects. Popovers can cover the result strip on short screens.
- **Learnability.** Guided steps are tied to real actions, and Why?, Learn and the what-changed table are all computed. There is no "predict, then check" exercise yet (M5).

## 8. Remaining limitations

- WebGL runs in software (SwiftShader) in the test environment, and GPU-specific artefacts were not tested. The canvas has an error boundary with a text fallback.
- Mobile was tested in emulation (Chromium, 390 × 844, touch enabled), not on a physical device.
- Screen-reader navigation was not tested manually. The ARIA structure (tree, tabs, radiogroups, labelled canvas) is automated-checked only.
- The initial JavaScript chunk is 225 kB gzip (KaTeX + React). The 3D stack (260 kB gzip) is lazy-loaded.
