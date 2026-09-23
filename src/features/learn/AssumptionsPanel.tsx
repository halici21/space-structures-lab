/**
 * Euler–Bernoulli assumption disclosure, each checked live where it can be
 * quantified. Thresholds are defined (and sourced) in lib/structures/validity.
 */
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { formatNumber } from "@/core/units";
import { getPreset } from "@/lib/structures/materials";
import type { AssumptionCheck, AssumptionId, CheckStatus } from "@/lib/structures/validity";
import type { SolvedDocument } from "@/model/document";

const ICON: Record<CheckStatus, ReactNode> = {
  ok: <CheckCircle2 size={15} className="text-ok" aria-label="Satisfied" />,
  caution: <AlertTriangle size={15} className="text-caution" aria-label="Near limit" />,
  violated: <XCircle size={15} className="text-violated" aria-label="Violated" />,
  info: <Info size={15} className="text-info" aria-label="Hypothesis" />,
};

const pct = (v: number) => `${formatNumber(100 * v, 3)}%`;

function describe(c: AssumptionCheck, s: SolvedDocument): { title: string; value: ReactNode; why: string } {
  const r = s.result;
  const depth = r.input.load.plane === "vertical" ? "h" : "b";
  const material = getPreset(s.resolved.material.presetId);
  const texts: Record<AssumptionId, () => { title: string; value: ReactNode; why: string }> = {
    slender: () => ({
      title: "Slender beam",
      value: `L/${depth} = ${formatNumber(r.slenderness, 3)}`,
      why: "Beam theory ignores through-thickness effects. It is the usual choice from about L/depth ≥ 10.",
    }),
    "linear-elastic": () => ({
      title: "Linear elastic material",
      value: `σ/σ_ref = ${formatNumber(r.stressRatio, 3)}`,
      why: "E only applies below yield. Above it the material yields and σ = Mc/I no longer holds. Caution from 2/3 of strength.",
    }),
    "small-deformation": () => ({
      title: "Small deformation",
      value: `δ/L = ${pct(r.deflectionRatio)}`,
      why: "Linear theory is within 1% of the exact large-deflection (elastica) result up to δ/L = 10%, 4% at 20%, 22% at 50%.",
    }),
    "plane-sections": () => ({
      title: "Plane sections remain plane",
      value: "kinematic hypothesis",
      why: "Cross-sections rotate rigidly and stay normal to the deflected axis. It holds well for slender, solid sections.",
    }),
    "shear-neglected": () => ({
      title: "Shear deformation neglected",
      value: `δ_shear/δ_bend ≈ ${pct(r.shearDeflectionRatio)}`,
      why: "Timoshenko estimate, 3EI/(κGAL²) with κ = 5/6 and G = E/2(1+ν). Ok below 2%, caution to 10%.",
    }),
    isotropic: () => ({
      title: "Isotropic equivalent material",
      value: material?.simplified ? "scalar-E idealisation" : material ? material.shortName : "custom values",
      why: material?.simplified
        ? "A single E stands in for a laminate. Ply stacking, anisotropy and the low transverse shear modulus are not modelled."
        : "One E, ρ and ν describe the material in every direction.",
    }),
    "no-lateral-buckling": () => ({
      title: "No lateral–torsional buckling",
      value:
        c.status === "caution"
          ? `strong-axis bending, I ratio ${formatNumber(c.metric ?? 0, 3)}`
          : "weak-axis or compact section",
      why:
        "A narrow section bent about its strong axis can twist and buckle sideways below yield. " +
        "Not checked here; buckling analysis is roadmap M4.",
    }),
    "static-load": () => ({
      title: "Static tip load",
      value: "applied slowly, no inertia",
      why: "Dynamic or oscillating loads need modal and forced-response analysis (roadmap M2–M3).",
    }),
  };
  return texts[c.id]();
}

export function AssumptionsPanel({ solved, compact = false }: { solved: SolvedDocument; compact?: boolean }) {
  if (compact) {
    return (
      <div data-testid="assumptions-panel">
        <h3 className="caps mb-1 !text-fg">Euler–Bernoulli assumptions</h3>
        <p className="mb-2 text-[12px] text-faint">Checked live against the current model</p>
        {solved.checks.map((c) => {
          const d = describe(c, solved);
          return (
            <section key={c.id} className="border-t border-line py-2.5 text-[12.5px] leading-snug" data-testid={`assumption-${c.id}`} data-status={c.status}>
              <div className="mb-1 flex items-center gap-2">
                {ICON[c.status]}
                <strong className="font-medium text-fg">{d.title}</strong>
                <span className="num ml-auto text-right text-muted">{d.value}</span>
              </div>
              <p className="pl-[23px] text-muted">{d.why}</p>
            </section>
          );
        })}
      </div>
    );
  }
  return (
    <div data-testid="assumptions-panel">
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="caps !text-fg">Euler–Bernoulli beam · model assumptions</h3>
        <span className="text-[12px] text-faint">checked live against the current model</span>
      </div>
      <table className="w-full text-[13px]">
        <thead className="text-left text-[12px] text-faint">
          <tr>
            <th className="w-6 pb-1 font-normal" />
            <th className="pb-1 font-normal">Assumption</th>
            <th className="pb-1 font-normal">This model</th>
            <th className="pb-1 font-normal max-[900px]:hidden">Why it matters</th>
          </tr>
        </thead>
        <tbody>
          {solved.checks.map((c) => {
            const d = describe(c, solved);
            return (
              <tr key={c.id} className="border-t border-line align-top" data-testid={`assumption-${c.id}`} data-status={c.status}>
                <td className="py-1.5">{ICON[c.status]}</td>
                <td className="py-1.5 pr-3 text-fg">{d.title}</td>
                <td className={"num py-1.5 pr-3 " + (c.status === "violated" ? "text-violated" : c.status === "caution" ? "text-caution" : "text-muted")}>
                  {d.value}
                </td>
                <td className="py-1.5 text-muted max-[900px]:hidden">{d.why}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
