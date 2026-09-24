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

## 9. Follow-up audit — 2026-09-24

### Source-of-truth review

Read the complete `SPACE_STRUCTURES_INTERACTIVE_LAB_PRODUCT_SPEC.md` from the
sibling `Grad/` workspace before changing the app. The running product remains
within M0/M1: physics-first cantilever mechanics, one persistent viewport,
contextual model tree and inspector, live assumptions, Learn/Analyze views,
and clearly marked planned features. M2–M10 are roadmap items, not audit
failures.

### Ranked findings

| Severity | Surface | Finding | Status |
|---|---|---|---|
| P2 — moderate | First-run start card | The default example's values were shown without explaining that the resulting δ/L = 155% and σ = 800 MPa exceed the model's small-deflection and 6061-T6 yield limits. The red result after creation could look like a solver fault. | **Fixed:** Added a compact reference-case note with the comparison values and the guide's suggested 0.25 m edit. |
| P2 — moderate | Analyze / Learn dock | The bottom dock uses about 40% of the available height on larger screens. At 1024 × 768, the viewport stays at its 320 px floor while reading. The dock can be resized, and moving it beside the viewport would reduce viewport width and compete with the inspector. | Open design trade-off; no change made. |
| P3 — low | Inspector | Derived properties can sit below the fold at 900 px height. The inspector is scrollable and its groups are collapsible. | Known density limitation; no change made. |
| P3 — low | View framing / labels | The red assumptions chip leads the eye before the geometry, and secondary caps labels are 10–10.5 px. The warning is intentional; contrast checks remain clean. | Kept; start-card note now previews the warning. |

No P1/high-severity defect was found. Planned modal/FEM/deployment features and
the face-clickable view cube remain explicitly outside the implemented M0/M1
scope.

### Corrected first-run context

| Surface | Viewports | Before | After | Remaining limitation |
|---|---|---|---|---|
| Cantilever start card | 1280 × 900, 1024 × 768, 390 × 844 | Listed the 1 m, 30 × 5 mm, 6061-T6, 100 N reference input and described it as a working model, without previewing its invalid result. | Explains δ/L = 155%, σ = 800 MPa vs. 276 MPa yield, and points to the 0.25 m guided comparison. The call to action remains visible at all reviewed sizes. | The 1 m teaching example still starts outside assumptions by design; the post-create status remains red until the user edits it. |

### Verification

- Started the Vite app at `http://127.0.0.1:5180/` and inspected its rendered
  workspace. Visual review used fresh Playwright contexts so the user's browser
  storage was not touched.
- Regenerated and opened the initial-state captures at desktop (1280 × 900),
  laptop (1024 × 768), and mobile (390 × 844). The new note does not clip, wrap
  over the button, or cause horizontal overflow.
- Ran the existing screenshot checks at 1280 × 900, 1440 × 1000, 1024 × 768,
  and 390 × 844; accessibility checks covered the empty state, model, analysis,
  Learn, assumptions, popovers, library, and mobile sheet.
- All 21 interaction and UI-to-solver E2E tests passed, including camera,
  selection, live edits, assumptions, the reference case, and scaling laws.
- TypeScript check passed; all 131 unit tests passed; the production Vite build
  succeeded. The initial JavaScript bundle remains about 225 kB gzip.
- Manual screen-reader navigation and testing on a physical mobile device
  remain unverified; automated axe checks report no serious or critical issues.

## 10. Drawer-focused interface revision — 2026-09-24

### Ranked finding

| Severity | Surface | Finding | Status |
|---|---|---|---|
| P2 — moderate | Desktop shell | The model tree and long inspector competed with the 3D viewport as permanently visible side panels. Their icon-only toggles were also difficult to discover. | **Fixed:** Both are on-demand drawers. The inspector opens when a model is created; the tree opens from a labelled Model control. At laptop widths, only one drawer can be open at a time. All existing tools remain in their contextual ribbon, viewport controls, tree, inspector, and dock. |

