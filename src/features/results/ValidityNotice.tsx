import { AlertTriangle } from "lucide-react";
import { formatNumber } from "@/core/units";
import type { AssumptionCheck, AssumptionId } from "@/lib/structures/validity";
import type { SolvedDocument } from "@/model/document";

function checkLabel(check: AssumptionCheck, solved: SolvedDocument): string {
  const r = solved.result;
  const labels: Record<AssumptionId, string> = {
    slender: `L/depth = ${formatNumber(r.slenderness, 3)}`,
    "linear-elastic": `stress / strength = ${formatNumber(r.stressRatio, 3)}×`,
    "small-deformation": `δ/L = ${formatNumber(100 * r.deflectionRatio, 3)}%`,
    "plane-sections": "plane sections",
    "shear-neglected": "shear deformation",
    isotropic: "simplified material",
    "static-load": "static load",
    "no-lateral-buckling": "lateral buckling not checked",
  };
  return labels[check.id];
}

/** A short validity statement beside the results, built from the live checks. */
export function ValidityNotice({
  solved,
  onReview,
  compact = false,
}: {
  solved: SolvedDocument;
  onReview(): void;
  compact?: boolean;
}) {
  if (solved.status !== "violated" && solved.status !== "caution") return null;

  const relevant = solved.checks.filter((c) => c.status === solved.status);
  const details = relevant.slice(0, 2).map((c) => checkLabel(c, solved)).join(" · ");
  const remainder = relevant.length > 2 ? ` · +${relevant.length - 2} more` : "";
  const violated = solved.status === "violated";

  return (
    <div
      className={
        "flex min-w-0 items-center gap-2 border-b px-3 py-1.5 text-[12.5px] leading-snug " +
        (violated
          ? "border-violated/25 bg-[var(--violated-weak)] text-violated"
          : "border-caution/25 bg-[var(--caution-weak)] text-caution") +
        (compact ? " flex-wrap" : " min-h-11")
      }
      role="status"
      data-testid="validity-notice"
      data-status={solved.status}
    >
      <AlertTriangle size={14} className="shrink-0" aria-hidden />
      <strong className="shrink-0 font-semibold">{violated ? "Outside model assumptions" : "Near model limits"}</strong>
      <span className="min-w-0 text-fg">
        {details}{remainder}. {violated ? "Linear prediction is unreliable here." : "Check limits before interpreting results."}
      </span>
      <button className="ml-auto shrink-0 cursor-pointer font-medium underline underline-offset-2" onClick={onReview}>
        Review assumptions
      </button>
    </div>
  );
}
