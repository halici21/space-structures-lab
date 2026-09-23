/**
 * Learn mode: equation + intuition + this model's numbers, for stiffness,
 * deflection and stress — plus a live decomposition of the last edit into
 * its scaling laws. All numbers come from the solver.
 */
import type { ReactNode } from "react";
import { Tex } from "@/components/Tex";
import { formatNumber, formatQuantityText } from "@/core/units";
import { solveCantilever } from "@/lib/structures/cantilever";
import { attributeChange, whatIf, withParameter, type ResponseKey } from "@/lib/structures/sensitivity";
import type { SolvedDocument } from "@/model/document";
import { useLab } from "@/state/store";
import { PARAM_META, RESULT_META } from "../meta";
import { doublingSentence, factorText, powerTex } from "./explain";

export type LearnTopic = "stiffness" | "deflection" | "stress" | "change";

function Topic({ id, title, children, className = "" }: { id: LearnTopic; title: string; children: ReactNode; className?: string }) {
  return (
    <section id={`learn-${id}`} className={"min-w-0 scroll-mt-2 rounded-sm " + className} data-testid={`learn-${id}`}>
      <h3 className="caps mb-2 !text-fg">{title}</h3>
      {children}
    </section>
  );
}

function Eq({ tex }: { tex: string }) {
  return (
    <div className="mb-2 rounded-sm border border-line bg-app/50 px-2 py-1.5">
      <Tex tex={tex} display />
    </div>
  );
}

function Bullet({ lead, children }: { lead: ReactNode; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[46px_minmax(0,1fr)] gap-x-2 py-0.5">
      <span className="text-muted">{lead}</span>
      <span className="text-fg/90">{children}</span>
    </li>
  );
}

export function LearnPanel({ solved, compact = false }: { solved: SolvedDocument; compact?: boolean }) {
  const system = useLab((s) => s.unitSystem);
  const hasEdit = useLab((s) => s.reference !== null);
  const r = solved.result;
  const input = r.input;
  const vertical = input.load.plane === "vertical";
  const deep = vertical ? "h" : "b";
  const q = (v: number, k: Parameters<typeof formatQuantityText>[1]) => formatQuantityText(v, k, system);
  const doubledL = solveCantilever(withParameter(input, "L", input.length * 2));
  const changeTopic = (
    <Topic id="change" title="What just changed" className="col-span-full border-t border-line pt-3">
      <ChangeExplainer solved={solved} />
    </Topic>
  );

  return (
    <div className={compact ? "grid grid-cols-1 gap-y-5 text-[13px] leading-relaxed" : "grid grid-cols-3 gap-x-7 gap-y-5 text-[13px] leading-relaxed max-[1180px]:grid-cols-2 max-[640px]:grid-cols-1"} data-testid="learn-panel">
      {hasEdit && changeTopic}
      <Topic id="stiffness" title="Stiffness">
        <Eq tex="k_{tip} = \dfrac{3\,E\,I}{L^3}" />
        <p className="mb-1.5 text-muted">
          The tip behaves like a spring. This beam: <b className="num text-fg">{q(r.tipStiffness, "tipStiffness")}</b>.
        </p>
        <ul>
          <Bullet lead={<Tex tex="E^{1}" />}>{doublingSentence(input, "E", "tipStiffness")}</Bullet>
          <Bullet lead={<Tex tex={`I^{1}`} />}>
            I = {vertical ? "bh³/12" : "hb³/12"}, so {doublingSentence(input, deep, "tipStiffness").replace("Doubling", "doubling")}
          </Bullet>
          <Bullet lead={<Tex tex="L^{-3}" />}>{doublingSentence(input, "L", "tipStiffness")}</Bullet>
        </ul>
      </Topic>

      <Topic id="deflection" title="Deflection">
        <Eq tex="\delta = \dfrac{F}{k_{tip}} = \dfrac{F L^3}{3 E I}" />
        <p className="mb-1.5 text-muted">
          The load only decides how hard the spring is pushed; geometry and material set how stiff it is.
        </p>
        <p className="mb-1.5" data-testid="learn-doubling">
          {doublingSentence(input, "L", "tipDeflection")}{" "}
          <span className="num text-muted">
            ({q(r.tipDeflection, "displacement")} → {q(doubledL.tipDeflection, "displacement")})
          </span>
        </p>
        <p className="text-muted">
          Shape: <Tex tex="v(z) = \dfrac{F z^2 (3L - z)}{6EI}" />. Curvature is largest at the root, where the moment is largest,
          and falls to zero at the free end.
        </p>
      </Topic>

      <Topic id="stress" title="Stress">
        <Eq tex={vertical ? "\\sigma_{max} = \\dfrac{M c}{I} = \\dfrac{6 F L}{b h^2}" : "\\sigma_{max} = \\dfrac{M c}{I} = \\dfrac{6 F L}{h b^2}"} />
        <p className="mb-1.5 text-muted">
          Stress depends on {deep}², deflection on {deep}³ — so a deeper section gains stiffness faster than strength.
        </p>
        <p className="num mb-1.5">
          Doubling {deep}: δ {factorText(whatIf(input, deep, 2, "tipDeflection"))}, σ {factorText(whatIf(input, deep, 2, "maxBendingStress"))}, m{" "}
          {factorText(whatIf(input, deep, 2, "mass"))}.
        </p>
        <p className="text-muted">
          This beam: σ = <b className="num text-fg">{q(r.maxBendingStress, "stress")}</b>, {formatNumber(r.stressRatio, 3)}× its strength.
          E does not appear — equilibrium alone fixes the moment.
        </p>
      </Topic>

      {!hasEdit && changeTopic}
    </div>
  );
}

