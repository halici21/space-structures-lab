# Structural Model and Assumptions

Milestone 1 implements one model: a **rectangular Euler–Bernoulli cantilever
with a static tip point load**. This document states exactly what is computed,
under which assumptions, and how the application checks those assumptions
against the current model.

All equations live in one file, [`src/lib/structures/cantilever.ts`](../src/lib/structures/cantilever.ts)
(section properties in [`section.ts`](../src/lib/structures/section.ts)). No
component re-derives a formula.

## 1. Coordinates and section axes

The app follows the aerospace convention used by Megson, *Aircraft Structures
for Engineering Students*:

| Axis | Direction | Beam quantity |
|---|---|---|
| **z** | along the beam, root at z = 0, tip at z = L | member axis |
| **x** | horizontal, across the width *b* | section axis x–x |
| **y** | vertical (up), across the height *h* | section axis y–y |

This makes the brief's labels literal and keeps them consistent with the 3D
world axes, since the viewport is Y-up:

- **Ixx = b h³ / 12** — about the horizontal x–x axis; governs a **vertical** (−y) load.
- **Iyy = h b³ / 12** — about the vertical y–y axis; governs a **lateral** (−x) load.

The inspector shows a labelled section sketch that highlights the governing
axis, and a "governs" badge marks the active I.

> Other conventions exist (Eurocode uses x as the member axis, with I_y as the
> strong axis). The deflection formula is written v(z) rather than v(x),
> because x is a section axis here.

**Signs.** Deflections and stresses are reported as magnitudes in the load
direction. In the stress field, positive values are tension. For a downward
load the top fibre is in tension.

## 2. Equations implemented

| Quantity | Formula | Function / field |
|---|---|---|
| Area | A = b h | `sectionProperties().area` |
| Second moments | Ixx = b h³/12, Iyy = h b³/12 | `sectionProperties()` |
| Governing I, c | vertical load: I = Ixx, c = h/2; lateral load: I = Iyy, c = b/2 | `governingBending()` |
| Axial stiffness | EA | `result.EA` |
| Flexural stiffness | EI | `result.EI` |
| Mass | m = ρ A L | `result.mass` |
| Tip stiffness | k = 3EI / L³ | `result.tipStiffness` |
| Tip deflection | δ = F L³ / (3EI) | `result.tipDeflection` |
| Tip rotation | θ = F L² / (2EI) | `result.tipRotation` |
| Root moment | M_max = F L | `result.rootMoment` |
| Root shear | V = F | `result.rootShear` |
| Max bending stress | σ_max = M_max c / I (= 6FL / bh² for a vertical load) | `result.maxBendingStress` |
| Deflected shape | v(z) = F z² (3L − z) / (6EI) | `deflectionAt()` |
| Slope | v′(z) = F z (2L − z) / (2EI) | `slopeAt()` |
| Moment field | M(z) = F (L − z) | `bendingMomentAt()` |
| Stress field | σ_zz(z, η) = M(z) η / I | `bendingStressAt()` |

**Deformed shape in the viewport.** The 3D solid is swept along the
analytical v(z) at 72 stations. Each cross-section is rotated by
φ = atan(s·v′(z)) so it stays normal to the drawn axis (plane sections stay
plane), where *s* is the display scale. The shape is **not** a rotated
straight beam. Unit tests check that the drawn centroid equals −s·v(z) and
that every section is perpendicular to the drawn tangent.

**Sensitivities are measured, not tabulated.** The exponent in "δ ∝ L³" is the
log–log elasticity ∂ln R / ∂ln p, measured by a central difference on the
solver itself ([`sensitivity.ts`](../src/lib/structures/sensitivity.ts)). For
these power laws it is exact to rounding (L → 3.000000). For future
non-power-law models it becomes the correct local sensitivity.

## 3. Assumptions and live checks

The assumptions panel (Analyze → Assumptions, or the status chip) evaluates
each assumption against the current model. The thresholds are in
[`validity.ts`](../src/lib/structures/validity.ts).

| Assumption | Checked quantity | OK | Caution | Violated |
|---|---|---|---|---|
| Slender beam | L / depth | ≥ 10 | 5 – 10 | < 5 |
| Linear elastic material | σ_max / σ_ref | < 2/3 | 2/3 – 1 | ≥ 1 |
| Small deformation | δ / L | ≤ 10 % | 10 – 20 % | > 20 % |
| Plane sections remain plane | kinematic hypothesis | shown as info | | |
| Shear deformation neglected | δ_shear / δ_bend | ≤ 2 % | 2 – 10 % | > 10 % |
| Isotropic equivalent material | material model | metals | simplified CFRP | |
| Static tip load | by construction | always | | |
| No lateral–torsional buckling | I_governing / I_other | < 4 (weak-axis or compact section) | ≥ 4 (strong-axis bending of a narrow section) | not evaluated |

### Where the small-deflection bands come from

The bands are calibrated against an **exact elastica** solution of the
tip-loaded cantilever. That solution solves EI θ″ = −F cos θ with θ(0) = 0 and
θ′(L) = 0, by shooting with a tolerance of 1e-11. It was computed once, during
development, to set the thresholds:

