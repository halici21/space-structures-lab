/**
 * Parameter sensitivity, derived numerically from the solver.
 *
 * Exponents are never hard-coded: the elasticity e = ∂ln R / ∂ln p is measured
 * by a central difference in log space. For the power-law cantilever formulas
 * this is exact to rounding (δ ∝ L³ gives e = 3.000000…), and for future
 * non-power-law models it becomes the correct local sensitivity.
 */
import { solveCantilever, type CantileverInput, type CantileverResult } from "./cantilever";
import { parametersOf, type ParameterKey } from "./validation";

export type ResponseKey =
  | "tipDeflection"
  | "maxBendingStress"
  | "tipStiffness"
  | "rootMoment"
  | "mass"
  | "EI";

export function responseOf(result: CantileverResult, key: ResponseKey): number {
  return result[key];
}

/** Returns a copy of `input` with one parameter replaced (SI value). */
export function withParameter(
  input: CantileverInput,
  key: ParameterKey,
  value: number,
): CantileverInput {
  switch (key) {
    case "L":
      return { ...input, length: value };
    case "b":
    case "h":
      return { ...input, section: { ...input.section, [key]: value } };
    case "E":
    case "rho":
    case "nu":
    case "strength":
      return { ...input, material: { ...input.material, [key]: value } };
    case "F":
      return { ...input, load: { ...input.load, magnitude: value } };
  }
}

export function parameterValue(input: CantileverInput, key: ParameterKey): number {
  return parametersOf(input)[key];
}

/**
 * Local elasticity ∂ln R/∂ln p. Returns NaN when R or p is not positive at the
 * evaluation point (log sensitivity is undefined there).
 */
export function elasticity(
  input: CantileverInput,
  param: ParameterKey,
  response: ResponseKey,
  relStep = 1e-4,
): number {
  const p = parameterValue(input, param);
  const r0 = responseOf(solveCantilever(input), response);
  if (!(p > 0) || !(r0 > 0)) return Number.NaN;
  const up = responseOf(solveCantilever(withParameter(input, param, p * (1 + relStep))), response);
  const dn = responseOf(solveCantilever(withParameter(input, param, p * (1 - relStep))), response);
  const e = (Math.log(up) - Math.log(dn)) / (Math.log(1 + relStep) - Math.log(1 - relStep));
  return Math.abs(e) < 1e-9 ? 0 : e;
}

/** Rounds an elasticity to an integer or half-integer when it is one to within rounding. */
export function cleanExponent(e: number): number {
  const half = Math.round(e * 2) / 2;
  return Math.abs(e - half) < 1e-6 ? half : e;
}

/** Response ratio when one parameter is multiplied by `factor`. */
export function whatIf(
  input: CantileverInput,
  param: ParameterKey,
  factor: number,
  response: ResponseKey,
): number {
  const base = responseOf(solveCantilever(input), response);
  const next = responseOf(
    solveCantilever(withParameter(input, param, parameterValue(input, param) * factor)),
    response,
  );
  return next / base;
}

export interface SweepPoint {
  x: number;
  y: number;
}

/** Sweeps one parameter over [minFactor, maxFactor] × current value, log-spaced. */
export function sweep(
  input: CantileverInput,
  param: ParameterKey,
  response: ResponseKey,
  { minFactor = 0.5, maxFactor = 2, points = 61 } = {},
): SweepPoint[] {
  const p0 = parameterValue(input, param);
  const lo = Math.log(p0 * minFactor);
  const hi = Math.log(p0 * maxFactor);
  const out: SweepPoint[] = [];
  for (let i = 0; i < points; i++) {
    const x = Math.exp(lo + ((hi - lo) * i) / (points - 1));
    out.push({ x, y: responseOf(solveCantilever(withParameter(input, param, x)), response) });
  }
  return out;
}

export interface DriverRank {
  param: ParameterKey;
  exponent: number;
}

const DRIVER_ORDER: ParameterKey[] = ["L", "h", "b", "E", "F", "rho"];

/** Parameters that drive `response`, ranked by |exponent| (ties keep a stable physical order). */
export function rankDrivers(input: CantileverInput, response: ResponseKey): DriverRank[] {
  return DRIVER_ORDER.map((param) => ({
    param,
    exponent: cleanExponent(elasticity(input, param, response)),
  }))
    .filter((d) => Number.isFinite(d.exponent) && d.exponent !== 0)
    .sort((a, b) => Math.abs(b.exponent) - Math.abs(a.exponent));
}

export interface ChangeFactor {
  param: ParameterKey;
  before: number;
  after: number;
  /** after / before */
  ratio: number;
  exponent: number;
  /** ratio ^ exponent — this parameter's share of the response change. */
  contribution: number;
}

export interface ChangeAttribution {
  response: ResponseKey;
  before: number;
  after: number;
  /** after / before, or NaN when before is 0. */
  observedRatio: number;
  /** Π contribution — equals observedRatio for power-law responses. */
  predictedRatio: number;
  factors: ChangeFactor[];
  /** The load plane changed, which is not a continuous parameter. */
  planeChanged: boolean;
}

const ATTRIBUTABLE: ParameterKey[] = ["F", "L", "b", "h", "E", "rho"];

/**
 * Splits the change in a response between two inputs into per-parameter
 * factors. Exact for power-law responses because the exponents are constant.
 */
export function attributeChange(
  before: CantileverInput,
  after: CantileverInput,
  response: ResponseKey,
): ChangeAttribution {
  const r0 = responseOf(solveCantilever(before), response);
  const r1 = responseOf(solveCantilever(after), response);
  const p0 = parametersOf(before);
  const p1 = parametersOf(after);
  const planeChanged = before.load.plane !== after.load.plane;

  const factors: ChangeFactor[] = [];
  for (const param of ATTRIBUTABLE) {
    const ratio = p1[param] / p0[param];
    if (!Number.isFinite(ratio) || Math.abs(ratio - 1) < 1e-12) continue;
    let e = elasticity(before, param, response);
    if (!Number.isFinite(e)) e = elasticity(after, param, response);
    if (!Number.isFinite(e)) continue;
    e = cleanExponent(e);
    if (e === 0) continue;
    factors.push({
      param,
      before: p0[param],
      after: p1[param],
      ratio,
      exponent: e,
      contribution: ratio ** e,
    });
  }

  return {
    response,
    before: r0,
    after: r1,
    observedRatio: r0 > 0 ? r1 / r0 : Number.NaN,
    predictedRatio: factors.reduce((acc, f) => acc * f.contribution, 1),
    factors,
    planeChanged,
  };
}
