# Future Roadmap

Milestones after M0 (application shell) and M1 (cantilever beam playground).
**None of these are implemented.** In the app they appear only as disabled
"Planned · Mx" entries.

The learning trajectory the roadmap follows:

beam bending → modal analysis → damping → buckling → nonlinear mechanics →
composite booms → deployables → membranes/prestress → joints/contact →
uncertainty → CSI → validation / flight correlation

| Milestone | Scope | Hooks already in place |
|---|---|---|
| **M2 — Modal analysis** | Cantilever eigenfrequencies (β_n L = 1.875, 4.694, 7.855, …), mode shapes, animated mode visualisation, mass participation. | `AnalysisKind "modal"` in the registry; the resolver pattern; the swept-solid builder works from per-station centroid offset and slope (today taken from the static v(z), v′(z); a mode shape needs only that input to be passed in); the viewport render-on-demand needs a clock only while animating. |
| **M3 — FRF and damping** | Forced response, resonance, damping ratio ζ, FRF magnitude/phase plots, modal superposition. | `LineChart` supports log axes; sensitivity helpers work on any response. |
| **M4 — Buckling** | Euler column buckling (effective length, slenderness), **lateral–torsional buckling** of narrow sections (M1 already flags when it becomes possible), buckled-shape visualisation. | `no-lateral-buckling` assumption check; the `PointForce.plane` union gains an axial member for column loading. |
| **M5 — Learn system expansion** | Deeper derivations (curvature → rotation → deflection), interactive scaling experiments, guided lessons with checks for understanding. | Explanation text is pure and unit-tested (`features/learn/explain.ts`); `attributeChange` already decomposes any edit exactly. |
| **M6 — First space structure** | Tape spring or composite boom: curved thin-walled section, snap-through intuition, laminate stiffness. | `SectionShape` union; `GeometryKind "boom"`; material model field for a future laminate model. |
| **M7 — Space Structures Library** | TRAC, slit-tube (STEM), lenticular booms; membranes; cable nets; tensegrity; solar arrays. | Library catalog (`features/library`) lists them with milestones; content source: `Grad/deployable_space_structures` literature atlas. |
| **M8 — Numerical structural solver** | 1D beam FEM (Euler–Bernoulli and Timoshenko elements), arbitrary supports and loads, validation against M1 closed forms. | Resolver seam: the FEM solver accepts documents the closed form rejects; `ConstraintKind`/`LoadKind` unions already enumerate pinned, spring, distributed, moment. |
| **M9 — Nonlinear / deployment** | Large deflection (elastica — M1 already uses it to calibrate its validity bands), contact, snap-through, deployment state sequences. | `AnalysisKind "nonlinear" / "deployment"`; the small-deflection check becomes a switch to the nonlinear solver. |
| **M10 — Research mode** | Paper-linked models, ROSA, SAFDE, model-vs-test overlays, uncertainty bands. | Document schema is serialisable JSON with `schemaVersion`. |

## Near-term improvements (not milestones)

- Change the default example to one inside the model's validity, or keep the brief's example deliberately as the first "why is this wrong?" lesson. See STRUCTURAL_MODEL_ASSUMPTIONS §4.
- Per-quantity unit overrides; the abstraction supports them, but only two unit systems are exposed.
- Undo/redo. The document is immutable, so a history stack is straightforward.
- Code-split KaTeX out of the initial chunk (the initial chunk is 225 kB gzip).
- A view cube with face clicking. The gizmo axes are clickable today.