### Interaction and motion

- The empty state now gives the start card the full viewport; neither side drawer reserves space.
- With a model loaded, Properties opens by default for immediate editing. Model remains one click away.
- At widths below 1180 px, opening one drawer closes the other to protect viewport width. Wider screens can show both.
- Desktop drawers ease their width and content in over the existing 180 ms motion token. Mobile sheets animate in and out, including the scrim fade. Both follow `prefers-reduced-motion`.
- The ribbon remains contextual so the existing editing and analysis actions stay directly discoverable; no capabilities were removed.

### Visual and automated verification

- Reviewed the empty screen, the model screen with Properties open, both drawers open on a wide screen, and the Model drawer on a 1024 px laptop. The model stays the visual focus and no page-level horizontal overflow appears.
- Screenshot coverage now asserts the default panel state and captures the opened Model drawer at desktop, wide, and laptop sizes: `*-07-model-drawer.png`.
- The targeted interaction, solver-reference, accessibility, and visual suites passed (31 tests); after adding drawer-state screenshot coverage, all 5 visual tests passed again.
- TypeScript check and all 131 unit tests passed. The production Vite build succeeded after the drawer revision (initial chunk: 225 kB gzip).

### Remaining design work

- The contextual ribbon and viewport HUD are still visible while their controls also appear in the workspace. This revision keeps those controls in place to avoid hiding functionality; a later pass can test progressive disclosure for less-used tools.
- The onboarding guide remains a small overlay on the viewport while the Model drawer is closed. It can still be collapsed or dismissed, and remains available inside the Model drawer.
- The live Vercel deployment was used as a reference. At the time of this
  drawer revision, the local changes had not yet been deployed.

## 11. Focused hierarchy revision — 2026-09-24

The user found the working screen too dense. This pass changes disclosure and
emphasis while preserving the specification's four workspaces, persistent 3D
viewport, full calculations, and live assumptions.

| Priority | Finding in the rendered interface | Change |
|---|---|---|
| P1 | The invalid default model still presented precise numerical results, while the small red status chip gave too little context. | A persistent notice above the result strip states the measured limit (`stress / strength`, `δ/L`), explains that out-of-assumption linear results are illustrative, and opens the detailed assumptions. The status bar also reflects the warning state. The same explanation appears in mobile Results. |
| P2 | Two tool rows plus the bottom results and side inspector competed with the viewport. | The contextual ribbon now opens from a labelled Tools control. Its 180 ms reveal follows the reduced-motion token. Model and Properties controls show their active state. |
| P2 | Six equal-weight result tiles made the primary response hard to find. | The closed strip shows displacement, maximum stress, and tip stiffness. “All results” opens the existing full table, including moment, mass, and `EI`. |
| P2 | The first-run guide covered part of the 3D scene and repeated other instructions. | The guide starts as a compact header, can expand or dismiss, and opens the inspector before focusing a requested input. |
| P3 | Inspector row labels truncated at the old 288 px minimum. | The minimum width is 336 px; the laptop layout continues to keep only one side drawer open at a time. |

The previously reported screenshot “numerical mismatch” was a reading error,
not a solver defect. At `L ≈ 337.8 m` and `F = 100 N`, the shown root moment
(`≈33,779 N·m`), maximum stress (`≈270,235 MPa`), and stress legend agree with
the same beam calculation. The outstanding trust issue was insufficiently
visible model-validity context, addressed above.

### Verification and remaining work

- Reviewed regenerated screenshots at 1280 × 900, 1440 × 1000, 1024 × 768,
  and 390 × 844 in dark and light themes. The warning, full Results sheet,
  inspector, viewport, and collapsed guide remain readable without page-level
  horizontal overflow or console errors. The captures in `docs/screenshots/`
  reflect this revision.
