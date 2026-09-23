/**
 * Input validation for the cantilever parameters.
 *
 * Invalid values never reach the document: inspector fields validate their
 * draft text here and only commit values that pass.
 */
import type { CantileverInput } from "./cantilever";

export type ParameterKey = "L" | "b" | "h" | "E" | "rho" | "nu" | "strength" | "F";

export interface ValidationIssue {
  key: ParameterKey;
  message: string;
}

const POSITIVE: Record<Exclude<ParameterKey, "nu" | "F">, string> = {
  L: "Length must be greater than 0.",
  b: "Width must be greater than 0.",
  h: "Height must be greater than 0.",
  E: "Young's modulus must be greater than 0.",
  rho: "Density must be greater than 0.",
  strength: "Strength must be greater than 0.",
};

/** Returns a user-facing message, or null when the SI value is acceptable. */
export function validateParameter(key: ParameterKey, value: number): string | null {
  if (!Number.isFinite(value)) return "Enter a finite number.";
  if (key === "nu") {
    return value > -1 && value < 0.5 ? null : "Isotropic materials need −1 < ν < 0.5.";
  }
  if (key === "F") {
    return value >= 0 ? null : "Enter a magnitude ≥ 0. Direction is set separately.";
  }
  return value > 0 ? null : POSITIVE[key];
}

export function parametersOf(input: CantileverInput): Record<ParameterKey, number> {
  if (input.section.kind !== "rectangular") throw new Error("Unsupported section");
  return {
    L: input.length,
    b: input.section.b,
    h: input.section.h,
    E: input.material.E,
    rho: input.material.rho,
    nu: input.material.nu,
    strength: input.material.strength,
    F: input.load.magnitude,
  };
}

export function validateInput(input: CantileverInput): ValidationIssue[] {
  const values = parametersOf(input);
  const issues: ValidationIssue[] = [];
  for (const key of Object.keys(values) as ParameterKey[]) {
    const message = validateParameter(key, values[key]);
    if (message) issues.push({ key, message });
  }
  return issues;
}
