import { describe, expect, it } from "vitest";
import { solveCantilever, type CantileverInput } from "./cantilever";
import { rectangularSection } from "./section";
import {
  attributeChange,
  cleanExponent,
  elasticity,
  rankDrivers,
  sweep,
  whatIf,
  withParameter,
} from "./sensitivity";
import { validateInput, validateParameter } from "./validation";
import { assumptionChecks, worstStatus } from "./validity";

const REF: CantileverInput = {
  length: 1.0,
  section: rectangularSection(0.03, 0.005),
  material: { E: 69e9, rho: 2700, nu: 0.33, strength: 276e6 },
  load: { magnitude: 100, plane: "vertical" },
};

describe("elasticities measured from the solver", () => {
  it.each([
    ["F", 1],
    ["L", 3],
    ["E", -1],
    ["b", -1],
    ["h", -3],
    ["rho", 0],
  ] as const)("δ ∝ %s^%d", (param, expected) => {
    expect(elasticity(REF, param, "tipDeflection")).toBeCloseTo(expected, 7);
    expect(cleanExponent(elasticity(REF, param, "tipDeflection"))).toBe(expected);
  });

  it.each([
    ["F", 1],
    ["L", 1],
    ["b", -1],
    ["h", -2],
    ["E", 0],
  ] as const)("σ ∝ %s^%d", (param, expected) => {
    expect(cleanExponent(elasticity(REF, param, "maxBendingStress"))).toBe(expected);
  });

  it.each([
    ["L", -3],
    ["E", 1],
    ["h", 3],
    ["F", 0],
  ] as const)("k ∝ %s^%d", (param, expected) => {
    expect(cleanExponent(elasticity(REF, param, "tipStiffness"))).toBe(expected);
  });

  it("lateral plane swaps the roles of b and h", () => {
    const lat = { ...REF, load: { magnitude: 100, plane: "lateral" as const } };
    expect(cleanExponent(elasticity(lat, "b", "tipDeflection"))).toBe(-3);
    expect(cleanExponent(elasticity(lat, "h", "tipDeflection"))).toBe(-1);
  });

  it("is undefined (NaN) where the response is zero", () => {
    const unloaded = withParameter(REF, "F", 0);
    expect(Number.isNaN(elasticity(unloaded, "L", "tipDeflection"))).toBe(true);
  });
});

describe("what-if ratios", () => {
  it("L × 2 → δ × 8, h × 2 → δ / 8, E × 2 → δ / 2", () => {
    expect(whatIf(REF, "L", 2, "tipDeflection")).toBeCloseTo(8, 12);
    expect(whatIf(REF, "h", 2, "tipDeflection")).toBeCloseTo(0.125, 12);
    expect(whatIf(REF, "E", 2, "tipDeflection")).toBeCloseTo(0.5, 12);
  });

  it("+10 % length increases deflection by 33.1 %", () => {
    expect(whatIf(REF, "L", 1.1, "tipDeflection")).toBeCloseTo(1.331, 12);
  });
});

describe("driver ranking", () => {
  it("ranks L and h (|e| = 3) above E, b and F (|e| = 1) for deflection", () => {
    const ranks = rankDrivers(REF, "tipDeflection");
    expect(ranks.map((r) => r.param)).toEqual(["L", "h", "b", "E", "F"]);
    expect(ranks.map((r) => r.exponent)).toEqual([3, -3, -1, -1, 1]);
  });
});

describe("change attribution", () => {
  it("is exact for a single-parameter change", () => {
    const a = attributeChange(REF, withParameter(REF, "L", 0.3), "tipDeflection");
    expect(a.factors).toHaveLength(1);
    expect(a.factors[0]!.exponent).toBe(3);
    expect(a.observedRatio).toBeCloseTo(0.027, 12);
    expect(a.predictedRatio).toBeCloseTo(a.observedRatio, 12);
  });

  it("multiplies exactly across simultaneous changes (material swap + geometry)", () => {
    const after: CantileverInput = {
      ...REF,
      length: 0.8,
      section: rectangularSection(0.04, 0.008),
      material: { E: 113.8e9, rho: 4430, nu: 0.342, strength: 880e6 },
      load: { magnitude: 30, plane: "vertical" },
    };
    for (const response of ["tipDeflection", "maxBendingStress", "mass", "tipStiffness"] as const) {
      const a = attributeChange(REF, after, response);
      expect(Math.abs(a.predictedRatio / a.observedRatio - 1)).toBeLessThan(1e-9);
    }
  });

  it("flags a change of load plane instead of attributing it", () => {
    const a = attributeChange(REF, { ...REF, load: { magnitude: 100, plane: "lateral" } }, "tipDeflection");
    expect(a.planeChanged).toBe(true);
  });
});