- The 21 existing interaction/reference-case flows passed after adapting to
  the on-demand controls. One additional flow checks invalid → caution → valid
  warning states. All five screenshot checks and five accessibility checks
  passed. TypeScript and the production Vite build passed.
- The 1 m reference beam still opens beyond the linear model's limits by
  design. The compact guide makes the first lesson less prominent; its
  discoverability needs observation with first-time users. The long inspector
  still requires scrolling, and the physical mobile-device review remains
  outstanding.

## 12. Typography and composition revision — 2026-09-24

This pass reviewed the first screen, selected beam, Learn and Analyze docks,
the Why? explanation, Inspector details, mobile sheets, and light theme against
the product specification's requirement for a dense but calm, viewport-first
engineering workspace.

| Priority | Observed issue | Revision |
|---|---|---|
| P2 | The 12 px base and frequent 10.5–11.5 px labels made the interface read smaller than its available space suggested. | UI stack now starts with the available Segoe UI Variable/Text fonts on Windows and system fonts elsewhere; base text is 13 px. Main labels and controls are roughly 12–13 px, primary result numbers 17 px, and the start title 18 px. Numeric alignment remains tabular. No external font request was introduced. |
| P2 | The Inspector presented editable inputs and calculated properties as one continuous column. | Geometry and Material remain open. Section Properties and Derived open from their headers; all values and units are retained. Inspector minimum width is 352 px, so labels no longer need forced ellipsis. |
| P2 | Learn used four equal columns even when the “What just changed” column contained only an instruction. | Stiffness, Deflection, and Stress form three readable columns on wide screens, two on laptop, one on mobile. The change explanation spans a separate row and moves above the concepts immediately after an edit. |
| P3 | The Why? popover reached the top edge and covered workspace navigation. | Explanation height is capped at 55 vh with internal scrolling. Its heading, driver table, and supporting text use a larger type scale. |
| P3 | Graph ticks and the mobile status/result labels were unnecessarily small. | Tick labels, mobile panel navigation, and live result readout were enlarged within their existing surfaces. |
| P2 | A rare first-run click could finish while the canvas was mounting and clear the beam selection, leaving the Inspector on Project instead of Beam. | Empty-viewport clicks now clear selection only when their pointer-down began inside the viewport. The first-run browser helper asserts that Beam 01 is selected. |

The dock strip and its tabs gained 8 px and 4 px respectively; the Inspector
gained 16 px. The 3D model remains the center of the default Model screen:
at 1024 × 768, its visible viewport is about 672 px wide and 600 px high with
the dock collapsed. The expanded Learn/Analyze docks still reduce viewport
height substantially on a laptop; dock resizing and collapse remain available.

The regenerated desktop and laptop screenshots include a new
`*-08-inspector-details.png` state with both calculated-property groups open
and the Inspector scrolled to their values. Reviewed dark and light themes at
1280 × 900, 1440 × 1000, 1024 × 768,
and mobile 390 × 844. No page-level horizontal overflow or console error was
observed in those captures.

The capped Why? explanation is keyboard-focusable, so its longer contents can
be scrolled without a pointer. The affected accessibility and material-edit
flows passed in three consecutive browser runs after this correction.

Final verification: all 32 Playwright tests passed (27 interaction/reference/
accessibility and 5 visual captures); TypeScript passed; all 131 unit tests
passed; the production Vite build succeeded. This is a browser review at the
listed sizes, not a physical-device or manual screen-reader study.

## 13. Laptop analysis workspace — 2026-09-24

At 1024 × 768, the expanded bottom Learn/Analyze dock left only about 355 px
of viewport height. The model and its deformation were cramped even though the
reading panel had more horizontal space than its content needed.

Analyze and Learn now open as a 389 px right workspace at laptop widths
(768–1180 px). The three primary results and the model-validity notice stay
in the bottom strip. The viewport retains roughly 600 px of height and 635 px
of width at 1024 × 768. Results, Sensitivity, Learn, and Assumptions share
the right workspace's tabs. Their existing content uses a single-column
layout there: graph with scaling notes below, equations stacked vertically,
and full assumption explanations under each live check.

