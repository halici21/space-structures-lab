/**
 * Top toolbar (workspaces + global actions) and the contextual ribbon.
 *
 * Workspaces are modes over one model and one viewport, not pages: switching
 * changes the ribbon's tools, the tree's emphasis and the dock's default tab.
 * Planned tools are shown disabled with their roadmap milestone.
 */
import * as Popover from "@radix-ui/react-popover";
import {
  Activity,
  ArrowDownToLine,
  BookOpen,
  BrickWall,
  ChevronDown,
  Circle,
  Keyboard,
  LibraryBig,
  Moon,
  PanelLeft,
  PanelRight,
  Plus,
  RectangleHorizontal,
  Sigma,
  Sun,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Segmented } from "@/components/Segmented";
import { Tip } from "@/components/Tip";
import { MATERIAL_PRESETS, type MaterialPresetId } from "@/lib/structures/materials";
import { IDS } from "@/model/document";
import { ANALYSIS_KINDS, GEOMETRY_KINDS } from "@/model/schema";
import { contourEnabled, useLab, useSolved, type DeformScale, type DockTab, type Workspace } from "@/state/store";

export const WORKSPACES: { id: Workspace; label: string; key: string; hint: string }[] = [
  { id: "model", label: "Model", key: "1", hint: "Geometry and section" },
  { id: "physics", label: "Physics", key: "2", hint: "Material, supports and loads" },
  { id: "analyze", label: "Analyze", key: "3", hint: "Results, display and sensitivity" },
  { id: "learn", label: "Learn", key: "4", hint: "Equations, intuition and assumptions" },
];

export function BrandMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="shrink-0">
      <rect x="1" y="3" width="3" height="12" rx="0.5" fill="var(--support)" />
      <path d="M4 7.5 C 9 7.8, 13 9, 16.5 12" stroke="var(--accent)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M4 7.5 L16.5 7.5" stroke="var(--text-faint)" strokeWidth="1" strokeDasharray="1.5 1.5" />
    </svg>
  );
}

export function WorkspaceTabs({ compact = false }: { compact?: boolean }) {
  const workspace = useLab((s) => s.workspace);
  const setWorkspace = useLab((s) => s.setWorkspace);
  const hasDoc = useLab((s) => s.doc !== null);
  return (
    <div role="tablist" aria-label="Workspace" className="flex h-full items-stretch" data-testid="workspace-tabs">
      {WORKSPACES.map((w) => {
        const active = w.id === workspace;
        return (
          <Tip key={w.id} content={<>{w.hint} <kbd>{w.key}</kbd></>}>
            <button
              role="tab"
              aria-selected={active}
              disabled={!hasDoc && w.id !== "model"}
              className={
                "relative cursor-pointer px-3 text-[11px] font-semibold tracking-[0.07em] uppercase transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 " +
                (active ? "text-fg" : "text-muted hover:text-fg") +
                (compact ? " flex-1 px-1" : "")
              }
              onClick={() => setWorkspace(w.id)}
              data-testid={`ws-${w.id}`}
            >
              {w.label}
              <span
                className={"absolute right-2 bottom-0 left-2 h-0.5 rounded-t-sm transition-opacity duration-150 " + (active ? "bg-accent opacity-100" : "opacity-0")}
                aria-hidden
              />
            </button>
          </Tip>
        );
      })}
    </div>
  );
}

