import { describe, expect, it } from "vitest";
import { createCantileverExample, resolveStaticBending, solveDocument } from "./document";

describe("document → solver", () => {
  it("the starting example resolves to the brief's reference input", () => {
    const r = resolveStaticBending(createCantileverExample());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.input).toEqual({
      length: 1,
      section: { kind: "rectangular", b: 0.03, h: 0.005 },
      material: { E: 69e9, rho: 2700, nu: 0.33, strength: 276e6 },
      load: { magnitude: 100, plane: "vertical" },
    });
  });

  it("solves and memoises per document object", () => {
    const doc = createCantileverExample();
    const a = solveDocument(doc);
    expect(a.ok).toBe(true);
    expect(solveDocument(doc)).toBe(a);
    if (a.ok) expect(a.value.result.tipDeflection).toBeCloseTo(1.545893719806763, 12);
  });

  it("hiding the load does not suppress it", () => {
    const doc = createCantileverExample();
    doc.loads[0]!.visible = false;
    const s = solveDocument(doc);
    expect(s.ok && s.value.result.tipDeflection).toBeCloseTo(1.545893719806763, 12);
  });

  it("reports an unsupported configuration instead of solving it", () => {
    const doc = createCantileverExample();
    doc.constraints = [];
    const s = solveDocument(doc);
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.reason).toMatch(/fixed support/);
  });

  it("refuses invalid physical values", () => {
    const doc = createCantileverExample();
    doc.geometry[0]!.length = 0;
    expect(solveDocument(doc).ok).toBe(false);
  });
});
