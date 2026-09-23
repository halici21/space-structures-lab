/**
 * Analysis dock: the result strip is always visible; the tabbed panel below it
 * expands on demand and can be resized by dragging its top edge.
 */
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { SolvedDocument } from "@/model/document";
import { useLab, type DockTab } from "@/state/store";
import { AssumptionsPanel } from "../learn/AssumptionsPanel";
import { LearnPanel } from "../learn/LearnPanel";
import { ResultDetails } from "../results/ResultDetails";
import { ResultStrip } from "../results/ResultStrip";
import { ValidityNotice } from "../results/ValidityNotice";
import { SensitivityPanel } from "../sensitivity/SensitivityPanel";

const TABS: { id: DockTab; label: string }[] = [
  { id: "details", label: "Results" },
  { id: "sensitivity", label: "Sensitivity" },
  { id: "learn", label: "Learn" },
  { id: "assumptions", label: "Assumptions" },
];

const STRIP = 56;
const TABBAR = 36;
const MIN_PANEL = 150;
/** Toolbar + ribbon + status bar height [px]. */
const CHROME = 104;
const MIN_VIEWPORT = 320;

export function DockTabs({ compact = false }: { compact?: boolean }) {
  const dockTab = useLab((s) => s.dockTab);
  const setDockTab = useLab((s) => s.setDockTab);
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = TABS.findIndex((t) => t.id === dockTab);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length]!;
    setDockTab(next.id);
    requestAnimationFrame(() => document.getElementById(`dock-tab-${next.id}`)?.focus());
  };
  return (
    <div role="tablist" aria-label="Analysis panel" className={"flex h-9 shrink-0 items-stretch gap-1 border-b border-line px-2 " + (compact ? "overflow-x-auto" : "")} onKeyDown={onKey}>
      {TABS.map((t) => {
        const active = t.id === dockTab;
        return (
          <button
            key={t.id}
            id={`dock-tab-${t.id}`}
            role="tab"
            aria-selected={active}
            aria-controls="dock-panel"
            tabIndex={active ? 0 : -1}
            className={
              "relative cursor-pointer px-2.5 whitespace-nowrap transition-colors " + (active ? "text-fg" : "text-muted hover:text-fg")
            }
            onClick={() => setDockTab(t.id)}
            data-testid={`dock-tab-${t.id}`}
          >
            {t.label}
            {active && <span className="absolute right-1.5 bottom-0 left-1.5 h-0.5 rounded-t-sm bg-accent" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}

export function DockPanel({ solved, compact = false }: { solved: SolvedDocument; compact?: boolean }) {
  const dockTab = useLab((s) => s.dockTab);
  return (
    <div
      id="dock-panel"
      role="tabpanel"
      aria-labelledby={`dock-tab-${dockTab}`}
      // Focusable so keyboard users can scroll it (WAI-ARIA tabs pattern).
      tabIndex={0}
      className={"min-h-0 flex-1 px-4 py-3 " + (dockTab === "sensitivity" && !compact ? "overflow-hidden" : "overflow-y-auto")}
      data-testid="dock-panel"
    >
      {dockTab === "details" && <ResultDetails solved={solved} compact={compact} />}
      {dockTab === "sensitivity" && <SensitivityPanel solved={solved} compact={compact} />}
      {dockTab === "learn" && <LearnPanel solved={solved} compact={compact} />}
      {dockTab === "assumptions" && <AssumptionsPanel solved={solved} compact={compact} />}
    </div>
  );
}

/** Reading tabs need more room than the results table. Heights are per tab and user-resizable. */
const DEFAULT_HEIGHT: Record<DockTab, number> = { details: 310, sensitivity: 340, learn: 430, assumptions: 370 };

export function SideDock({ solved }: { solved: SolvedDocument }) {
  return (
    <section className="side-workspace flex min-h-0 shrink-0 flex-col border-l border-line bg-panel" aria-label="Analysis workspace" data-testid="side-dock">
      <DockTabs compact />
      <DockPanel solved={solved} compact />
    </section>
  );
}

export function Dock({ solved, stripOnly = false }: { solved: SolvedDocument; stripOnly?: boolean }) {
  const dockOpen = useLab((s) => s.dockOpen);
  const dockTab = useLab((s) => s.dockTab);
  const setDockTab = useLab((s) => s.setDockTab);
  const [heights, setHeights] = useState(DEFAULT_HEIGHT);
  const noticeHeight = solved.status === "violated" || solved.status === "caution" ? 44 : 0;
  const closedHeight = STRIP + noticeHeight;
  const minHeight = closedHeight + TABBAR + MIN_PANEL;
  // The viewport stays the centre of gravity: it always keeps at least MIN_VIEWPORT px.
  const max = () => Math.round(Math.min(window.innerHeight * 0.58, window.innerHeight - CHROME - MIN_VIEWPORT));
  const height = Math.min(heights[dockTab], Math.max(minHeight, max()));
  const setHeight = (next: number | ((h: number) => number)) =>
    setHeights((hs) => ({ ...hs, [dockTab]: typeof next === "function" ? next(hs[dockTab]) : next }));
  const drag = useRef<{ y: number; h: number } | null>(null);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { y: e.clientY, h: height };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setHeight(Math.max(minHeight, Math.min(max(), drag.current.h + drag.current.y - e.clientY)));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowUp") setHeight((h) => Math.min(max(), h + 24));
    if (e.key === "ArrowDown") setHeight((h) => Math.max(minHeight, h - 24));
  };

  return (
    <section
      className="relative flex shrink-0 flex-col border-t border-line bg-panel transition-[height] duration-150 ease-out"
      style={{ height: dockOpen && !stripOnly ? height : closedHeight }}
      aria-label="Analysis and results"
      data-testid="dock"
      data-open={dockOpen || undefined}
    >
      {dockOpen && !stripOnly && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize analysis panel"
          aria-valuenow={height}
          tabIndex={0}
          className="absolute -top-[3px] right-0 left-0 z-10 h-[6px] cursor-row-resize hover:bg-accent/40 focus-visible:bg-accent/60"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={() => (drag.current = null)}
          onKeyDown={onKey}
          data-testid="dock-resize"
        />
      )}
      {noticeHeight > 0 && <ValidityNotice solved={solved} onReview={() => setDockTab("assumptions")} />}
      <div className="shrink-0 border-b border-line">
        <ResultStrip solved={solved} />
      </div>
      {dockOpen && !stripOnly && (
        <>
          <DockTabs />
          <DockPanel solved={solved} />
        </>
      )}
    </section>
  );
}
