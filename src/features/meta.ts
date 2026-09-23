/**
 * Display metadata for parameters and results: labels, TeX symbols and the
 * unit kind each is displayed in. Shared by inspector, results, Learn and
 * sensitivity so a quantity is named the same way everywhere.
 */
import type { QuantityKind } from "@/core/units";
import type { CantileverResult } from "@/lib/structures/cantilever";
import type { ParameterKey } from "@/lib/structures/validation";

export interface QuantityMeta {
  label: string;
  /** Compact label for tight layouts (result strip). */
  short?: string;
  /** Lower-case noun for sentences ("this beam's length"). */
  noun: string;
  symbol: string;
  kind: QuantityKind;
}

export const PARAM_META: Record<ParameterKey, QuantityMeta> = {
  L: { label: "Length", noun: "length", symbol: "L", kind: "span" },
  b: { label: "Width", noun: "section width", symbol: "b", kind: "sectionDim" },
  h: { label: "Height", noun: "section height", symbol: "h", kind: "sectionDim" },
  E: { label: "Young's modulus", noun: "Young's modulus", symbol: "E", kind: "modulus" },
  rho: { label: "Density", noun: "density", symbol: "\\rho", kind: "density" },
  nu: { label: "Poisson's ratio", noun: "Poisson's ratio", symbol: "\\nu", kind: "poisson" },
  strength: { label: "Yield strength", noun: "strength", symbol: "\\sigma_y", kind: "stress" },
  F: { label: "Tip force", noun: "tip force", symbol: "F", kind: "force" },
};

export type ResultKey = keyof Pick<
  CantileverResult,
  | "tipDeflection"
  | "maxBendingStress"
  | "rootMoment"
  | "mass"
  | "EI"
  | "EA"
  | "tipStiffness"
  | "tipRotation"
  | "rootShear"
>;

export const RESULT_META: Record<ResultKey, QuantityMeta> = {
  tipDeflection: { label: "Tip displacement", noun: "tip deflection", symbol: "\\delta", kind: "displacement" },
  maxBendingStress: { label: "Max bending stress", short: "Max stress", noun: "maximum bending stress", symbol: "\\sigma_{max}", kind: "stress" },
  rootMoment: { label: "Root moment", noun: "root bending moment", symbol: "M_{max}", kind: "moment" },
  mass: { label: "Mass", noun: "mass", symbol: "m", kind: "mass" },
  EI: { label: "Flexural stiffness", noun: "flexural stiffness", symbol: "EI", kind: "flexuralStiffness" },
  EA: { label: "Axial stiffness", noun: "axial stiffness", symbol: "EA", kind: "axialStiffness" },
  tipStiffness: { label: "Tip stiffness", noun: "tip stiffness", symbol: "k_{tip}", kind: "tipStiffness" },
  tipRotation: { label: "Tip rotation", noun: "tip rotation", symbol: "\\theta_{tip}", kind: "rotation" },
  rootShear: { label: "Root shear", noun: "root shear force", symbol: "V", kind: "force" },
};
