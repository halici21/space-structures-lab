/**
 * "Why?" explanations. Each one is equation + measured scaling + the current
 * model's numbers. Driver exponents and what-if percentages come from the
 * solver (sensitivity.ts), so the text cannot drift from the physics.
 */
import * as Popover from "@radix-ui/react-popover";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Tex } from "@/components/Tex";
import { formatNumber, formatQuantityText } from "@/core/units";
import { rankDrivers, whatIf, type ResponseKey } from "@/lib/structures/sensitivity";
import type { SolvedDocument } from "@/model/document";
import { useLab } from "@/state/store";
import { proportionalityTex, powerTex } from "../learn/explain";
import { PARAM_META, RESULT_META } from "../meta";

export type WhyKey = Extract<ResponseKey, "tipDeflection" | "maxBendingStress" | "rootMoment" | "mass" | "tipStiffness" | "EI">;

export function WhyButton({ which, solved, size = "sm" }: { which: WhyKey; solved: SolvedDocument; size?: "sm" | "md" }) {
  const markOnboarding = useLab((s) => s.markOnboarding);
  return (
    <Popover.Root onOpenChange={(open) => open && markOnboarding("whyOpened")}>
      <Popover.Trigger asChild>
        <button
          className={
            "grid shrink-0 cursor-pointer place-items-center rounded-full border border-line-strong text-[11.5px] font-semibold text-muted transition-colors hover:border-accent hover:text-accent-text data-[state=open]:border-accent data-[state=open]:bg-accent-weak data-[state=open]:text-accent-text " +
            (size === "sm" ? "h-5 w-5" : "h-[22px] w-[22px]")
          }
          aria-label={`Why? Explain ${RESULT_META[which].noun}`}
          data-why={which}
        >
          ?
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="pop w-[380px] max-w-[calc(100vw-24px)] p-0"
          side="top"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          data-testid={`why-${which}`}
        >
          <WhyContent which={which} solved={solved} />
          <Popover.Close className="icon-btn absolute top-1.5 right-1.5 h-6 w-6" aria-label="Close explanation">
            <X size={14} />
          </Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function titleFor(which: WhyKey, s: SolvedDocument): string {
  const r = s.result;
  switch (which) {
    case "tipDeflection":
      return r.deflectionRatio > 0.1
        ? "Why is the tip deflection this large?"
        : r.deflectionRatio < 1e-3
          ? "Why is the tip deflection this small?"
          : "What sets the tip deflection?";
    case "maxBendingStress":
      return r.stressRatio >= 1 ? "Why is the stress above the material's strength?" : "What sets the maximum stress?";
    case "rootMoment":
      return "Where does the root moment come from?";
    case "mass":
      return "What sets the mass?";
    case "tipStiffness":
      return "What sets the tip stiffness?";
    case "EI":
      return "What sets the flexural stiffness?";
  }
}

function equationFor(which: WhyKey, vertical: boolean): string[] {
  const I = vertical ? "I_{xx} = \\dfrac{b\\,h^3}{12}" : "I_{yy} = \\dfrac{h\\,b^3}{12}";
  switch (which) {
    case "tipDeflection":
      return ["\\delta = \\dfrac{F L^3}{3 E I}", I];
    case "maxBendingStress":
      return [
        vertical
          ? "\\sigma_{max} = \\dfrac{M_{max}\\, c}{I} = \\dfrac{6 F L}{b\\,h^2}"
          : "\\sigma_{max} = \\dfrac{M_{max}\\, c}{I} = \\dfrac{6 F L}{h\\,b^2}",
      ];
    case "rootMoment":
      return ["M_{max} = F\\,L"];
    case "mass":
      return ["m = \\rho A L = \\rho\\, b\\, h\\, L"];
    case "tipStiffness":
      return ["k_{tip} = \\dfrac{3 E I}{L^3}", I];
    case "EI":
      return [vertical ? "EI = E\\,\\dfrac{b\\,h^3}{12}" : "EI = E\\,\\dfrac{h\\,b^3}{12}"];
  }
}

function insightFor(which: WhyKey, s: SolvedDocument): ReactNode {
  const vertical = s.result.input.load.plane === "vertical";
  const deep = vertical ? "h" : "b";
  switch (which) {
    case "tipDeflection":
      return (
        <>
          L appears three times: once in the moment arm (M = F·L), then twice more because curvature M/EI is integrated along
          the length into rotation, and rotation again into displacement. Depth {deep} is cubed through I.
        </>
      );
    case "maxBendingStress":
      return (
        <>
          E does not appear: a cantilever is statically determinate, so the moment — and therefore the stress — follows from
          equilibrium alone. Depth enters squared (not cubed), so thickening helps stiffness more than strength.
        </>
      );
    case "rootMoment":
      return <>The support must balance the tip force F acting at lever arm L. Nothing about the material or section matters.</>;
    case "mass":
      return (
        <>
          Mass grows linearly with {deep} while stiffness grows with {deep}³ — deepening a section is the most mass-efficient way to
          gain bending stiffness.
        </>
      );
    case "tipStiffness":
      return <>The beam behaves as a spring k = 3EI/L³ at its tip. Deflection is just δ = F/k.</>;
    case "EI":
      return <>EI is the section's resistance to curvature: material stiffness E times geometric stiffness I. It is independent of L and F.</>;
  }
}

function contextFor(which: WhyKey, s: SolvedDocument, system: ReturnType<typeof useLab.getState>["unitSystem"]): ReactNode {
  const r = s.result;
  const f = (v: number, k: Parameters<typeof formatQuantityText>[1]) => formatQuantityText(v, k, system);
  switch (which) {
    case "tipDeflection":
      return (
        <>
          F = {f(r.input.load.magnitude, "force")}, L = {f(r.input.length, "span")}, EI = {f(r.EI, "flexuralStiffness")} → δ ={" "}
          <b className="text-fg">{f(r.tipDeflection, "displacement")}</b>, i.e. δ/L = {formatNumber(100 * r.deflectionRatio, 3)}%.
          {r.deflectionRatio > 0.2 && (
            <span className="text-violated"> Far beyond small-deflection theory (δ/L ≲ 10%): the true deflection is smaller than this.</span>
          )}
        </>
      );
    case "maxBendingStress":
      return (
        <>
          M = {f(r.rootMoment, "moment")}, c = {f(r.c, "sectionDim")} → σ = <b className="text-fg">{f(r.maxBendingStress, "stress")}</b>
          , which is {formatNumber(r.stressRatio, 3)}× the material strength ({f(r.input.material.strength, "stress")}).
          {r.stressRatio >= 1 && <span className="text-violated"> The beam would yield; linear elasticity no longer holds.</span>}
        </>
      );
    case "rootMoment":
      return (
        <>
          {f(r.input.load.magnitude, "force")} × {f(r.input.length, "span")} = <b className="text-fg">{f(r.rootMoment, "moment")}</b>.
        </>
      );
    case "mass":
      return (
        <>
          ρ = {f(r.input.material.rho, "density")}, A = {f(r.section.area, "area")}, L = {f(r.input.length, "span")} →{" "}
          <b className="text-fg">{f(r.mass, "mass")}</b>.
        </>
      );
    case "tipStiffness":
      return (
        <>
          EI = {f(r.EI, "flexuralStiffness")}, L = {f(r.input.length, "span")} → k = <b className="text-fg">{f(r.tipStiffness, "tipStiffness")}</b>.
        </>
      );
    case "EI":
      return (
        <>
          E = {f(r.input.material.E, "modulus")}, I = {f(r.I, "inertia")} → EI = <b className="text-fg">{f(r.EI, "flexuralStiffness")}</b>.
        </>
      );
  }
}

const pct = (ratio: number) => {
  const p = (ratio - 1) * 100;
  return `${p >= 0 ? "+" : "−"}${formatNumber(Math.abs(p), 3)}%`;
};

function WhyContent({ which, solved }: { which: WhyKey; solved: SolvedDocument }) {
  const system = useLab((s) => s.unitSystem);
  const input = solved.result.input;
  const vertical = input.load.plane === "vertical";
  const drivers = rankDrivers(input, which);

  return (
    <div className="max-h-[55vh] overflow-y-auto" tabIndex={0} aria-label="Explanation details">
      <div className="border-b border-line px-3.5 pt-3 pb-2.5 pr-9">
        <p className="caps mb-1">Why?</p>
        <h3 className="text-[15px] font-semibold text-fg">{titleFor(which, solved)}</h3>
      </div>
      <div className="space-y-1 border-b border-line bg-app/40 px-3.5 py-2.5">
        {equationFor(which, vertical).map((t) => (
          <Tex key={t} tex={t} display />
        ))}
      </div>
      {drivers.length > 0 && (
        <div className="border-b border-line px-3.5 py-2.5">
          <p className="caps mb-1">Main drivers</p>
          <div className="mb-2 text-muted">
            <Tex tex={proportionalityTex(which, drivers)} />
          </div>
          <table className="num w-full text-[12.5px]">
            <thead>
              <tr className="text-[11.5px] text-faint">
                <th className="w-4 pb-0.5 text-left font-normal" />
                <th className="pb-0.5 text-left font-normal">Parameter</th>
                <th className="pb-0.5 text-left font-normal">Power</th>
                <th className="pb-0.5 text-right font-normal">+10%</th>
                <th className="pb-0.5 text-right font-normal">×2</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d, i) => (
                <tr key={d.param} className="border-t border-line/60">
                  <td className="py-0.5 text-faint">{i + 1}.</td>
                  <td className="py-0.5 text-fg">{PARAM_META[d.param].label}</td>
                  <td className="py-0.5 text-muted">
                    <Tex tex={`${PARAM_META[d.param].symbol}${powerTex(d.exponent) || "^{1}"}`} />
                  </td>
                  <td className="py-0.5 text-right text-fg">{pct(whatIf(input, d.param, 1.1, which))}</td>
                  <td className="py-0.5 text-right text-fg">×{formatNumber(whatIf(input, d.param, 2, which), 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {which === "tipDeflection" && (
            <p className="mt-2 text-[12.5px] text-muted">
              For a rectangle <Tex tex={vertical ? "I \\propto h^3" : "I \\propto b^3"} />, therefore{" "}
              <Tex tex={vertical ? "\\delta \\propto 1/h^3" : "\\delta \\propto 1/b^3"} />.
            </p>
          )}
        </div>
      )}
      <div className="space-y-2 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-muted">
        <p>{insightFor(which, solved)}</p>
        <p className="num">{contextFor(which, solved, system)}</p>
      </div>
    </div>
  );
}