function ShortcutsHelp() {
  const rows: [string, string][] = [
    ["1 – 4", "Model · Physics · Analyze · Learn"],
    ["F", "Fit to view"],
    ["H", "Home view"],
    ["P", "Perspective / orthographic"],
    ["D", "Cycle deformation scale"],
    ["Esc", "Clear selection · close popover"],
    ["↑ / ↓", "Step a focused value (Shift ×10)"],
    ["Left drag", "Orbit"],
    ["Right / middle drag", "Pan"],
    ["Wheel", "Zoom to cursor"],
  ];
  return (
    <Popover.Root>
      <Tip content="Keyboard and mouse">
        <Popover.Trigger asChild>
          <button className="icon-btn" aria-label="Keyboard and mouse shortcuts">
            <Keyboard size={15} />
          </button>
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Content className="pop w-72 p-3" align="end" sideOffset={6}>
          <p className="caps mb-2">Shortcuts</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt>
                  <kbd>{k}</kbd>
                </dt>
                <dd className="text-muted">{v}</dd>
              </div>
            ))}
          </dl>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function NewProject() {
  const resetProject = useLab((s) => s.resetProject);
  const hasDoc = useLab((s) => s.doc !== null);
  return (
    <Popover.Root>
      <Tip content="New project">
        <Popover.Trigger asChild>
          <button className="icon-btn" aria-label="New project" disabled={!hasDoc} data-testid="new-project">
            <Plus size={16} />
          </button>
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Content className="pop w-64 p-3" align="end" sideOffset={6}>
          <p className="mb-2.5 text-fg">Discard the current model and start over?</p>
          <div className="flex justify-end gap-2">
            <Popover.Close className="btn">Cancel</Popover.Close>
            <Popover.Close className="btn border-violated text-violated" onClick={resetProject} data-testid="confirm-new">
              Discard
            </Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function Toolbar({
  onOpenLibrary,
  panes,
  onTogglePane,
}: {
  onOpenLibrary(): void;
  panes: { tree: boolean; inspector: boolean };
  onTogglePane(p: "tree" | "inspector"): void;
}) {
  const theme = useLab((s) => s.theme);
  const setTheme = useLab((s) => s.setTheme);
  return (
    <header className="flex h-10 shrink-0 items-stretch border-b border-line bg-panel" data-testid="toolbar">
      <div className="flex w-[257px] shrink-0 items-center gap-2 border-r border-line px-3 max-[1180px]:w-auto">
        <BrandMark />
        <span className="font-semibold tracking-[-0.005em] whitespace-nowrap text-fg">Space Structures Lab</span>
      </div>
      <WorkspaceTabs />
      <div className="ml-auto flex items-center gap-0.5 px-2">
        <Tip content="Space Structures Library">
          <button className="btn btn-ghost" onClick={onOpenLibrary} data-testid="open-library">
            <LibraryBig size={15} /> <span className="max-[1180px]:hidden">Library</span>
          </button>
        </Tip>
        <span className="mx-1 h-4 w-px bg-line" aria-hidden />
        <Tip content={panes.tree ? "Close model drawer" : "Open model drawer"}>
          <button
            className="btn btn-ghost h-[26px] gap-1.5 px-2"
            aria-label="Toggle model tree drawer"
            aria-controls="tree"
            aria-expanded={panes.tree}
            aria-pressed={panes.tree}
            onClick={() => onTogglePane("tree")}
            data-testid="toggle-tree"
          >
            <PanelLeft size={15} />
            <span className="max-[900px]:hidden">Model</span>
          </button>
        </Tip>
        <Tip content={panes.inspector ? "Close properties drawer" : "Open properties drawer"}>
          <button
            className="btn btn-ghost h-[26px] gap-1.5 px-2"
            aria-label="Toggle properties drawer"
            aria-controls="inspector"
            aria-expanded={panes.inspector}
            aria-pressed={panes.inspector}
            onClick={() => onTogglePane("inspector")}
            data-testid="toggle-inspector"
          >
            <PanelRight size={15} />
            <span className="max-[900px]:hidden">Properties</span>
          </button>
        </Tip>
        <span className="mx-1 h-4 w-px bg-line" aria-hidden />
        <ShortcutsHelp />
        <Tip content={theme === "dark" ? "Light theme" : "Dark theme"}>
          <button className="icon-btn" aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")} data-testid="toggle-theme">
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </Tip>
        <NewProject />
      </div>
    </header>
  );
}

// -------------------------------------------------------------------- ribbon

/** Lists roadmap items for a ribbon group without cluttering it with disabled buttons. */
function PlannedMenu({ items, testId }: { items: { label: string; milestone?: string }[]; testId?: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="btn btn-ghost h-[26px] px-2 text-muted" aria-label={`Planned: ${items.map((i) => i.label).join(", ")}`} data-testid={testId}>
          <Circle size={12} strokeDasharray="3 3" aria-hidden />
          {items.length} planned
          <ChevronDown size={12} aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="pop w-56 p-1.5" align="start" sideOffset={6}>
          <p className="caps px-2 pt-1 pb-1">Not available yet</p>
          <ul>
            {items.map((i) => (
              <li key={i.label} className="flex h-7 items-center justify-between px-2 text-muted">
                <span>{i.label}</span>
                <span className="chip chip-info h-[18px] text-[10px]">{i.milestone ?? "later"}</span>
              </li>
            ))}
          </ul>
          <p className="px-2 pt-1 pb-1 text-[11px] text-faint">See the roadmap in docs/FUTURE_ROADMAP.md.</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function RibbonGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1 border-r border-line px-2.5 last:border-r-0" role="group" aria-label={label}>
      <span className="caps mr-1 !text-[10px] text-faint max-[1180px]:hidden">{label}</span>
      {children}
    </div>
  );
}

function Tool({
  icon: Icon,
  label,
  onClick,
  active = false,
  testId,
}: {
  icon: LucideIcon;
  label: string;
  onClick(): void;
  active?: boolean;
  testId?: string;
}) {
  return (
    <button
      className={"btn btn-ghost h-[26px] px-2 " + (active ? "!bg-accent-weak text-accent-text" : "")}
      aria-pressed={active}
      onClick={onClick}
      data-testid={testId}
    >
      <Icon size={14} aria-hidden />
      {label}
    </button>
  );
}

const SCALE_OPTIONS: { value: DeformScale; label: string }[] = [
  { value: "1", label: "1×" },
  { value: "10", label: "10×" },
  { value: "50", label: "50×" },
  { value: "auto", label: "Auto" },
];

function scrollToTopic(id: string, setDockTab: (t: DockTab) => void, tab: DockTab) {
  setDockTab(tab);
  requestAnimationFrame(() => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    el?.animate?.([{ background: "var(--accent-weak)" }, { background: "transparent" }], { duration: 900 });
  });
}

export function Ribbon({ onOpenLibrary }: { onOpenLibrary(): void }) {
  const workspace = useLab((s) => s.workspace);
  const selection = useLab((s) => s.selection);
  const select = useLab((s) => s.select);
  const view = useLab((s) => s.view);
  const setView = useLab((s) => s.setView);
  const setDockTab = useLab((s) => s.setDockTab);
  const dockTab = useLab((s) => s.dockTab);
  const dockOpen = useLab((s) => s.dockOpen);
  const applyPreset = useLab((s) => s.applyMaterialPreset);
  const setLoadPlane = useLab((s) => s.setLoadPlane);
  const solved = useSolved();
  if (!solved?.ok) return <div className="h-[34px] shrink-0 border-b border-line bg-panel" />;
  const { material, load } = solved.value.resolved;

  let content: ReactNode;
  if (workspace === "model") {
    content = (
      <>
        <RibbonGroup label="Geometry">
          <Tool icon={RectangleHorizontal} label="Beam" active={selection === IDS.beam} onClick={() => select(IDS.beam)} testId="tool-beam" />
          <PlannedMenu items={GEOMETRY_KINDS.filter((k) => !k.available)} testId="planned-geometry" />
        </RibbonGroup>
        <RibbonGroup label="Library">
          <Tool icon={LibraryBig} label="Space structures" onClick={onOpenLibrary} />
        </RibbonGroup>
      </>
    );
  } else if (workspace === "physics") {
    content = (
      <>
        <RibbonGroup label="Material">
          <select
            className="input h-[26px] w-[168px]"
            aria-label="Material preset"
            value={material.presetId}
            onChange={(e) => e.target.value !== "custom" && applyPreset(e.target.value as Exclude<MaterialPresetId, "custom">)}
          >
            {MATERIAL_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.shortName}
              </option>
            ))}
            <option value="custom" disabled>
              Custom
            </option>
          </select>
        </RibbonGroup>
        <RibbonGroup label="Constraints">
          <Tool icon={BrickWall} label="Fixed support" active={selection === IDS.support} onClick={() => select(IDS.support)} testId="tool-support" />
          <PlannedMenu
            items={[
              { label: "Pinned", milestone: "M8" },
              { label: "Spring", milestone: "M8" },
              { label: "Joint", milestone: "M8" },
            ]}
          />
        </RibbonGroup>
        <RibbonGroup label="Loads">
          <Tool icon={ArrowDownToLine} label="Tip force" active={selection === IDS.load} onClick={() => select(IDS.load)} testId="tool-load" />
          <Segmented
            label="Load direction"
            value={load.plane}
            options={[
              { value: "vertical", label: "−y" },
              { value: "lateral", label: "−x" },
            ]}
            onChange={setLoadPlane}
          />
        </RibbonGroup>
      </>
    );
  } else if (workspace === "analyze") {
    content = (
      <>
        <RibbonGroup label="Study">
          <Tool icon={Activity} label="Static bending" active={selection === IDS.analysis} onClick={() => select(IDS.analysis)} testId="tool-static" />
          <PlannedMenu items={ANALYSIS_KINDS.filter((k) => !k.available)} testId="planned-analysis" />
        </RibbonGroup>
        <RibbonGroup label="Display">
          <Segmented label="Deformation display scale" value={view.deformScale} options={SCALE_OPTIONS} onChange={(v) => setView({ deformScale: v, showDeformed: true })} />
          <Tool icon={Sigma} label="Contour" active={contourEnabled(view, workspace)} onClick={() => setView({ contour: contourEnabled(view, workspace) ? "off" : "on" })} />
        </RibbonGroup>
        <RibbonGroup label="Explore">
          <Tool icon={Activity} label="Sensitivity" active={dockOpen && dockTab === "sensitivity"} onClick={() => setDockTab("sensitivity")} />
          <Tool icon={BookOpen} label="Assumptions" active={dockOpen && dockTab === "assumptions"} onClick={() => setDockTab("assumptions")} />
        </RibbonGroup>
      </>
    );
  } else {
    content = (
      <RibbonGroup label="Topics">
        <Tool icon={BookOpen} label="Stiffness" onClick={() => scrollToTopic("learn-stiffness", setDockTab, "learn")} />
        <Tool icon={BookOpen} label="Deflection" onClick={() => scrollToTopic("learn-deflection", setDockTab, "learn")} />
        <Tool icon={BookOpen} label="Stress" onClick={() => scrollToTopic("learn-stress", setDockTab, "learn")} />
        <Tool icon={BookOpen} label="What changed" onClick={() => scrollToTopic("learn-change", setDockTab, "learn")} />
        <Tool icon={BookOpen} label="Assumptions" active={dockOpen && dockTab === "assumptions"} onClick={() => setDockTab("assumptions")} />
      </RibbonGroup>
    );
  }

  return (
    <div
      className="flex h-[34px] shrink-0 items-stretch overflow-x-auto overflow-y-hidden border-b border-line bg-panel"
      role="toolbar"
      aria-label={`${workspace} tools`}
      data-testid="ribbon"
    >
      {content}
    </div>
  );
}