describe("sweep", () => {
  it("is log-spaced, spans 0.5×–2× and passes through the current value", () => {
    const pts = sweep(REF, "L", "tipDeflection", { points: 61 });
    expect(pts).toHaveLength(61);
    expect(pts[0]!.x).toBeCloseTo(0.5, 12);
    expect(pts[60]!.x).toBeCloseTo(2, 12);
    expect(pts[30]!.x).toBeCloseTo(1, 12);
    expect(pts[30]!.y).toBeCloseTo(solveCantilever(REF).tipDeflection, 12);
    expect(pts[60]!.y / pts[30]!.y).toBeCloseTo(8, 10);
  });
});

describe("input validation", () => {
  it.each(["L", "b", "h", "E", "rho", "strength"] as const)("rejects %s ≤ 0", (key) => {
    expect(validateParameter(key, 0)).toBeTruthy();
    expect(validateParameter(key, -1)).toBeTruthy();
    expect(validateParameter(key, 1)).toBeNull();
  });

  it("rejects non-finite numbers", () => {
    expect(validateParameter("L", Number.NaN)).toBeTruthy();
    expect(validateParameter("E", Number.POSITIVE_INFINITY)).toBeTruthy();
  });

  it("bounds Poisson's ratio to −1 < ν < 0.5", () => {
    expect(validateParameter("nu", 0.5)).toBeTruthy();
    expect(validateParameter("nu", -1)).toBeTruthy();
    expect(validateParameter("nu", 0.3)).toBeNull();
  });

  it("allows zero force but not negative", () => {
    expect(validateParameter("F", 0)).toBeNull();
    expect(validateParameter("F", -5)).toBeTruthy();
  });

  it("finds every invalid field of an input", () => {
    const bad = { ...REF, length: 0, section: rectangularSection(-1, 0.005) };
    expect(validateInput(bad).map((i) => i.key)).toEqual(["L", "b"]);
    expect(validateInput(REF)).toEqual([]);
  });
});

describe("assumption checks", () => {
  it("flags the brief's default case as outside small deflection and linear elasticity", () => {
    const checks = assumptionChecks(solveCantilever(REF), { simplifiedMaterial: false });
    const byId = Object.fromEntries(checks.map((c) => [c.id, c]));
    expect(byId["small-deformation"]!.status).toBe("violated");
    expect(byId["small-deformation"]!.metric).toBeCloseTo(1.5459, 4);
    expect(byId["linear-elastic"]!.status).toBe("violated");
    expect(byId["slender"]!.status).toBe("ok");
    expect(byId["shear-neglected"]!.status).toBe("ok");
    expect(worstStatus(checks)).toBe("violated");
  });

  it("a shortened, lightly loaded beam is inside all assumptions", () => {
    const r = solveCantilever({ ...REF, length: 0.3, load: { magnitude: 5, plane: "vertical" } });
    const checks = assumptionChecks(r, { simplifiedMaterial: false });
    expect(worstStatus(checks)).toBe("ok");
  });

  it("flags possible lateral-torsional buckling only for strong-axis bending of a narrow section", () => {
    const vertical = assumptionChecks(solveCantilever(REF), { simplifiedMaterial: false });
    expect(vertical.find((c) => c.id === "no-lateral-buckling")!.status).toBe("ok");
    const lateral = assumptionChecks(
      solveCantilever({ ...REF, load: { magnitude: 1, plane: "lateral" } }),
      { simplifiedMaterial: false },
    );
    const ltb = lateral.find((c) => c.id === "no-lateral-buckling")!;
    expect(ltb.status).toBe("caution");
    expect(ltb.metric).toBeCloseTo(36, 10); // (b/h)² = (30/5)²
  });

  it("marks the simplified CFRP idealisation as a caution", () => {
    const checks = assumptionChecks(solveCantilever(REF), { simplifiedMaterial: true });
    expect(checks.find((c) => c.id === "isotropic")!.status).toBe("caution");
  });

  it("a stubby beam fails slenderness and the shear check", () => {
    const r = solveCantilever({ ...REF, length: 0.01, section: rectangularSection(0.03, 0.005) });
    const byId = Object.fromEntries(
      assumptionChecks(r, { simplifiedMaterial: false }).map((c) => [c.id, c]),
    );
    expect(byId["slender"]!.status).toBe("violated");
    expect(byId["shear-neglected"]!.status).toBe("violated");
  });
});