The Model and Properties toolbar controls close the side workspace before
opening their drawers. “All results,” the result-strip expander, and the
contextual tools reopen it. Moving back to Model/Physics restores Properties.
The wide desktop and phone layouts keep their prior composition. The new
workspace entrance uses the existing 180 ms motion token and respects reduced
motion settings.

Reviewed regenerated 1024 × 768 screenshots for Learn, Results, Sensitivity,
Why?, and Inspector. The viewport remains central, result values and chart
labels are readable, and the page has no horizontal overflow or console
errors. A browser regression flow covers Learn → Model, Analyze → Properties,
and returning to Results. Physical-device and manual screen-reader review
remain outstanding.

Final verification: 33 Playwright flows, 131 unit tests, TypeScript, and the
production Vite build passed. One transient browser-test failure during an
earlier run came from the development-only viewport hook not being ready after
a page refresh; the point-click helper now waits for the hook. The complete
suite passed on the subsequent run.

## 14. First experiment and model validity — 2026-09-24

The product specification recommends a 1 m reference beam and a guided first
edit of beam length. That reference case produces δ/L ≈ 155% and stress above
yield. The warning explained the limits, but the collapsed guide showed only
“0/4,” leaving the next action hidden. On the phone, the warning in Results
offered assumptions but no route to the relevant input.

On the initial Model screen, the compact guide now shows a single experiment:
“Try L = 0.25 m.” It derives the suggested length from the live deflection
ratio, rounds it down inside the small-deflection threshold, and focuses the
beam's length field when chosen. The cue disappears after a length edit; the
guide's existing progress and full explanation remain available. Other
workspaces keep the smaller collapsed guide. In the phone Results sheet, the
same experiment opens Properties with Beam 01 selected and focuses Length.
Neither action silently changes the engineering model.

Reviewed the selected-beam view at desktop and laptop sizes and the phone
Results sheet. The cue stays clear of the beam and viewport tools. Dedicated
browser flows cover the desktop and phone paths. The 1 m starting case remains
deliberately outside the model assumptions; first-time comprehension still
needs observation with actual users.

Final verification: 35 Playwright flows, 131 unit tests, TypeScript, and the
production Vite build passed. The regenerated selected-beam and phone Results
screenshots document the revised first action.

## 15. On-demand bending preview — 2026-09-24

The static deformation previously changed instantly after an input edit. A
one-shot **Bend** control beside the deformation scale now previews the load
from 0 to 100% over 1.6 seconds. It can pause, resume, and replay. The beam,
load arrow, F and δ labels, deflection dimension, and stress contour move
together; the camera frames the final shape throughout. The contour legend
reports the applied fraction's stress range. The persistent document and the
result strip continue to show the full-load solved state.

The control describes this as a *static load ramp*. It does not represent a
mode shape, natural frequency, damping, or a time-domain structural response.
It starts only on request, stops at the solved shape, and is disabled when the
system prefers reduced motion or when there is no visible deformation. Model
validity warnings continue to apply to the displayed target solution.

Reviewed paused previews at 1024 × 768 in Model and Analyze and at 390 × 844
on a phone viewport. The narrow Analyze viewport wraps the deformation
control so it stays clear of the contour legend. Screenshots:
`laptop-1024x768-09-bend-preview.png`,
`laptop-1024x768-10-bend-analyze.png`, and
`mobile-390x844-07-bend-preview.png`. The regenerated baseline captures show
the control at rest in the existing workspaces.

Final verification: all 38 Playwright flows passed, including play/pause/
resume, reduced motion, mobile layout, and Analyze clearance. All 131 unit
tests, TypeScript, and the production Vite build passed. Physical-device and
manual screen-reader review remain outstanding.
