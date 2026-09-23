/**
 * Educational material presets.
 *
 * Values are typical room-temperature handbook values (ASM / MatWeb class),
 * rounded. They are for learning and comparison only — NOT design allowables.
 * All values SI: Pa, kg/m³, dimensionless.
 */

export type MaterialPresetId =
  | "al-6061-t6"
  | "al-7075-t6"
  | "steel-4130"
  | "ti-6al-4v"
  | "cfrp-qi-simplified"
  | "custom";

export interface IsotropicMaterial {
  /** Young's modulus [Pa]. */
  E: number;
  /** Density [kg/m³]. */
  rho: number;
  /** Poisson's ratio [–]. */
  nu: number;
  /** Reference strength for the linear-elastic check [Pa]. */
  strength: number;
}

export interface MaterialPreset extends IsotropicMaterial {
  id: MaterialPresetId;
  name: string;
  shortName: string;
  /** "yield" = 0.2 % offset yield; "indicative" = rough allowable for an idealised material. */
  strengthKind: "yield" | "indicative";
  /** Marks a material whose real behaviour is not captured by a scalar E. */
  simplified: boolean;
  note?: string;
}

const GPa = 1e9;
const MPa = 1e6;

export const MATERIAL_PRESETS: readonly MaterialPreset[] = [
  {
    id: "al-6061-t6",
    name: "Aluminium 6061-T6",
    shortName: "Al 6061-T6",
    E: 69 * GPa,
    rho: 2700,
    nu: 0.33,
    strength: 276 * MPa,
    strengthKind: "yield",
    simplified: false,
  },
  {
    id: "al-7075-t6",
    name: "Aluminium 7075-T6",
    shortName: "Al 7075-T6",
    E: 71.7 * GPa,
    rho: 2810,
    nu: 0.33,
    strength: 503 * MPa,
    strengthKind: "yield",
    simplified: false,
  },
  {
    id: "steel-4130",
    name: "Steel AISI 4130 (normalised)",
    shortName: "Steel 4130",
    E: 205 * GPa,
    rho: 7850,
    nu: 0.29,
    strength: 460 * MPa,
    strengthKind: "yield",
    simplified: false,
  },
  {
    id: "ti-6al-4v",
    name: "Titanium Ti-6Al-4V (annealed)",
    shortName: "Ti-6Al-4V",
    E: 113.8 * GPa,
    rho: 4430,
    nu: 0.342,
    strength: 880 * MPa,
    strengthKind: "yield",
    simplified: false,
  },
  {
    id: "cfrp-qi-simplified",
    name: "CFRP quasi-isotropic — simplified",
    shortName: "CFRP (QI, simplified)",
    E: 50 * GPa,
    rho: 1600,
    nu: 0.3,
    strength: 400 * MPa,
    strengthKind: "indicative",
    simplified: true,
    note:
      "A single in-plane E stands in for the laminate. " +
      "Laminate mechanics (ABD), ply failure and the low transverse shear modulus are not modelled, " +
      "so the shear-deformation estimate is unconservative for this material.",
  },
];

export function getPreset(id: MaterialPresetId): MaterialPreset | undefined {
  return MATERIAL_PRESETS.find((p) => p.id === id);
}

/** Shear modulus of an isotropic material, G = E / (2(1 + ν)). */
export function isotropicShearModulus(E: number, nu: number): number {
  return E / (2 * (1 + nu));
}
