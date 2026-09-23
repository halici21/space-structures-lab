import { describe, expect, it } from "vitest";
import {
  bendingMomentAt,
  bendingStressAt,
  deflectionAt,
  sampleDeflection,
  slopeAt,
  solveCantilever,
  type CantileverInput,
} from "./cantilever";
import { rectangularSection, sectionProperties } from "./section";

/**
 * Reference case from the brief (§23/§29). Expected values below were derived
 * by hand, independently of the implementation:
 *   A   = 0.03 · 0.005                  = 1.5e-4 m²
 *   Ixx = 0.03 · 0.005³ / 12            = 3.125e-10 m⁴
 *   Iyy = 0.005 · 0.03³ / 12            = 1.125e-8 m⁴
 *   EI  = 69e9 · 3.125e-10              = 21.5625 N·m²
 *   δ   = 100 · 1³ / (3 · 21.5625)      = 1.545893719806763 m
 *   M   = 100 · 1                       = 100 N·m
 *   σ   = 100 · 0.0025 / 3.125e-10      = 8.0e8 Pa
 *   m   = 2700 · 1.5e-4 · 1             = 0.405 kg
 *   EA  = 69e9 · 1.5e-4                 = 1.035e7 N
 *   k   = 3 · 21.5625 / 1³              = 64.6875 N/m
 *   θ   = 100 · 1² / (2 · 21.5625)      = 2.318840579710145 rad
 */
const REFERENCE: CantileverInput = {
  length: 1.0,
  section: rectangularSection(0.03, 0.005),
  material: { E: 69e9, rho: 2700, nu: 0.33, strength: 276e6 },
  load: { magnitude: 100, plane: "vertical" },
};

const rel = (actual: number, expected: number) => Math.abs(actual / expected - 1);

describe("section properties", () => {
  it("rectangular area and second moments match hand values", () => {
    const s = sectionProperties(rectangularSection(0.03, 0.005));
    expect(rel(s.area, 1.5e-4)).toBeLessThan(1e-14);
    expect(rel(s.Ixx, 3.125e-10)).toBeLessThan(1e-14);
    expect(rel(s.Iyy, 1.125e-8)).toBeLessThan(1e-14);
    expect(s.cx).toBe(0.0025);
    expect(s.cy).toBe(0.015);
  });

  it("I = bh³/12: doubling h multiplies Ixx by exactly 8", () => {
    const a = sectionProperties(rectangularSection(0.03, 0.005)).Ixx;
    const b = sectionProperties(rectangularSection(0.03, 0.01)).Ixx;
    expect(b / a).toBeCloseTo(8, 12);
  });

  it("a square section has Ixx = Iyy", () => {
    const s = sectionProperties(rectangularSection(0.02, 0.02));
    expect(s.Ixx).toBe(s.Iyy);
  });
});

describe("cantilever reference case", () => {
  const r = solveCantilever(REFERENCE);

  it("tip deflection δ = FL³/(3EI)", () => {
    expect(rel(r.EI, 21.5625)).toBeLessThan(1e-14);
    expect(rel(r.tipDeflection, 1.545893719806763)).toBeLessThan(1e-13);
  });

  it("maximum bending stress σ = Mc/I", () => {
    expect(rel(r.rootMoment, 100)).toBeLessThan(1e-15);
    expect(rel(r.maxBendingStress, 8.0e8)).toBeLessThan(1e-13);
  });

  it("σ = 6FL/(bh²) for a rectangle (independent closed form)", () => {
    expect(rel(r.maxBendingStress, (6 * 100 * 1) / (0.03 * 0.005 ** 2))).toBeLessThan(1e-13);
  });

  it("beam mass m = ρAL", () => {
    expect(rel(r.mass, 0.405)).toBeLessThan(1e-14);
  });

  it("stiffness values EA, EI, k and tip rotation", () => {
    expect(rel(r.EA, 1.035e7)).toBeLessThan(1e-14);
    expect(rel(r.tipStiffness, 64.6875)).toBeLessThan(1e-14);
    expect(rel(r.tipRotation, 2.318840579710145)).toBeLessThan(1e-13);
    expect(rel(r.tipDeflection, 100 / r.tipStiffness)).toBeLessThan(1e-14);
  });

  it("a second hand-checked case: steel 2 m × 50 × 20 mm, 500 N", () => {
    // I = 0.05·0.02³/12 = 3.3333e-8; EI = 205e9·I = 6833.33; δ = 500·8/(3·6833.33) = 0.195122 m
    const s = solveCantilever({
      length: 2,
      section: rectangularSection(0.05, 0.02),
      material: { E: 205e9, rho: 7850, nu: 0.29, strength: 460e6 },
      load: { magnitude: 500, plane: "vertical" },
    });
    expect(rel(s.tipDeflection, 0.19512195121951)).toBeLessThan(1e-12);
    // σ = 6·500·2/(0.05·0.02²) = 3.0e8 Pa
    expect(rel(s.maxBendingStress, 3.0e8)).toBeLessThan(1e-13);
    // m = 7850 · 0.001 · 2 = 15.7 kg
    expect(rel(s.mass, 15.7)).toBeLessThan(1e-13);
  });

  it("zero load gives zero response without NaN", () => {
    const z = solveCantilever({ ...REFERENCE, load: { magnitude: 0, plane: "vertical" } });
    expect(z.tipDeflection).toBe(0);
    expect(z.maxBendingStress).toBe(0);
    expect(z.tipStiffness).toBeCloseTo(64.6875, 10);
  });
});

