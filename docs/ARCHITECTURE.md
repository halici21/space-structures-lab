# Architecture

## 1. Layers

```
┌──────────────────────────────────────────────────────────────────────┐
│ features/  (React)                                                   │
│   shell · tree · viewport · inspector · results · learn ·            │
│   sensitivity · library                                              │
│        │ read: useLab(selector), useSolved()      write: store actions│
├────────┼─────────────────────────────────────────────────────────────┤
│ state/store.ts  (Zustand + persist)                                  │
│   doc (physical model, SI) · selection · hover · workspace · view ·  │
│   units · reference (for "what changed") · onboarding                │
├────────┼─────────────────────────────────────────────────────────────┤
│ model/  document schema · factory · resolver · cached solve          │
│   LabDocument ──resolveStaticBending──▶ CantileverInput              │
├────────┼─────────────────────────────────────────────────────────────┤
│ lib/structures/  PURE TypeScript — no React, no state                │
│   section · materials · cantilever · validation · sensitivity ·      │
│   validity                                                           │
├──────────────────────────────────────────────────────────────────────┤
│ core/units.ts   SI ⇄ display conversion, formatting, parsing         │
└──────────────────────────────────────────────────────────────────────┘
```

Dependencies only point downwards. `lib/structures` imports nothing from the
UI. It is tested in Node, with no DOM.

## 2. Data flow for one edit

```
user types "2" into Length
  → NumberField: parseNumber → fromDisplay(unit) → validateParameter
      invalid → field error (debounced 650 ms), document untouched
      valid   → store.setParameter("L", 2.0 [m])
  → store: records the pre-edit input as `reference`, writes a NEW doc object
  → useSolved(): solveDocument(doc) — memoised per doc object (WeakMap)
      resolveStaticBending → validateInput → solveCantilever → assumptionChecks
  → components re-render from the new result
      result strip (with ×8 ratio chip vs. reference), inspector readouts,
      Learn "what changed", viewport geometry (useMemo on result)
  → R3F renders one frame (frameloop="demand")
```

The document is **immutable**: every edit produces a new `LabDocument`. That
single rule makes memoisation, "what changed" references and persistence
simple.

## 3. Document schema (future-proofing)

[`model/schema.ts`](../src/model/schema.ts):

- `LabDocument` holds five arrays: `geometry`, `materials`, `constraints`,
  `loads` and `analyses`.
- Each category is a **discriminated union** with one member in Milestone 1:
  - `BeamGeometry` — future tube, plate, membrane, cable, boom, assembly.
  - `IsotropicMaterialEntity`
  - `FixedSupport` — future pinned, spring, joint, damper.
  - `PointForce` — future distributed, moment, prestress, thermal.
  - `StaticBendingAnalysis` — future modal, FRF, buckling, nonlinear, deployment.
- Loads and constraints attach to a `MemberEnd` (`{geometryId, end}`), which
  generalises to nodes of an assembly.
- The `GEOMETRY_KINDS` / `ANALYSIS_KINDS` registries list planned kinds with
  their milestone. The UI renders them as unavailable. It never fakes them.

**Resolvers are the seam between document and solver.**
`resolveStaticBending(doc)` checks that the document describes a configuration
the closed-form solver supports: a beam, fixed at its start, loaded at its
end. It then produces the solver's plain input. An unsupported configuration
is reported as a reason, not solved. A future modal analysis adds
`resolveModal(doc)` next to it. The M8 FEM solver can accept a much wider
range of documents behind the same interface.

**Visibility is display-only.** Hiding the load does not remove it from the
analysis (tested). Suppression would be a separate, explicit flag.

## 4. Structural math

- [`cantilever.ts`](../src/lib/structures/cantilever.ts) holds every equation
  and the field functions v(z), v′(z), M(z) and σ(z, η).
- [`sensitivity.ts`](../src/lib/structures/sensitivity.ts) contains:
  - `elasticity` — the local log–log slope, measured on the solver.
  - `sweep` — log-spaced parameter sweeps.
  - `rankDrivers` — parameters ordered by |exponent|.
  - `attributeChange` — exact per-parameter decomposition of a change.

  Nothing here knows the formulas, so these functions keep working when the
  solver changes.
- [`validity.ts`](../src/lib/structures/validity.ts) holds the assumption
  checks and their documented thresholds.
- [`validation.ts`](../src/lib/structures/validation.ts) holds the input
  validation shared by fields and solver.

## 5. Units

[`core/units.ts`](../src/core/units.ts):

- A *dimension* (length, pressure, …) owns a table of units, each with its SI
  factor.
