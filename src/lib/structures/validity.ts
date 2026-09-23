/**
 * Live checks of the Euler–Bernoulli model's own assumptions.
 *
 * Every numeric threshold here is documented, with its source, in
 * docs/STRUCTURAL_MODEL_ASSUMPTIONS.md. The small-deflection bands come from
 * an exact elastica solution of the tip-loaded cantilever:
 *   δ/L = 0.10 → linear theory overpredicts by 1.0 %
 *   δ/L = 0.20 → 4.0 %,   δ/L = 0.50 → 21.7 %.
 */
import type { CantileverResult } from "./cantilever";

export type CheckStatus = "ok" | "caution" | "violated" | "info";

export type AssumptionId =
  | "slender"
  | "linear-elastic"
  | "small-deformation"
  | "plane-sections"
  | "shear-neglected"
  | "isotropic"
  | "static-load"
  | "no-lateral-buckling";

export interface AssumptionCheck {
  id: AssumptionId;
  status: CheckStatus;
  /** The quantity the status is judged on, when there is one. */
  metric?: number;
}

export const THRESHOLDS = {
  /** δ/L: ok up to 10 % (≤1 % error vs elastica), caution up to 20 % (≤4 %). */
  deflectionRatio: { ok: 0.1, caution: 0.2 },
  /** σ/σ_ref: caution from 2/3 of the reference strength, violated at or above it. */
  stressRatio: { ok: 2 / 3, caution: 1 },
  /** L/depth: Euler–Bernoulli is the conventional choice from about 10 upwards. */
  slenderness: { ok: 10, caution: 5 },
  /** δ_shear/δ_bending: neglecting shear costs ≤2 % (ok) or ≤10 % (caution). */
  shearDeflectionRatio: { ok: 0.02, caution: 0.1 },
  /**
   * I_governing / I_other at or above which the beam is being bent about the
   * strong axis of a narrow section (depth/thickness ≥ 2 for a rectangle):
   * lateral–torsional buckling becomes possible and is not checked in M1.
   */
  strongAxisRatio: 4,
} as const;

function upper(value: number, t: { ok: number; caution: number }): CheckStatus {
  if (value <= t.ok) return "ok";
  return value <= t.caution ? "caution" : "violated";
}

export function assumptionChecks(
  r: CantileverResult,
  opts: { simplifiedMaterial: boolean },
): AssumptionCheck[] {
  const stress = r.stressRatio;
  const slender = r.slenderness;
  const otherI = r.input.load.plane === "vertical" ? r.section.Iyy : r.section.Ixx;
  const axisRatio = r.I / otherI;
  return [
    {
      id: "slender",
      status:
        slender >= THRESHOLDS.slenderness.ok
          ? "ok"
          : slender >= THRESHOLDS.slenderness.caution
            ? "caution"
            : "violated",
      metric: slender,
    },
    {
      id: "linear-elastic",
      status:
        stress < THRESHOLDS.stressRatio.ok
          ? "ok"
          : stress < THRESHOLDS.stressRatio.caution
            ? "caution"
            : "violated",
      metric: stress,
    },
    {
      id: "small-deformation",
      status: upper(r.deflectionRatio, THRESHOLDS.deflectionRatio),
      metric: r.deflectionRatio,
    },
    { id: "plane-sections", status: "info" },
    {
      id: "shear-neglected",
      status: upper(r.shearDeflectionRatio, THRESHOLDS.shearDeflectionRatio),
      metric: r.shearDeflectionRatio,
    },
    { id: "isotropic", status: opts.simplifiedMaterial ? "caution" : "ok" },
    { id: "static-load", status: "ok" },
    {
      id: "no-lateral-buckling",
      status: axisRatio >= THRESHOLDS.strongAxisRatio ? "caution" : "ok",
      metric: axisRatio,
    },
  ];
}

const RANK: Record<CheckStatus, number> = { info: 0, ok: 1, caution: 2, violated: 3 };

export function worstStatus(checks: readonly AssumptionCheck[]): CheckStatus {
  return checks.reduce<CheckStatus>(
    (worst, c) => (RANK[c.status] > RANK[worst] ? c.status : worst),
    "ok",
  );
}
