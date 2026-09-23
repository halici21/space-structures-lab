/**
 * Euler–Bernoulli cantilever with a static tip point load.
 *
 * This file is the single home of the cantilever equations. UI, viewport and
 * explanation code consume `CantileverResult` or the field functions below;
 * none of them re-derive a formula.
 *
 * Coordinates: z runs along the beam from the fixed root (z = 0) to the free
 * tip (z = L). Deflections are reported as positive magnitudes in the load
 * direction. All quantities are SI.
 */
import { isotropicShearModulus, type IsotropicMaterial } from "./materials";
import { sectionProperties, type SectionProperties, type SectionShape } from "./section";

/**
 * vertical: load along −y, bending about the section x-axis (uses Ixx).
 * lateral:  load along −x, bending about the section y-axis (uses Iyy).
 */
export type BendingPlane = "vertical" | "lateral";

export interface CantileverInput {
  /** Beam length L [m]. */
  length: number;
  section: SectionShape;
  material: IsotropicMaterial;
  load: {
    /** Tip force magnitude F [N]. */
    magnitude: number;
    plane: BendingPlane;
  };
}

export interface CantileverResult {
  input: CantileverInput;
  section: SectionProperties;
  /** Governing second moment of area for the loaded plane [m⁴]. */
  I: number;
  /** Extreme-fibre distance in the loaded plane [m]. */
  c: number;
  /** Section depth in the loaded plane [m]. */
  depth: number;
  /** Axial stiffness EA [N]. */
  EA: number;
  /** Flexural stiffness EI [N·m²]. */
  EI: number;
  /** Beam mass m = ρAL [kg]. */
  mass: number;
  /** Tip stiffness k = 3EI/L³ [N/m]. */
  tipStiffness: number;
  /** Tip deflection δ = FL³/(3EI) [m]. */
  tipDeflection: number;
  /** Tip rotation θ = FL²/(2EI) [rad]. */
  tipRotation: number;
  /** Root bending moment M = FL [N·m]. */
  rootMoment: number;
  /** Root shear force V = F [N]. */
  rootShear: number;
  /** Maximum bending stress σ = Mc/I at the root extreme fibre [Pa]. */
  maxBendingStress: number;
  /** σ_max / reference strength [–]. */
  stressRatio: number;
  /** Tip deflection / length [–]. */
  deflectionRatio: number;
  /** Length / depth in the loaded plane [–]. */
  slenderness: number;
  /**
   * Estimated shear deflection as a fraction of bending deflection,
   * δ_s/δ_b = 3EI / (κ G A L²) with isotropic G = E/(2(1+ν)).
   * This quantifies the term Euler–Bernoulli theory neglects.
   */
  shearDeflectionRatio: number;
}

export function governingBending(
  section: SectionProperties,
  plane: BendingPlane,
): { I: number; c: number; depth: number } {
  return plane === "vertical"
    ? { I: section.Ixx, c: section.cx, depth: section.depthY }
    : { I: section.Iyy, c: section.cy, depth: section.depthX };
}

export function solveCantilever(input: CantileverInput): CantileverResult {
  const L = input.length;
  const F = input.load.magnitude;
  const { E, rho, nu, strength } = input.material;
  const section = sectionProperties(input.section);
  const { I, c, depth } = governingBending(section, input.load.plane);

  const EI = E * I;
  const EA = E * section.area;
  const tipStiffness = (3 * EI) / L ** 3;
  const tipDeflection = (F * L ** 3) / (3 * EI);
  const rootMoment = F * L;
  const maxBendingStress = (rootMoment * c) / I;
  const G = isotropicShearModulus(E, nu);

  return {
    input,
    section,
    I,
    c,
    depth,
    EA,
    EI,
    mass: rho * section.area * L,
    tipStiffness,
    tipDeflection,
    tipRotation: (F * L ** 2) / (2 * EI),
    rootMoment,
    rootShear: F,
    maxBendingStress,
    stressRatio: maxBendingStress / strength,
    deflectionRatio: tipDeflection / L,
    slenderness: L / depth,
    shearDeflectionRatio: (3 * EI) / (section.kappa * G * section.area * L ** 2),
  };
}

/** Deflection v(z) = F z² (3L − z) / (6EI) [m], magnitude in the load direction. */
export function deflectionAt(r: CantileverResult, z: number): number {
  const L = r.input.length;
  const F = r.input.load.magnitude;
  return (F * z * z * (3 * L - z)) / (6 * r.EI);
}

/** Slope dv/dz = F z (2L − z) / (2EI) [rad]. */
export function slopeAt(r: CantileverResult, z: number): number {
  const L = r.input.length;
  const F = r.input.load.magnitude;
  return (F * z * (2 * L - z)) / (2 * r.EI);
}

/** Bending moment M(z) = F (L − z) [N·m]. */
export function bendingMomentAt(r: CantileverResult, z: number): number {
  return r.input.load.magnitude * (r.input.length - z);
}

/**
 * Bending stress σ_zz(z, η) = M(z) η / I [Pa].
 * η is the distance from the neutral axis measured towards the side opposite
 * the load, so positive stress is tension (the top fibre for a downward load).
 */
export function bendingStressAt(r: CantileverResult, z: number, eta: number): number {
  return (bendingMomentAt(r, z) * eta) / r.I;
}

export interface DeflectionSample {
  z: number;
  v: number;
  slope: number;
}

/** Samples the analytical deflected shape at `stations` evenly spaced points (root and tip included). */
export function sampleDeflection(r: CantileverResult, stations: number): DeflectionSample[] {
  const n = Math.max(2, Math.floor(stations));
  const L = r.input.length;
  const out: DeflectionSample[] = [];
  for (let i = 0; i < n; i++) {
    const z = (L * i) / (n - 1);
    out.push({ z, v: deflectionAt(r, z), slope: slopeAt(r, z) });
  }
  return out;
}
