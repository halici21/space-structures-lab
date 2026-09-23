/**
 * First-run state: the viewport is never an unexplained blank canvas.
 */
import { ArrowRight } from "lucide-react";
import { formatQuantityText } from "@/core/units";
import { useLab } from "@/state/store";

export function EmptyState({ onOpenLibrary }: { onOpenLibrary(): void }) {
  const createExample = useLab((s) => s.createExample);
  const system = useLab((s) => s.unitSystem);
  const q = formatQuantityText;
  const rows: [string, string][] = [
    ["Length L", q(1, "span", system)],
    ["Section b × h", `${q(0.03, "sectionDim", system)} × ${q(0.005, "sectionDim", system)}`],
    ["Material", "Al 6061-T6, E = 69 GPa"],
    ["Tip force F", q(100, "force", system)],
  ];

  return (
    <div
      className="relative grid h-full place-items-center overflow-auto bg-viewport p-4"
      style={{
        backgroundImage:
          "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
        backgroundPosition: "-1px -1px",
      }}
      data-testid="empty-state"
    >
      <div className="w-[370px] max-w-full rounded-md border border-line-strong bg-panel p-5 shadow-[var(--shadow-pop)]">
        <p className="caps mb-1">Space Structures Lab</p>
        <h1 className="mb-1.5 text-[18px] font-semibold tracking-[-0.02em] text-fg">Start with a cantilever beam</h1>
        <p className="mb-3 text-muted">
          One click builds a working model. Change a parameter and see — and understand — how the structure responds.
        </p>
        <dl className="mb-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 rounded-sm border border-line bg-app/40 px-3 py-2.5 text-[12.5px]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="num text-right text-fg">{v}</dd>
            </div>
          ))}
        </dl>
        <p
          className="mb-3 rounded-sm border border-line bg-app/30 px-3 py-2.5 text-[12.5px] leading-[1.45] text-muted"
          role="note"
          data-testid="reference-case-note"
        >
          <span className="font-medium text-fg">Reference case.</span> It starts outside the model's assumptions: δ/L = 155%, and 800 MPa bending stress exceeds the 276 MPa 6061-T6 yield strength. The guide explains why and suggests a 0.25 m comparison.
        </p>
        <button className="btn btn-primary h-8 w-full justify-center" onClick={createExample} data-testid="create-cantilever" autoFocus>
          Create cantilever beam <ArrowRight size={14} />
        </button>
        <button className="btn btn-ghost mt-1.5 w-full justify-center text-muted" onClick={onOpenLibrary}>
          Browse the Space Structures Library
        </button>
      </div>
    </div>
  );
}