const SHOWN: ResponseKey[] = ["tipDeflection", "maxBendingStress", "mass"];

export function ChangeExplainer({ solved }: { solved: SolvedDocument }) {
  const reference = useLab((s) => s.reference);
  const system = useLab((s) => s.unitSystem);
  const now = solved.result.input;

  if (!reference) {
    return (
      <p className="text-muted" data-testid="change-empty">
        Edit any parameter. This panel splits the change in each result into the scaling laws that produced it.
      </p>
    );
  }
  const d = attributeChange(reference.input, now, "tipDeflection");
  if (d.planeChanged) {
    const before = solveCantilever(reference.input);
    return (
      <p className="text-muted">
        Load direction changed, so the governing second moment switched ({factorText(solved.result.I / before.I)} in I, δ{" "}
        {factorText(solved.result.tipDeflection / before.tipDeflection)}).
      </p>
    );
  }
  if (d.factors.length === 0) {
    return <p className="text-muted">No change to the stiffness-relevant parameters since the last edit began.</p>;
  }

  return (
    <div data-testid="change-explainer">
      <ul className="num mb-2 space-y-0.5">
        {d.factors.map((f) => (
          <li key={f.param} className="text-fg">
            {PARAM_META[f.param].label}: {formatQuantityText(f.before, PARAM_META[f.param].kind, system)} →{" "}
            {formatQuantityText(f.after, PARAM_META[f.param].kind, system)}{" "}
            <span className="text-muted">({factorText(f.ratio)})</span>
          </li>
        ))}
      </ul>
      <table className="num w-full text-[12.5px]">
        <thead>
          <tr className="text-left text-faint">
            <th className="pb-1 font-normal">Result</th>
            <th className="pb-1 font-normal">Scaling law</th>
            <th className="pb-1 text-right font-normal">Predicted</th>
            <th className="pb-1 text-right font-normal">Solver</th>
          </tr>
        </thead>
        <tbody>
          {SHOWN.map((key) => {
            const a = attributeChange(reference.input, now, key);
            const law = a.factors.map((f) => `${PARAM_META[f.param].symbol}${powerTex(f.exponent) || "^{1}"}`).join("\\,");
            const match = Number.isFinite(a.observedRatio) && Math.abs(a.predictedRatio / a.observedRatio - 1) < 1e-6;
            return (
              <tr key={key} className="border-t border-line">
                <td className="py-1 text-muted">
                  <Tex tex={RESULT_META[key].symbol} />
                </td>
                <td className="py-1">{law ? <Tex tex={`\\propto ${law}`} /> : <span className="text-faint">unchanged</span>}</td>
                <td className="py-1 text-right">{factorText(a.predictedRatio)}</td>
                <td className="py-1 text-right">
                  {factorText(a.observedRatio)} {match && <span className="text-ok" aria-label="matches">✓</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
