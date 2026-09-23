/**
 * One-parameter sensitivity: sweep a parameter over 0.5×–2× its current value
 * and plot a response. Every point is a full solve; the stated exponent is the
 * measured log–log slope, not a lookup.
 */
import { useMemo } from "react";
import { Segmented } from "@/components/Segmented";
import { Tex } from "@/components/Tex";
import { formatNumber, toDisplay, unitFor } from "@/core/units";
import { parameterValue, sweep, whatIf, type ResponseKey } from "@/lib/structures/sensitivity";
import type { SolvedDocument } from "@/model/document";
import { useLab, type SweepParam } from "@/state/store";
import { exponentOf, powerTex } from "../learn/explain";
import { PARAM_META, RESULT_META } from "../meta";
import { LineChart } from "./LineChart";

const PARAMS: SweepParam[] = ["L", "h", "b", "E", "F"];
const RESPONSES: { value: Exclude<ResponseKey, "EI" | "rootMoment">; label: string }[] = [
  { value: "tipDeflection", label: "Tip deflection δ" },
  { value: "maxBendingStress", label: "Max stress σ" },
  { value: "tipStiffness", label: "Tip stiffness k" },
  { value: "mass", label: "Mass m" },
];

const signedPct = (r: number) => {
  const p = (r - 1) * 100;
  return `${p >= 0 ? "+" : "−"}${formatNumber(Math.abs(p), 3)}%`;
};

export function SensitivityPanel({ solved }: { solved: SolvedDocument }) {
  const { param, response, logScale } = useLab((s) => s.sensitivity);
  const setSensitivity = useLab((s) => s.setSensitivity);
  const setParameter = useLab((s) => s.setParameter);
  const system = useLab((s) => s.unitSystem);
  const input = solved.result.input;

  const pmeta = PARAM_META[param];
  const rmeta = RESULT_META[response];
  const xu = unitFor(pmeta.kind, system);
  const yu = unitFor(rmeta.kind, system);

  const points = useMemo(() => sweep(input, param, response, { points: 81 }), [input, param, response]);
  const e = exponentOf(input, param, response);
  const current = { x: parameterValue(input, param), y: solved.result[response] };
  const toX = (v: number) => formatNumber(toDisplay(v, xu), 3);
  const toY = (v: number) => formatNumber(toDisplay(v, yu), 3);

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_260px] gap-x-4 max-[900px]:grid-cols-1" data-testid="sensitivity-panel">
      <div className="flex min-h-0 flex-col">
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-muted">Vary</span>
            <Segmented
              label="Parameter to vary"
              value={param}
              options={PARAMS.map((p) => ({ value: p, label: p, title: PARAM_META[p].label }))}
              onChange={(p) => setSensitivity({ param: p })}
              testId="sens-param"
            />
          </div>
          <label className="flex items-center gap-1.5">
            <span className="text-muted">Plot</span>
            <select
              className="input h-[26px] w-[150px]"
              value={response}
              onChange={(ev) => setSensitivity({ response: ev.target.value as ResponseKey })}
              data-testid="sens-response"
            >
              {RESPONSES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <Segmented
            label="Axis scaling"
            value={logScale ? "log" : "lin"}
            options={[
              { value: "log", label: "Log–log" },
              { value: "lin", label: "Linear" },
            ]}
            onChange={(v) => setSensitivity({ logScale: v === "log" })}
          />
        </div>
        <div className="min-h-0 flex-1">
          <LineChart
            points={points}
            current={current}
            log={logScale}
            xLabel={`${pmeta.label} [${xu.symbol || "–"}]`}
            yLabel={`${rmeta.label} [${yu.symbol}]`}
            fmtX={toX}
            fmtY={toY}
            onPick={(x) => setParameter(param, x)}
            ariaLabel={`${rmeta.label} versus ${pmeta.label.toLowerCase()} from 0.5 to 2 times the current value. Exponent ${formatNumber(e, 3)}.`}
          />
        </div>
      </div>

      <aside className="min-h-0 overflow-y-auto border-l border-line pl-4 text-[11.5px] leading-snug max-[900px]:hidden">
        <p className="caps mb-1">Scaling</p>
        <div className="mb-2 text-[13px] text-fg" data-testid="sens-law">
          {e === 0 ? (
            <Tex tex={`${rmeta.symbol}\\ \\text{is independent of}\\ ${pmeta.symbol}`} />
          ) : (
            <Tex tex={`${rmeta.symbol} \\propto ${pmeta.symbol}${powerTex(e) || "^{1}"}`} />
          )}
        </div>
        {e !== 0 && Number.isFinite(e) && (
          <p className="mb-2 text-muted">
            {logScale ? (
              <>On log–log axes the curve is a straight line of slope <b className="num text-fg">{formatNumber(e, 3)}</b>.</>
            ) : (
              <>Switch to log–log to see a straight line of slope {formatNumber(e, 3)}.</>
            )}
          </p>
        )}
        <dl className="num mb-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
          <dt className="text-muted">+10% {param}</dt>
          <dd className="text-right text-fg">{signedPct(whatIf(input, param, 1.1, response))}</dd>
          <dt className="text-muted">−10% {param}</dt>
          <dd className="text-right text-fg">{signedPct(whatIf(input, param, 0.9, response))}</dd>
          <dt className="text-muted">×2 {param}</dt>
          <dd className="text-right text-fg">×{formatNumber(whatIf(input, param, 2, response), 3)}</dd>
        </dl>
        <p className="text-faint">Range 0.5×–2×. Click the plot to set {param}.</p>
      </aside>
    </div>
  );
}
