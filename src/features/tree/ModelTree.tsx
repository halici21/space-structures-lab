/**
 * Model tree. Selection and hover are shared with the viewport through the
 * store, so picking in either place highlights both. Keyboard: ↑/↓ move,
 * ←/→ collapse/expand, Enter/Space select.
 */
import {
  Activity,
  ArrowDownToLine,
  BrickWall,
  ChevronRight,
  Eye,
  EyeOff,
  Focus,
  Hexagon,
  LibraryBig,
  RectangleHorizontal,
  type LucideIcon,
} from "lucide-react";
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import type { CheckStatus } from "@/lib/structures/validity";
import type { Entity, LabDocument } from "@/model/schema";
import { useLab, useSolved } from "@/state/store";
import { Tip } from "@/components/Tip";

interface Group {
  key: keyof Pick<LabDocument, "geometry" | "materials" | "constraints" | "loads" | "analyses">;
  label: string;
  icon: LucideIcon;
  hideable: boolean;
}

const GROUPS: Group[] = [
  { key: "geometry", label: "Geometry", icon: RectangleHorizontal, hideable: true },
  { key: "materials", label: "Materials", icon: Hexagon, hideable: false },
  { key: "constraints", label: "Constraints", icon: BrickWall, hideable: true },
  { key: "loads", label: "Loads", icon: ArrowDownToLine, hideable: true },
  { key: "analyses", label: "Analyses", icon: Activity, hideable: false },
];

const STATUS_DOT: Record<CheckStatus, string> = {
  ok: "bg-ok",
  caution: "bg-caution",
  violated: "bg-violated",
  info: "bg-info",
};

const STATUS_TEXT: Record<CheckStatus, string> = {
  ok: "Solved — all assumptions satisfied",
  caution: "Solved — some assumptions near their limits",
  violated: "Solved — outside the model's assumptions",
  info: "Solved",
};

function moveFocus(from: HTMLElement, dir: 1 | -1) {
  const tree = from.closest('[role="tree"]');
  if (!tree) return;
  const items = Array.from(tree.querySelectorAll<HTMLElement>('[role="treeitem"]')).filter(
    (el) => el.offsetParent !== null,
  );
  const i = items.indexOf(from);
  items[Math.max(0, Math.min(items.length - 1, i + dir))]?.focus();
}

export function ModelTree({ onOpenLibrary, guide }: { onOpenLibrary(): void; guide?: ReactNode }) {
  const doc = useLab((s) => s.doc);
  const expanded = useLab((s) => s.treeExpanded);
  const toggleTree = useLab((s) => s.toggleTree);
  const createExample = useLab((s) => s.createExample);
  const workspace = useLab((s) => s.workspace);
  const solved = useSolved();
  const hasSelection = useLab((s) => s.selection !== null);
  const treeRef = useRef<HTMLDivElement>(null);

  if (!doc) {
    return (
      <div className="flex h-full flex-col">
        <PanelTitle title="Model" />
        <div className="p-3 text-muted">
          <p className="mb-2.5">No model yet.</p>
          <button className="btn btn-primary" onClick={createExample} data-testid="tree-create">
            Start with a cantilever beam
          </button>
        </div>
        <LibraryFooter onOpen={onOpenLibrary} />
      </div>
    );
  }

  const status = solved?.ok ? solved.value.status : null;
  // Workspaces emphasise the part of the tree they act on.
  const emphasis: Record<string, Group["key"][]> = {
    model: ["geometry"],
    physics: ["materials", "constraints", "loads"],
    analyze: ["analyses"],
    learn: [],
  };

  return (
    <div className="flex h-full flex-col">
      <PanelTitle title="Model" aside={<span className="truncate text-faint">{doc.name}</span>} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          ref={treeRef}
          role="tree"
          aria-label="Model tree"
          className="py-1"
          data-testid="model-tree"
        >
          {GROUPS.map((g, gi) => {
            const items = doc[g.key] as Entity[];
            const open = expanded[g.key] !== false;
            const emphasised = emphasis[workspace]?.includes(g.key);
            return (
              <div key={g.key} role="group" aria-label={g.label}>
                <div
                  role="treeitem"
                  aria-expanded={open}
                  aria-selected={false}
                  tabIndex={!hasSelection && gi === 0 ? 0 : -1}
                  className="group flex h-[26px] cursor-pointer items-center gap-1 pr-2 pl-1.5 outline-none hover:bg-hover focus-visible:bg-hover"
                  onClick={() => toggleTree(g.key)}
                  onKeyDown={(e) => groupKeys(e, open, () => toggleTree(g.key))}
                  data-testid={`tree-group-${g.key}`}
                >
                  <ChevronRight
                    size={13}
                    className="shrink-0 text-faint transition-transform duration-150"
                    style={{ transform: open ? "rotate(90deg)" : undefined }}
                    aria-hidden
                  />
                  <span className={"caps " + (emphasised ? "!text-fg" : "")}>{g.label}</span>
                  <span className="num ml-auto text-[11px] text-faint">{items.length}</span>
                </div>
                {open &&
                  items.map((e) => (
                    <TreeRow
                      key={e.id}
                      entity={e}
                      icon={g.icon}
                      hideable={g.hideable}
                      trailing={
                        e.category === "analysis" && status ? (
                          <Tip content={STATUS_TEXT[status]} side="right">
                            <span
                              className={"h-2 w-2 shrink-0 rounded-full " + STATUS_DOT[status]}
                              role="img"
                              aria-label={STATUS_TEXT[status]}
                              data-testid="analysis-status"
                              data-status={status}
                            />
                          </Tip>
                        ) : null
                      }
                    />
                  ))}
              </div>
            );
          })}
        </div>
        {guide && <div className="pt-2">{guide}</div>}
      </div>
      <LibraryFooter onOpen={onOpenLibrary} />
    </div>
  );
}