| Linear δ/L | Exact δ/L | Linear theory overpredicts by |
|---|---|---|
| 0.05 | 0.0499 | 0.26 % |
| **0.10** | 0.0990 | **1.0 %** |
| 0.15 | 0.1467 | 2.3 % |
| **0.20** | 0.1924 | **4.0 %** |
| 0.30 | 0.2762 | 8.6 % |
| 0.50 | 0.4110 | 21.7 % |
| 1.00 | 0.6033 | 65.8 % |
| 1.546 (default case) | 0.6998 | 120.9 % |

The nonlinear elastica is **not** part of the application; it was used only
to calibrate these thresholds. The nonlinear large-deflection solver is
roadmap item M9.

### Shear-deformation estimate

The Euler–Bernoulli model neglects shear deformation. The app quantifies what
is being neglected with the Timoshenko ratio

  δ_shear / δ_bend = 3EI / (κ G A L²),  κ = 5/6,  G = E / (2(1 + ν))

For a rectangle this reduces to 0.6 (1 + ν)(h/L)², a closed form the unit tests
check. This is the only use of Poisson's ratio in Milestone 1, and the
inspector says so.

For the simplified CFRP preset, isotropic G overestimates the real transverse
shear modulus of a laminate. The estimate is therefore **unconservative**, and
the material note states this.

## 4. The brief's default case is outside the model

The suggested starting example (L = 1 m, b = 30 mm, h = 5 mm, E = 69 GPa,
F = 100 N) gives:

- **δ = 1.546 m, so δ/L = 155 %.** Linear theory overpredicts the true
  (elastica) deflection by about **2.2×**; the real tip would drop about 0.70 m.
- **σ_max = 800 MPa, 2.9× the yield strength of 6061-T6.** The beam would yield.

The app uses these values unchanged, because they are also the specified UI
reference case. It does **not** hide the problem:

- The status chip reads **Outside assumptions · 2**.
- The Why? panel for δ says the true deflection is smaller.
- Onboarding step 1 computes a length that brings δ/L back to 10 %:
  L = √(0.1 · 3EI / F) = 0.254 m, rounded down to **0.25 m**.

**Recommendation.** If the example is meant to *start* inside the model's
validity, use F = 5 N, or keep F = 100 N with L = 0.25 m.

## 5. Material presets

Typical room-temperature handbook values (ASM / MatWeb class), rounded. They
are for learning, **not** design allowables.

| Preset | E [GPa] | ρ [kg/m³] | ν | Reference strength [MPa] |
|---|---|---|---|---|
| Aluminium 6061-T6 | 69 | 2700 | 0.33 | 276 (yield) |
| Aluminium 7075-T6 | 71.7 | 2810 | 0.33 | 503 (yield) |
| Steel AISI 4130 (normalised) | 205 | 7850 | 0.29 | 460 (yield) |
| Titanium Ti-6Al-4V (annealed) | 113.8 | 4430 | 0.342 | 880 (yield) |
| CFRP quasi-isotropic — **simplified** | 50 | 1600 | 0.30 | 400 (indicative) |
| Custom | any valid value | | | |

CFRP is labelled **Simplified isotropic / educational** wherever it appears. A
single scalar E stands in for the laminate. ABD mechanics, ply failure and
anisotropy are not modelled. Editing any value of a preset turns the material
into "Custom (from …)", so a modified material is never shown under a real
alloy's name.

## 6. Input validation

Validation is done by [`validation.ts`](../src/lib/structures/validation.ts),
before anything reaches the document:

- L, b, h, E, ρ and strength must be **> 0** and finite.
- ν must satisfy **−1 < ν < 0.5**, the isotropic bounds.
- F must be **≥ 0**. F = 0 is valid, and every response is then zero.

An invalid entry shows a message at the field. The model keeps its last valid
state, and the result strip says "showing last valid state".

## 7. Not modelled (Milestone 1)

- Large deflection or geometric nonlinearity (elastica) — M9.
- Plasticity or post-yield behaviour. The check only flags when σ ≥ σ_ref.
- Shear deformation, beyond the estimate above.
- Distributed loads, moments, multiple loads, other supports — the M8 FEM solver.
- Dynamics: modal (M2), FRF and damping (M3).
- Buckling (M4). Euler column buckling needs axial compression, which a
  transverse tip load does not produce. **Lateral–torsional buckling** can
  occur, however, when a narrow section is bent about its strong axis. The
  lateral-load case of the default 30 × 5 mm strip is exactly that (Iyy/Ixx = 36).
  The app flags this situation as a caution but does not compute a critical load.
- Thermal loads, prestress, laminate mechanics, and space-environment effects.

## 8. Validation evidence

- **Unit tests** (Vitest), 131 in total:
  - Hand-derived reference values.
  - A second hand-checked case at L = 2 m. This case is needed because the brief's reference case alone cannot detect an L² vs L³ error, since L = 1.
  - The mandatory scaling laws.
  - Boundary conditions and finite-difference checks of v′ and v″ = M/EI.
  - Shear-ratio closed form, elasticities, exact change attribution, validation, and assumption bands.
  - A deliberate mutation of the deflection formula made 8 tests fail.
- **End-to-end tests** (Playwright) type the reference case into the real UI
  and assert the displayed values and units. See
  [UI_VALIDATION_REPORT.md](UI_VALIDATION_REPORT.md).
