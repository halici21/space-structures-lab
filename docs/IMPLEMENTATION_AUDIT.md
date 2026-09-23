# Implementation Audit

Date: 2026-09-22 · Scope: Milestone 0 (CAD-like shell) + Milestone 1 (cantilever beam playground)

## 1. What existed before this work

The application is a **new project**, created in a new folder
(`Documents/Python/space-structures-lab`) as requested — deliberately *not*
inside the `Grad/` research workspace, which holds the Lunar OD worktrees and
their own policies.

So there was no application to preserve. The audit therefore looked at the
sibling projects in `Documents/Python/` for reusable architecture, design
language and lessons:

| Project | State | Relevance |
|---|---|---|
| `modal-dynamics-lab` | Specification only; `src/` holds one stub file | Spec discipline only; no code |
| `modal-dynamics-lab-desktop` | Mature Vite + React 19 + Three.js + Tauri CAD studio for SDOF/MDOF modal dynamics | **High.** Same product family, same interaction model |
| `rocket` (RocketForge) | PyQt/QML propulsion tool | Low: different stack. Its lesson — audit from real screenshots, prove harnesses before trusting them — is reused as process |
| `Grad/deployable_space_structures` | Literature atlas (Markdown taxonomy, flight heritage, maturity map) | Content source for the future Space Structures Library; not code |

### `modal-dynamics-lab-desktop` in detail

- **Stack:** Vite 7, React 19, TypeScript 5.9 strict, Three.js 0.180 (imperative,
  lazily imported), `react-resizable-panels` v4, KaTeX, Vitest, Playwright + axe.
- **Architecture:** `physics/` (pure TS) → `studio/model.ts` (document model) →
  `studio/*` shell components → `viewport/scene.ts` (imperative Three scene).
  A single `SimulationClock` owns the only `requestAnimationFrame`.
- **Design language:** a restrained dark/light token set (`app/tokens.css`):
  Segoe UI Variable, 11–13 px UI text, 4-px spacing scale, 3–6 px radii, one
  accent, semantic colours for displacement/force/energy. It already
  matches the brief here: dense, calm, few decorative effects.
- **Testing:** Vitest for physics, Playwright for interaction/visual.

## 2. What is reused, and how

Nothing is imported from a sibling project, because coupling two products'
source trees would be worse than a small amount of repetition. Reuse is by
**adopting proven decisions**:

| Reused decision | Source | Why |
|---|---|---|
| Token-based dark/light palette, 11–13 px UI type scale, 4-px grid | `tokens.css` | Already tuned for dense engineering UI, with checked contrast in both themes |
| Physics as a pure TS layer, no React imports | `physics/` | Testable, no formulas inside components |
| Document model separate from view state | `studio/model.ts` | Selection, workspace and camera are not physical state |
| `react-resizable-panels` v4 with pixel sizes | studio shell | Supports pixel-preserving side panels, which a CAD layout needs |
| KaTeX for equations | Learn panels | Equation typography matters for credibility |
| Vitest + Playwright split | test setup | Math and UI chain tested separately |

## 3. Stack decision

The brief recommends Next.js + React + TypeScript + R3F + Drei + Tailwind +
Radix + Zustand, and says to *prefer the existing stack if appropriate* and not
to add large dependencies without clear benefit.

| Layer | Choice | Deviation? |
|---|---|---|
| Build / framework | **Vite 7 + React 19** (SPA) | **Yes — Vite instead of Next.js.** Milestone 1 is a pure client-side WebGL tool: no server, no routing, no SSR, no API. Next.js would add SSR hydration guards around every R3F component (`ssr:false`) and a larger toolchain for no user-visible benefit. Vite is also the proven stack of the sibling CAD studio. Migrating later is cheap because nothing depends on Vite APIs outside the config file. |
| 3D | three 0.180, **@react-three/fiber 9**, **@react-three/drei 10** | No |
| State | **Zustand 5** (+ `persist`) | No |
| Styling | **Tailwind CSS 4** mapped onto CSS custom-property tokens | No |
| Primitives | **Radix** Popover, Dialog, Tooltip (individual packages, not all of shadcn) | Partial: shadcn is a copy-in style layer. Only the three accessible primitives actually needed are installed. |
| Motion | **CSS transitions only** | Yes — Framer Motion not installed. The motion brief (restrained, no overshoot, state-reinforcing) is fully served by 120–200 ms CSS transitions. |
| Charts | **Custom ~200-line SVG line chart** | Yes — no chart library. The sensitivity view is one line series with a marker; a hand-built SVG gives exact control of log axes, tick formatting and theming at zero bundle cost. |
| Math typesetting | **KaTeX** | Added (not in the brief). Learn mode's equations are a core differentiator; fonts ship in the package, so it works offline. |
| Tests | **Vitest 3** (math), **Playwright 1.63** (UI chain + screenshots) | No |