function groupKeys(e: KeyboardEvent<HTMLElement>, open: boolean, toggle: () => void) {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    moveFocus(e.currentTarget, e.key === "ArrowDown" ? 1 : -1);
  } else if ((e.key === "ArrowLeft" && open) || (e.key === "ArrowRight" && !open) || e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    toggle();
  }
}

function TreeRow({
  entity,
  icon: Icon,
  hideable,
  trailing,
}: {
  entity: Entity;
  icon: LucideIcon;
  hideable: boolean;
  trailing: ReactNode;
}) {
  const selected = useLab((s) => s.selection === entity.id);
  const hovered = useLab((s) => s.hover === entity.id);
  const select = useLab((s) => s.select);
  const setHover = useLab((s) => s.setHover);
  const toggleVisibility = useLab((s) => s.toggleVisibility);
  const camera = useLab((s) => s.camera);
  const frameable = entity.category !== "material" && entity.category !== "analysis";

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(e.currentTarget, e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      select(entity.id);
    }
  };

  return (
    <div
      role="treeitem"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      className={
        "group relative flex h-[26px] cursor-pointer items-center gap-2 pr-1.5 pl-[26px] outline-none transition-colors duration-100 " +
        (selected ? "bg-accent-weak text-fg" : hovered ? "bg-hover" : "hover:bg-hover") +
        " focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-inset"
      }
      onClick={() => select(entity.id)}
      onMouseEnter={() => setHover(entity.id)}
      onMouseLeave={() => setHover(null)}
      onKeyDown={onKeyDown}
      data-testid={`tree-item-${entity.id}`}
      data-selected={selected || undefined}
    >
      {selected && <span className="absolute top-0 bottom-0 left-0 w-0.5 bg-accent" aria-hidden />}
      <Icon size={14} className={"shrink-0 " + (selected ? "text-accent-text" : "text-muted")} aria-hidden />
      <span className={"min-w-0 flex-1 truncate " + (entity.visible ? "" : "text-faint italic")}>{entity.name}</span>
      {trailing}
      {frameable && (
        <button
          className="icon-btn h-5 w-5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          aria-label={`Frame ${entity.name} in view`}
          title="Frame in view"
          onClick={(e) => {
            e.stopPropagation();
            select(entity.id);
            camera("frame", entity.id);
          }}
        >
          <Focus size={13} />
        </button>
      )}
      {hideable && (
        <button
          className={"icon-btn h-5 w-5 " + (entity.visible ? "opacity-0 group-hover:opacity-100 focus-visible:opacity-100" : "")}
          aria-label={`${entity.visible ? "Hide" : "Show"} ${entity.name}`}
          aria-pressed={!entity.visible}
          title={entity.visible ? "Hide (display only — still acts in the analysis)" : "Show"}
          onClick={(e) => {
            e.stopPropagation();
            toggleVisibility(entity.id);
          }}
          data-testid={`visibility-${entity.id}`}
        >
          {entity.visible ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
      )}
    </div>
  );
}

export function PanelTitle({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="flex h-8 shrink-0 items-center gap-2 border-b border-line px-3">
      <h2 className="caps !text-fg">{title}</h2>
      <span className="ml-auto min-w-0 text-[11.5px]">{aside}</span>
    </div>
  );
}

function LibraryFooter({ onOpen }: { onOpen(): void }) {
  return (
    <div className="shrink-0 border-t border-line p-1.5">
      <button
        className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-sm px-1.5 text-left text-muted hover:bg-hover hover:text-fg"
        onClick={onOpen}
        data-testid="tree-library"
      >
        <LibraryBig size={14} aria-hidden />
        <span className="flex-1">Space Structures Library</span>
        <span className="chip chip-info h-[18px] text-[10px]">Soon</span>
      </button>
    </div>
  );
}
