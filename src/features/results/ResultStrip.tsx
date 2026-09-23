/**
 * Compact, always-visible result strip. The three governing quantities stay
 * visible; the full result table opens on demand. Each value can show its
 * ratio against the model before the current edit.
 */
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useMemo } from "react";
import { Tex } from "@/components/Tex";
import { Tip } from "@/components/Tip";
import { formatQuantity } from "@/core/units";
import { solveCantilever, type CantileverResult } from "@/lib/structures/cantilever";
import type { CheckStatus } from "@/lib/structures/validity";
import type { SolvedDocument } from "@/model/document";
import { useLab } from "@/state/store";
import { factorText } from "../learn/explain";
import { PARAM_META, RESULT_META, type ResultKey } from "../meta";
import { WhyButton, type WhyKey } from "./Why";

const STRIP: { key: ResultKey; why: WhyKey }[] = [
  { key: "tipDeflection", why: "tipDeflection" },
  { key: "maxBendingStress", why: "maxBendingStress" },
  { key: "tipStiffness", why: "tipStiffness" },
];

const STATUS: Record<CheckStatus, { cls: string; text: string }> = {
  ok: { cls: "chip-ok", text: "Within assumptions" },
  caution: { cls: "chip-caution", text: "Near limits" },
  violated: { cls: "chip-violated", text: "Outside assumptions" },
  info: { cls: "chip-info", text: "Solved" },
};

/** The solved reference (model before the current edit), or null when nothing changed. */
export function useReferenceResult(): { result: CantileverResult; field: string } | null {
  const reference = useLab((s) => s.reference);
  return useMemo(
    () => (reference ? { result: solveCantilever(reference.input), field: reference.field } : null),
    [reference],
  );
}

export function fieldLabel(field: string): string {
  if (field === "material") return "material";
  if (field === "plane") return "load direction";
  return PARAM_META[field as keyof typeof PARAM_META]?.label.toLowerCase() ?? field;
}

export function RatioChip({ now, before, field }: { now: number; before: number; field: string }) {
  if (!(before > 0) || Math.abs(now / before - 1) < 1e-6) return null;
  const text = factorText(now / before);
  return (
    <Tip content={`Compared with the model before you edited ${fieldLabel(field)}`}>
      <span className="num inline-flex h-4 items-center rounded-sm bg-accent-weak px-1 text-[10.5px] text-accent-text" data-testid="ratio-chip">
        {text}
      </span>
    </Tip>
  );
}

export function ResultStrip({ solved, compact = false }: { solved: SolvedDocument; compact?: boolean }) {
  const system = useLab((s) => s.unitSystem);
  const dockOpen = useLab((s) => s.dockOpen);
  const setDockOpen = useLab((s) => s.setDockOpen);
  const setDockTab = useLab((s) => s.setDockTab);
  const fieldErrors = useLab((s) => s.fieldErrors);
  const ref = useReferenceResult();
  const status = STATUS[solved.status];
  const flagged = solved.checks.filter((c) => c.status === "violated" || c.status === "caution").length;
  const invalid = Object.keys(fieldErrors);

  return (
    <div className="flex h-14 min-w-0 items-stretch" data-testid="result-strip">
      {!compact && (
        <div className="flex shrink-0 flex-col justify-center gap-0.5 border-r border-line pr-3 pl-3">
          <span className="caps !text-fg">Static bending</span>
          <button
            className={"chip w-fit cursor-pointer " + status.cls}
            onClick={() => setDockTab("assumptions")}
            title="Review the model's assumptions"
            data-testid="status-chip"
            data-status={solved.status}
          >
            {status.text}
            {flagged > 0 && <span className="num">· {flagged}</span>}
          </button>
        </div>
      )}

      {invalid.length > 0 && (
        <div className="flex shrink-0 items-center gap-1.5 border-r border-line px-3 text-[11px] text-violated" role="status" data-testid="invalid-notice">
          <AlertTriangle size={13} aria-hidden />
          <span>
            Invalid {invalid.map((k) => PARAM_META[k as keyof typeof PARAM_META].label.toLowerCase()).join(", ")} ·
            <br />
            showing last valid state
          </span>
        </div>
      )}

      <dl className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
        {STRIP.map(({ key, why }) => {
          const meta = RESULT_META[key];
          const f = formatQuantity(solved.result[key], meta.kind, system);
          return (
            <div
              key={key}
              className="flex min-w-[140px] flex-1 flex-col justify-center border-r border-line px-3 last:border-r-0"
              data-testid={`result-${key}`}
            >
              <dt className="flex items-center gap-1 truncate text-[12px] text-muted">
                <span className="truncate" title={meta.label}>
                  {meta.short ?? meta.label}
                </span>
                <span className="text-faint">
                  <Tex tex={meta.symbol} />
                </span>
              </dt>
              <dd className="flex items-center gap-1.5">
                <span className="num text-[17px] font-semibold leading-tight text-fg" data-testid={`value-${key}`}>
                  {f.value}
                </span>
                <span className="text-[12px] text-muted" data-testid={`unit-${key}`}>
                  {f.unit}
                </span>
                {ref && <RatioChip now={solved.result[key]} before={ref.result[key]} field={ref.field} />}
                <span className="ml-auto" />
                <WhyButton which={why} solved={solved} />
              </dd>
            </div>
          );
        })}
      </dl>

      {!compact && (
        <button
          className="shrink-0 border-l border-line px-3 text-[12.5px] font-medium text-accent-text hover:bg-hover"
          onClick={() => setDockTab("details")}
          data-testid="all-results"
        >
          All results
        </button>
      )}

      {!compact && (
        <button
          className="flex w-10 shrink-0 cursor-pointer items-center justify-center border-l border-line text-muted hover:bg-hover hover:text-fg"
          aria-label={dockOpen ? "Collapse analysis panel" : "Expand analysis panel"}
          aria-expanded={dockOpen}
          onClick={() => setDockOpen(!dockOpen)}
          data-testid="dock-toggle"
        >
          {dockOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      )}
    </div>
  );
}
