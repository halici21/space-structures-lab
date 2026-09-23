import { describe, expect, it } from "vitest";
import {
  editableText,
  formatNumber,
  formatQuantityText,
  fromDisplay,
  parseNumber,
  toDisplay,
  unitFor,
} from "./units";

describe("unit conversion", () => {
  it("round-trips SI through every display unit without drift", () => {
    const cases: [number, Parameters<typeof unitFor>[0]][] = [
      [0.005, "sectionDim"],
      [69e9, "modulus"],
      [8e8, "stress"],
      [3.125e-10, "inertia"],
      [1.035e7, "axialStiffness"],
    ];
    for (const [si, kind] of cases) {
      for (const system of ["engineering", "si"] as const) {
        const u = unitFor(kind, system);
        expect(fromDisplay(toDisplay(si, u), u) / si).toBeCloseTo(1, 14);
      }
    }
  });

  it("uses mm for section dimensions and GPa for modulus in the engineering system", () => {
    expect(toDisplay(0.005, unitFor("sectionDim", "engineering"))).toBeCloseTo(5, 12);
    expect(toDisplay(69e9, unitFor("modulus", "engineering"))).toBeCloseTo(69, 12);
    expect(toDisplay(3.125e-10, unitFor("inertia", "engineering"))).toBeCloseTo(312.5, 9);
  });
});

describe("formatting", () => {
  it("shows four significant figures and strips trailing zeros", () => {
    expect(formatNumber(1545.8937)).toBe("1546");
    expect(formatNumber(0.405)).toBe("0.405");
    expect(formatNumber(100)).toBe("100");
    expect(formatNumber(21.5625)).toBe("21.56");
    expect(formatNumber(0.0012346)).toBe("0.001235");
  });

  it("switches to × 10ⁿ outside [1e-3, 1e6)", () => {
    expect(formatNumber(3.125e-10)).toBe("3.125 × 10⁻¹⁰");
    expect(formatNumber(8e8)).toBe("8 × 10⁸");
    expect(formatNumber(9.99999e6)).toBe("1 × 10⁷");
  });

  it("renders the brief's reference results in engineering units", () => {
    expect(formatQuantityText(1.545893719806763, "displacement", "engineering")).toBe("1546 mm");
    expect(formatQuantityText(8e8, "stress", "engineering")).toBe("800 MPa");
    expect(formatQuantityText(100, "moment", "engineering")).toBe("100 N·m");
    expect(formatQuantityText(0.405, "mass", "engineering")).toBe("0.405 kg");
    expect(formatQuantityText(21.5625, "flexuralStiffness", "engineering")).toBe("21.56 N·m²");
  });

  it("non-finite values render as an em dash, not NaN", () => {
    expect(formatNumber(Number.NaN)).toBe("—");
  });
});

describe("parsing", () => {
  it("accepts decimal point, decimal comma, exponents and spaces", () => {
    expect(parseNumber("1.5")).toBe(1.5);
    expect(parseNumber("1,5")).toBe(1.5);
    expect(parseNumber(" 2e-3 ")).toBe(0.002);
    expect(parseNumber("69E9")).toBe(69e9);
    expect(parseNumber(".5")).toBe(0.5);
  });

  it("rejects partial or malformed input", () => {
    for (const s of ["", "-", ".", "1e", "abc", "1..2", "5 mm"]) {
      expect(Number.isNaN(parseNumber(s))).toBe(true);
    }
  });

  it("editable text is unit-scaled and free of floating-point noise", () => {
    expect(editableText(0.03, unitFor("sectionDim", "engineering"))).toBe("30");
    expect(editableText(69e9, unitFor("modulus", "engineering"))).toBe("69");
    expect(editableText(0.1 + 0.2, unitFor("span", "si"))).toBe("0.3");
  });
});
