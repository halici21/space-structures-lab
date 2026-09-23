/**
 * Explanation text generated from the live model. Pure functions — no React —
 * so every sentence the UI shows can be unit-tested against the solver.
 */
import { formatNumber } from "@/core/units";
import type { CantileverInput } from "@/lib/structures/cantilever";
import { cleanExponent, elasticity, type DriverRank, type ResponseKey } from "@/lib/structures/sensitivity";
import type { ParameterKey } from "@/lib/structures/validation";
import { PARAM_META, RESULT_META } from "../meta";

/** TeX for a power: e = 1 → "", e = 3 → "^{3}", e = -1 → "^{-1}". */
export function powerTex(e: number): string {
  if (e === 1) return "";
  const s = Number.isInteger(e) ? String(e) : formatNumber(e, 3);
  return `^{${s}}`;
}

/** "×8" for growth, "÷8" for reduction, "×1" (unchanged) within rounding. */
export function factorText(ratio: number): string {
  if (!Number.isFinite(ratio)) return "—";
  if (Math.abs(ratio - 1) < 5e-4) return "×1";
  return ratio >= 1 ? `×${formatNumber(ratio, 3)}` : `÷${formatNumber(1 / ratio, 3)}`;
}

/** e.g. "\delta \propto F\,L^{3}\,E^{-1}\,b^{-1}\,h^{-3}", built from measured exponents. */
export function proportionalityTex(response: ResponseKey, drivers: readonly DriverRank[]): string {
  const order: ParameterKey[] = ["F", "L", "E", "rho", "b", "h"];
  const terms = [...drivers]
    .sort((a, b) => order.indexOf(a.param) - order.indexOf(b.param))
    .map((d) => `${PARAM_META[d.param].symbol}${powerTex(d.exponent)}`);
  return `${RESULT_META[response].symbol} \\propto ${terms.join("\\,")}`;
}

export function exponentOf(input: CantileverInput, param: ParameterKey, response: ResponseKey): number {
  return cleanExponent(elasticity(input, param, response));
}

/**
 * "Doubling this beam's length increases tip deflection by 8×."
 * The factor is 2^e with e measured from the solver.
 */
export function doublingSentence(
  input: CantileverInput,
  param: ParameterKey,
  response: ResponseKey,
): string {
  const e = exponentOf(input, param, response);
  const p = PARAM_META[param].noun;
  const r = RESULT_META[response].noun;
  if (!Number.isFinite(e)) return `The ${r} is zero here, so its sensitivity to ${p} is undefined.`;
  if (e === 0) return `Doubling this beam's ${p} leaves its ${r} unchanged.`;
  const f = 2 ** e;
  return e > 0
    ? `Doubling this beam's ${p} increases its ${r} by ${formatNumber(f, 3)}×.`
    : `Doubling this beam's ${p} divides its ${r} by ${formatNumber(1 / f, 3)}.`;
}

/**
 * Length at which the tip deflection is `target` × L (δ/L = F L² / 3EI),
 * rounded down to two significant figures so the suggestion lands inside it.
 */
export function lengthForDeflectionRatio(input: CantileverInput, EI: number, target = 0.1): number {
  const F = input.load.magnitude;
  if (!(F > 0)) return Number.NaN;
  const L = Math.sqrt((target * 3 * EI) / F);
  const e = Math.floor(Math.log10(L)) - 1;
  return Math.floor(L / 10 ** e) * 10 ** e;
}
