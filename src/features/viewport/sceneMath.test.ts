import { describe, expect, it } from "vitest";
import { deflectionAt, solveCantilever, type CantileverInput } from "@/lib/structures/cantilever";
import { rectangularSection } from "@/lib/structures/section";
import {
  buildBeamMesh,
  displayScale,
  divergingColor,
  niceCell,
  sceneBounds,
  stationFrame,
} from "./sceneMath";

const REF: CantileverInput = {
  length: 1.0,
  section: rectangularSection(0.03, 0.005),
  material: { E: 69e9, rho: 2700, nu: 0.33, strength: 276e6 },
  load: { magnitude: 100, plane: "vertical" },
};
const r = solveCantilever(REF);

describe("deformation display scale", () => {
  it("fixed scales are exact and flagged when exaggerated", () => {
    expect(displayScale("1", r)).toEqual({ factor: 1, exaggerated: false, reduced: false });
    expect(displayScale("50", r).factor).toBe(50);
    expect(displayScale("50", r).exaggerated).toBe(true);
  });

  it("auto draws the tip at 20 % of L, and flags a reduction for a very flexible beam", () => {
    const a = displayScale("auto", r);
    expect(a.factor * r.tipDeflection).toBeCloseTo(0.2, 12);
    expect(a.reduced).toBe(true);
    const stiff = solveCantilever({ ...REF, load: { magnitude: 1, plane: "vertical" } });
    expect(displayScale("auto", stiff).exaggerated).toBe(true);
  });
});

describe("drawn deformed shape follows the analytical curve", () => {
  it("station centroid is −s·v(z) along y for a vertical load", () => {
    for (const z of [0, 0.25, 0.5, 1]) {
      const f = stationFrame(r, z, 10);
      expect(f.center[0]).toBe(0);
      expect(f.center[1]).toBeCloseTo(-10 * deflectionAt(r, z), 12);
      expect(f.center[2]).toBeCloseTo(z, 12);
    }
  });

  it("sections stay perpendicular to the drawn centroid line", () => {
    const f = stationFrame(r, 0.6, 3);
    const d = f.n[0] * f.t[0] + f.n[1] * f.t[1] + f.n[2] * f.t[2];
    expect(Math.abs(d)).toBeLessThan(1e-12);
  });

  it("lateral load displaces along −x", () => {
    const lat = solveCantilever({ ...REF, load: { magnitude: 100, plane: "lateral" } });
    const f = stationFrame(lat, 1, 1);
    expect(f.center[0]).toBeCloseTo(-lat.tipDeflection, 12);
    expect(f.center[1]).toBe(0);
  });

  it("mesh vertices at the tip sit on the analytical tip deflection", () => {
    const m = buildBeamMesh(r, 1, 32);
    let minY = Infinity;
    for (let i = 1; i < m.positions.length; i += 3) minY = Math.min(minY, m.positions[i]!);
    // lowest drawn point ≈ tip centroid − half-height (section rotated by the tip slope)
    expect(minY).toBeLessThan(-r.tipDeflection + 1e-3);
    expect(minY).toBeGreaterThan(-r.tipDeflection - 0.01);
  });

  it("mesh has 4 long faces + 2 caps and consistent buffers", () => {
    const n = 32;
    const m = buildBeamMesh(r, 1, n);
    expect(m.positions.length / 3).toBe(4 * 2 * n + 8);
    expect(m.indices.length).toBe(4 * 6 * (n - 1) + 12);
    expect(m.stress.length).toBe(m.positions.length / 3);
    const maxS = Math.max(...m.stress);
    expect(maxS / r.maxBendingStress).toBeCloseTo(1, 6);
  });

  it("every triangle faces outward (normal · winding > 0)", () => {
    const m = buildBeamMesh(r, 20, 16);
    const P = (i: number) => [m.positions[3 * i]!, m.positions[3 * i + 1]!, m.positions[3 * i + 2]!];
    const N = (i: number) => [m.normals[3 * i]!, m.normals[3 * i + 1]!, m.normals[3 * i + 2]!];
    for (let k = 0; k < m.indices.length; k += 3) {
      const [a, b, c] = [m.indices[k]!, m.indices[k + 1]!, m.indices[k + 2]!];
      const pa = P(a), pb = P(b), pc = P(c);
      const u = [pb[0]! - pa[0]!, pb[1]! - pa[1]!, pb[2]! - pa[2]!];
      const v = [pc[0]! - pa[0]!, pc[1]! - pa[1]!, pc[2]! - pa[2]!];
      const cr = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
      const n = N(a);
      expect(cr[0]! * n[0]! + cr[1]! * n[1]! + cr[2]! * n[2]!).toBeGreaterThan(0);
    }
  });
});

describe("helpers", () => {
  it("bounds contain the drawn tip", () => {
    const b = sceneBounds(r, 1, true);
    expect(b.min[1]).toBeLessThanOrEqual(-r.tipDeflection);
    expect(b.max[2]).toBeGreaterThanOrEqual(1);
  });

  it("colour map is blue for compression, red for tension, neutral at zero", () => {
    const c = divergingColor(-1);
    const t = divergingColor(1);
    const z = divergingColor(0);
    expect(c[2]).toBeGreaterThan(c[0]);
    expect(t[0]).toBeGreaterThan(t[2]);
    expect(z[0]).toBeCloseTo(z[2], 6);
  });

  it("grid cells are 1-2-5 steps", () => {
    expect(niceCell(1)).toBe(0.1);
    expect(niceCell(3)).toBeCloseTo(0.2, 12);
    expect(niceCell(0.3)).toBeCloseTo(0.02, 12);
  });
});
