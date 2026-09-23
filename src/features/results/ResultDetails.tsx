/**
 * Full static-bending result table, grouped by what the numbers describe.
 */
import { Tex } from "@/components/Tex";
import { formatNumber, formatQuantity, type QuantityKind } from "@/core/units";
import type { CantileverResult } from "@/lib/structures/cantilever";
import type { SolvedDocument } from "@/model/document";
import { useLab } from "@/state/store";
import { RatioChip, useReferenceResult } from "./ResultStrip";
import { WhyButton, type WhyKey } from "./Why";

interface Row {
  label: string;
  symbol: string;
  value: (r: CantileverResult) => number;
  kind: QuantityKind | "plain";
  why?: WhyKey;
  hint?: string;
}

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: "Response",
    rows: [
      { label: "Tip displacement", symbol: "\\delta", value: (r) => r.tipDeflection, kind: "displacement", why: "tipDeflection" },
      { label: "Tip rotation", symbol: "\\theta_{tip}", value: (r) => r.tipRotation, kind: "rotation" },
      { label: "Tip stiffness", symbol: "k_{tip}", value: (r) => r.tipStiffness, kind: "tipStiffness", why: "tipStiffness" },
      { label: "Deflection / length", symbol: "\\delta/L", value: (r) => r.deflectionRatio, kind: "ratio" },
    ],
  },
  {
    title: "Loads & stress",
    rows: [
      { label: "Root moment", symbol: "M_{max}", value: (r) => r.rootMoment, kind: "moment", why: "rootMoment" },
      { label: "Root shear", symbol: "V", value: (r) => r.rootShear, kind: "force" },
      { label: "Max bending stress", symbol: "\\sigma_{max}", value: (r) => r.maxBendingStress, kind: "stress", why: "maxBendingStress" },
      {
        label: "Margin of safety",
        symbol: "MS",
        value: (r) => 1 / r.stressRatio - 1,
        kind: "plain",
        hint: "MS = σ_ref / σ_max − 1. Negative means the stress exceeds the material's reference strength.",
      },
    ],
  },
  {
    title: "Section & mass",
    rows: [
      { label: "Governing I", symbol: "I", value: (r) => r.I, kind: "inertia" },
      { label: "Flexural stiffness", symbol: "EI", value: (r) => r.EI, kind: "flexuralStiffness", why: "EI" },
      { label: "Axial stiffness", symbol: "EA", value: (r) => r.EA, kind: "axialStiffness" },
      { label: "Mass", symbol: "m", value: (r) => r.mass, kind: "mass", why: "mass" },
    ],
  },
];

export function ResultDetails({ solved }: { solved: SolvedDocument }) {
  const system = useLab((s) => s.unitSystem);
  const ref = useReferenceResult();
  const r = solved.result;
  return (
    <div className="grid grid-cols-3 gap-x-6 gap-y-4 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1" data-testid="result-details">
      {GROUPS.map((g) => (
        <section key={g.title} className="min-w-0">
          <h3 className="caps mb-1.5 !text-fg">{g.title}</h3>
          <dl>
            {g.rows.map((row) => {
              const v = row.value(r);
              const f = row.kind === "plain" ? { value: Number.isFinite(v) ? formatNumber(v, 3) : "—", unit: "" } : formatQuantity(v, row.kind, system);
              const negative = row.kind === "plain" && v < 0;
              return (
                <div key={row.label} className="grid min-h-[26px] grid-cols-[minmax(0,1fr)_40px_auto_52px_20px] items-center gap-x-2 border-b border-line/70">
                  <dt className="truncate text-muted" title={row.hint}>
                    {row.label}
                    {row.hint && <span className="ml-1 text-faint">ⓘ</span>}
                  </dt>
                  <span className="text-faint">
                    <Tex tex={row.symbol} />
                  </span>
                  <dd className={"num text-right " + (negative ? "text-violated" : "text-fg")}>{f.value}</dd>
                  <span className="truncate text-faint">{f.unit}</span>
                  <span className="flex justify-end">
                    {row.why ? <WhyButton which={row.why} solved={solved} /> : null}
                  </span>
                  {ref && row.kind !== "plain" && (
                    <span className="col-span-5 -mt-1 mb-1 justify-self-end empty:hidden">
                      <RatioChip now={v} before={row.value(ref.result)} field={ref.field} />
                    </span>
                  )}
                </div>
              );
            })}
          </dl>
        </section>
      ))}
    </div>
  );
}
