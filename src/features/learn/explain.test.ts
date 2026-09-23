import { describe, expect, it } from "vitest";
import { rectangularSection } from "@/lib/structures/section";
import { rankDrivers } from "@/lib/structures/sensitivity";
import type { CantileverInput } from "@/lib/structures/cantilever";
import { solveCantilever } from "@/lib/structures/cantilever";
import { doublingSentence, factorText, lengthForDeflectionRatio, powerTex, proportionalityTex } from "./explain";

const REF: CantileverInput = {
  length: 1.0,
  section: rectangularSection(0.03, 0.005),
  material: { E: 69e9, rho: 2700, nu: 0.33, strength: 276e6 },
  load: { magnitude: 100, plane: "vertical" },
};

describe("dynamic explanation text", () => {
  it("states the brief's example sentence, computed from the solver", () => {
    expect(doublingSentence(REF, "L", "tipDeflection")).toBe(
      "Doubling this beam's length increases its tip deflection by 8×.",
    );
  });

  it("describes reductions as division", () => {
    expect(doublingSentence(REF, "h", "tipDeflection")).toBe(
      "Doubling this beam's section height divides its tip deflection by 8.",
    );
    expect(doublingSentence(REF, "E", "tipDeflection")).toBe(
      "Doubling this beam's Young's modulus divides its tip deflection by 2.",
    );
  });

  it("says when a parameter has no effect", () => {
    expect(doublingSentence(REF, "E", "maxBendingStress")).toBe(
      "Doubling this beam's Young's modulus leaves its maximum bending stress unchanged.",
    );
  });

  it("builds the proportionality from measured exponents", () => {
    expect(proportionalityTex("tipDeflection", rankDrivers(REF, "tipDeflection"))).toBe(
      "\\delta \\propto F\\,L^{3}\\,E^{-1}\\,b^{-1}\\,h^{-3}",
    );
  });

  it("suggests the length that brings the default beam back inside small-deflection theory", () => {
    // δ/L = F L² / (3 EI) = 0.1 → L = sqrt(0.3 × 21.5625 / 100) = 0.2543 m → 0.25 m
    const EI = solveCantilever(REF).EI;
    const L = lengthForDeflectionRatio(REF, EI);
    expect(L).toBeCloseTo(0.25, 12);
    const at = solveCantilever({ ...REF, length: L });
    expect(at.deflectionRatio).toBeLessThanOrEqual(0.1);
  });

  it("formats factors and powers", () => {
    expect(factorText(8)).toBe("×8");
    expect(factorText(0.125)).toBe("÷8");
    expect(factorText(1.0000001)).toBe("×1");
    expect(powerTex(1)).toBe("");
    expect(powerTex(-3)).toBe("^{-3}");
  });
});
