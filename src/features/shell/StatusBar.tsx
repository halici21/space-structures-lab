import { UNIT_SYSTEMS, type UnitSystemId } from "@/core/units";
import { findEntity } from "@/model/schema";
import { useLab, useSolved } from "@/state/store";

export function StatusBar() {
  const doc = useLab((s) => s.doc);
  const selection = useLab((s) => s.selection);
  const hover = useLab((s) => s.hover);
  const unitSystem = useLab((s) => s.unitSystem);
  const setUnitSystem = useLab((s) => s.setUnitSystem);
  const solved = useSolved();
  const hovered = doc ? findEntity(doc, hover) : undefined;
  const selected = doc ? findEntity(doc, selection) : undefined;

  return (
    <footer className="flex h-6 shrink-0 items-center gap-3 border-t border-line bg-panel px-3 text-[11.5px] text-muted" data-testid="status-bar">
      {solved?.ok ? (
        <span className="flex items-center gap-1.5">
          <span
            className={
              "h-1.5 w-1.5 rounded-full " +
              (solved.value.status === "violated" ? "bg-violated" : solved.value.status === "caution" ? "bg-caution" : "bg-ok")
            }
            aria-hidden
          />
          {solved.value.status === "violated"
            ? "Computed · outside model assumptions"
            : solved.value.status === "caution"
              ? "Computed · near model limits"
              : "Solved live · Euler–Bernoulli · closed form"}
        </span>
      ) : solved ? (
        <span className="text-violated">{solved.reason}</span>
      ) : (
        <span>No model</span>
      )}
      <span className="h-3 w-px bg-line" aria-hidden />
      <span className="min-w-0 truncate" aria-live="polite">
        {hovered ? <>Hover: {hovered.name}</> : selected ? <>Selected: {selected.name}</> : "Nothing selected"}
      </span>
      <span className="ml-auto hidden truncate text-faint min-[1100px]:inline">Left-drag orbit · Right/middle-drag pan · Wheel zoom</span>
      <span className="h-3 w-px bg-line" aria-hidden />
      <label className="flex items-center gap-1.5">
        <span className="text-faint">Units</span>
        <select
          className="h-5 cursor-pointer rounded-sm border border-line bg-input px-1 text-[11px] text-fg"
          value={unitSystem}
          onChange={(e) => setUnitSystem(e.target.value as UnitSystemId)}
          aria-label="Display unit system"
          data-testid="status-units"
        >
          {(Object.keys(UNIT_SYSTEMS) as UnitSystemId[]).map((id) => (
            <option key={id} value={id}>
              {id === "engineering" ? "Engineering" : "SI base"}
            </option>
          ))}
        </select>
        <span className="text-faint">· stored in SI</span>
      </label>
    </footer>
  );
}