- A *quantity kind* (span, section dimension, displacement, stress,
  modulus, …) maps to a dimension, so roles that share a dimension can use
  different units. That is why the length is shown in m while the section is
  shown in mm.
- A *unit system* (Engineering, SI base) assigns one unit to each kind.

Conversion happens only at the display boundary. Switching systems never
touches the document; an end-to-end test compares the stored SI state before
and after a switch. Parsing accepts a decimal comma and exponents. Formatting
uses four significant figures and switches to "× 10ⁿ" outside [1e-3, 1e6).

## 6. Viewport

- **R3F with `frameloop="demand"`.** Frames render only when the camera moves
  or the scene changes. Code that mutates buffers outside React props (the
  contour colours) calls `invalidate()` explicitly.
- **Geometry is pure**
  ([`sceneMath.ts`](../src/features/viewport/sceneMath.ts)):
  - The swept beam mesh is built from the analytical deflected shape.
  - Scene bounds, label anchors, the colour map and grid sizing live here too.
  - Unit tests cover outward winding, the tip position and perpendicular sections.
- **Camera rig** ([`CameraRig.tsx`](../src/features/viewport/CameraRig.tsx)):
  - Fit projects the scene bounds onto the camera plane. That frames a long,
    thin beam far more tightly than a bounding-sphere fit.
  - The rig acts only when the orbit controls drive the active camera
    (`ready`). The controls are rebuilt at start-up and on every projection
    switch, and acting earlier was the cause of a framing bug.
  - While the user has not moved the camera since the last fit, layout changes
    re-fit automatically (pristine refit). Insets keep the model clear of the
    HUD and the guide card.
- **Labels** ([`Labels.tsx`](../src/features/viewport/Labels.tsx)) are plain
  DOM beside the canvas. A `useFrame` projector writes their transforms, and
  keeps them inside the viewport edges. There is no nested React root per
  label; drei `<Html>` caused console errors under React 19.
- **Picking.** R3F pointer events on the beam, the support and the arrow, with
  generous invisible hit volumes. Clicks that end an orbit drag (more than
  4 px of movement) do not change the selection.

## 7. State

`useLab` ([`state/store.ts`](../src/state/store.ts)) is a single Zustand
store. `persist` saves the document, units, theme, view, onboarding and
sensitivity settings to `localStorage`, behind a storage wrapper that
tolerates blocked storage. Selection, hover, camera commands and field errors
are session-only.

- **Theme.** The theme is applied to `<html>` inside the action itself, not
  in an effect, so the 3D palette reads the correct CSS variables in the same
  render.
- **"What changed".** A field records the model on focus (`beginEdit`) and
  promotes it to `reference` on its first real change. Ratio chips and the
  Learn decomposition compare against that reference.

## 8. Shell and responsiveness

| Width | Composition |
|---|---|
| ≥ 1180 px | Toolbar + ribbon; tree | viewport | inspector (resizable, collapsible); dock; status bar |
| 768 – 1179 px | Same, with the tree folded by default so the viewport keeps priority |
| < 768 px | Separate `MobileShell`: full-bleed viewport, compact workspace tabs, result chip, bottom navigation opening sheets for tree, properties, results and Learn |

Side panels use `react-resizable-panels` v4 with pixel sizes. The dock height
is remembered per tab and capped so the viewport keeps at least 320 px.

## 9. Testing

| Layer | Tool | What |
|---|---|---|
| Math, units, schema, geometry, explanations | Vitest (Node) | 131 tests — see STRUCTURAL_MODEL_ASSUMPTIONS §8 |
| Full UI chain, interactions | Playwright + Chromium (SwiftShader WebGL) | 21 tests in `tests/e2e/` |
| Accessibility | @axe-core/playwright | 5 scans, WCAG 2.1 A/AA, 0 serious or critical violations |
| Screenshots | Playwright | 25 captures at 4 viewports + light theme, with overflow and console-error assertions |

A dev-only hook (`window.__ssl`, compiled out of production builds; this is
verified) exposes world→screen projection, the camera pose and the store
state. End-to-end tests can therefore click a specific 3D object and assert
physical values in SI.

## 10. Extending

**A new section shape** (e.g. circular tube):
1. Add it to the `SectionShape` union and a case to `sectionProperties()`.
2. Give the inspector its fields.
3. Give `buildBeamMesh` its outline.

The solver, sensitivity, validity and Learn layers consume `SectionProperties`
and need no changes.

**A new analysis** (e.g. modal, M2):
1. Add a member to `AnalysisEntity`, a resolver and a pure solver in
   `lib/structures`.
2. Add a result view.
3. Flip its `ANALYSIS_KINDS` entry to available.

The sensitivity helpers work on any response the solver exposes.