## 4. Target architecture (summary)

```
src/
  core/units.ts            unit registry, SI↔display conversion, formatting, parsing
  lib/structures/          PURE structural math — no React, no state
    section.ts             section properties (rectangular now; union ready for tubes/booms)
    materials.ts           educational presets
    cantilever.ts          Euler–Bernoulli cantilever solver + deflection field + stress field
    sensitivity.ts         log–log elasticities, parameter sweeps, change attribution
    validity.ts            live checks of the model's own assumptions
    validation.ts          input validation (L, b, h, E, ρ > 0; −1 < ν < 0.5; F ≥ 0)
  model/                   future-proof document schema + resolver (document → solver input)
  state/                   Zustand store (document, selection, workspace, view, units)
  features/                shell, tree, viewport, inspector, results, learn, sensitivity, library
  components/              reusable field / panel / equation / chart primitives
```

Full detail: [ARCHITECTURE.md](ARCHITECTURE.md).

## 5. What will change vs. the reference project

- **Declarative R3F instead of an imperative scene.** The reference studio needed
  one animation clock for playback; Milestone 1 is static, so R3F with
  `frameloop="demand"` renders only on camera motion or model change.
- **Section axes follow the aerospace (Megson) convention.** Beam axis = *z*,
  section axes *x* (horizontal, along *b*) and *y* (vertical, along *h*). This
  matches the brief's `Ixx = b h³/12` label *and* stays consistent with the 3D
  world axes (three.js is Y-up). See STRUCTURAL_MODEL_ASSUMPTIONS.md.

## 6. Known risks

| Risk | Mitigation |
|---|---|
| **The brief's suggested default case is far outside Euler–Bernoulli validity.** L = 1 m, b = 30 mm, h = 5 mm, E = 69 GPa, F = 100 N gives δ = 1.546 m (δ/L = 155 %) and σ = 800 MPa (2.9× the yield of 6061-T6). | Use the specified defaults exactly (it is also the specified UI reference case), but **compute and show the violated assumptions live**. The onboarding's first step ("change beam length") brings the model back towards validity. Flagged as a recommendation in the report. |
| Section-axis naming conventions differ between textbooks, handbooks and Eurocode | One documented convention, a labelled section sketch in the inspector, axis names in every I label |
| R3F `frameloop="demand"` can miss redraws | Explicit `invalidate()` on every model or view change; screenshots check framing |
| WebGL unavailable in some test environments | Playwright uses Chromium with SwiftShader; the canvas has an error boundary so the UI never goes blank |
| Live typing producing invalid intermediate values (`0.`, `-`, empty) | Field keeps a draft string; only values that pass `validation.ts` reach the document |
| Mobile: a CAD layout does not fit on 390 px | Separate mobile composition: full-bleed viewport, bottom sheets for tree, inspector and results |

## 7. Implementation plan

1. Structural math layer + unit tests (mandatory scaling tests first).
2. Units, document schema, resolver, store.
3. Shell: toolbar, workspace ribbon, resizable panels, status bar.
4. Model tree with viewport ↔ tree selection sync.
5. Viewport: swept deformed solid, undeformed ghost, support, load arrow,
   dimensions, stress contour, grid, gizmo, fit/reset, perspective/ortho.
6. Inspector with reusable fields and live validation.
7. Results dock, Why? popovers, Learn, Assumptions, Sensitivity.
8. Empty state + onboarding, Space Structures Library (disabled entries).
9. Mobile composition.
10. Playwright: reference case through the real UI, interaction checks,
    screenshots at 1280×900, 1440×1000, 1024×768 and 390×844.
11. Review screenshots → fix → retest; write the validation report.

## 8. Outcome (after implementation)

| Planned risk | What happened |
|---|---|
| Default case outside validity | Confirmed: δ/L = 155 %, σ = 2.9 × yield. Kept as specified, flagged live, and turned into onboarding step 1 with a computed fix (L = 0.25 m). |
| `frameloop="demand"` missing redraws | Occurred once (contour colour buffer). Fixed with an explicit `invalidate()`. A related camera/controls start-up race was the larger framing bug (UI report #1). |
| WebGL in test environments | Chromium + SwiftShader renders identically. The error boundary with a text fallback stays in place. |
| Invalid intermediate input | Draft-string design held. One real bug (stale closure on Esc) was caught by an end-to-end test and fixed. |
| Mobile layout | Separate composition built; tested at 390 × 844 with sheets. |

**Not anticipated:**

- drei `<Html>` produced React 19 console errors. It was replaced with a DOM label layer.
- Backslashes collapsed when files were written through a shell heredoc. TeX symbols silently became words, and a test passed vacuously. A guard test now catches this.
- The light-theme 3D palette read CSS variables before the theme attribute changed.

All three are logged in [UI_VALIDATION_REPORT.md](UI_VALIDATION_REPORT.md) §5.