describe("mandatory scaling laws", () => {
  const base = solveCantilever(REFERENCE);

  it("doubling L multiplies tip deflection by 8", () => {
    const r = solveCantilever({ ...REFERENCE, length: 2 });
    expect(r.tipDeflection / base.tipDeflection).toBeCloseTo(8, 12);
  });

  it("doubling h multiplies I by 8 and divides deflection by 8", () => {
    const r = solveCantilever({ ...REFERENCE, section: rectangularSection(0.03, 0.01) });
    expect(r.I / base.I).toBeCloseTo(8, 12);
    expect(r.tipDeflection / base.tipDeflection).toBeCloseTo(1 / 8, 12);
  });

  it("doubling E halves deflection", () => {
    const r = solveCantilever({ ...REFERENCE, material: { ...REFERENCE.material, E: 138e9 } });
    expect(r.tipDeflection / base.tipDeflection).toBeCloseTo(0.5, 12);
  });

  it("doubling F doubles deflection and stress", () => {
    const r = solveCantilever({ ...REFERENCE, load: { magnitude: 200, plane: "vertical" } });
    expect(r.tipDeflection / base.tipDeflection).toBeCloseTo(2, 12);
    expect(r.maxBendingStress / base.maxBendingStress).toBeCloseTo(2, 12);
  });

  it("doubling h divides stress by 4 (σ ∝ 1/h²)", () => {
    const r = solveCantilever({ ...REFERENCE, section: rectangularSection(0.03, 0.01) });
    expect(r.maxBendingStress / base.maxBendingStress).toBeCloseTo(0.25, 12);
  });

  it("E does not change stress for a statically determinate cantilever", () => {
    const r = solveCantilever({ ...REFERENCE, material: { ...REFERENCE.material, E: 200e9 } });
    expect(r.maxBendingStress).toBeCloseTo(base.maxBendingStress, 3);
  });
});

describe("load plane", () => {
  it("lateral load uses Iyy and b as the bending depth", () => {
    const lat = solveCantilever({ ...REFERENCE, load: { magnitude: 100, plane: "lateral" } });
    expect(rel(lat.I, 1.125e-8)).toBeLessThan(1e-14);
    expect(lat.c).toBe(0.015);
    // δ = 100 / (3 · 69e9 · 1.125e-8) = 0.042941492... m
    expect(rel(lat.tipDeflection, 100 / (3 * 69e9 * 1.125e-8))).toBeLessThan(1e-14);
    // Iyy/Ixx = (b/h)² = 36, so the lateral beam is 36× stiffer
    const vert = solveCantilever(REFERENCE);
    expect(vert.tipDeflection / lat.tipDeflection).toBeCloseTo(36, 10);
  });
});

describe("deflected shape field", () => {
  const r = solveCantilever(REFERENCE);
  const L = REFERENCE.length;

  it("satisfies the boundary conditions v(0) = 0, v'(0) = 0", () => {
    expect(deflectionAt(r, 0)).toBe(0);
    expect(slopeAt(r, 0)).toBe(0);
  });

  it("v(L) equals the tip deflection and v'(L) the tip rotation", () => {
    expect(rel(deflectionAt(r, L), r.tipDeflection)).toBeLessThan(1e-14);
    expect(rel(slopeAt(r, L), r.tipRotation)).toBeLessThan(1e-14);
  });

  it("v(z) = F z² (3L − z)/(6EI) at mid-span: 5/16 of the tip deflection", () => {
    // v(L/2) = F (L²/4)(5L/2)/(6EI) = 5FL³/(48EI) = (5/16) δ
    expect(deflectionAt(r, L / 2) / r.tipDeflection).toBeCloseTo(5 / 16, 14);
  });

  it("slope is the derivative of the deflection (finite-difference check)", () => {
    for (const z of [0.1, 0.37, 0.8]) {
      const h = 1e-6;
      const fd = (deflectionAt(r, z + h) - deflectionAt(r, z - h)) / (2 * h);
      expect(rel(fd, slopeAt(r, z))).toBeLessThan(1e-7);
    }
  });

  it("curvature v'' = M/EI (second-difference check)", () => {
    for (const z of [0.05, 0.5, 0.9]) {
      const h = 1e-4;
      const fd2 = (deflectionAt(r, z + h) - 2 * deflectionAt(r, z) + deflectionAt(r, z - h)) / h ** 2;
      expect(rel(fd2, bendingMomentAt(r, z) / r.EI)).toBeLessThan(1e-5);
    }
  });

  it("moment vanishes at the tip; stress is max at the root extreme fibre", () => {
    expect(bendingMomentAt(r, L)).toBe(0);
    expect(rel(bendingStressAt(r, 0, r.c), r.maxBendingStress)).toBeLessThan(1e-14);
    expect(bendingStressAt(r, 0, -r.c)).toBeCloseTo(-r.maxBendingStress, 0);
    expect(bendingStressAt(r, 0.5, 0)).toBe(0);
  });

  it("sampling includes root and tip and is monotonic", () => {
    const s = sampleDeflection(r, 33);
    expect(s).toHaveLength(33);
    expect(s[0]!.z).toBe(0);
    expect(s[32]!.z).toBe(L);
    for (let i = 1; i < s.length; i++) expect(s[i]!.v).toBeGreaterThan(s[i - 1]!.v);
  });
});

describe("shear-deformation estimate", () => {
  it("matches the closed form δs/δb = 0.6 (1 + ν) (h/L)² for a rectangle with κ = 5/6", () => {
    const r = solveCantilever(REFERENCE);
    const expected = 0.6 * (1 + 0.33) * (0.005 / 1) ** 2;
    expect(rel(r.shearDeflectionRatio, expected)).toBeLessThan(1e-12);
  });
});
