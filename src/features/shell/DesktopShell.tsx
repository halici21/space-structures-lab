/**
 * Desktop CAD layout:
 *   toolbar / ribbon
 *   model tree | viewport | inspector   (resizable, collapsible side panes)
 *   analysis dock (result strip + tabs)
 *   status bar
 */
import { lazy, Suspense, useEffect, useState } from "react";
import { Group, Panel, Separator, usePanelRef } from "react-resizable-panels";
import { useLab, useSolved } from "@/state/store";
import { Inspector } from "../inspector/Inspector";
import { LibraryDialog } from "../library/Library";
import { ModelTree } from "../tree/ModelTree";
import { Onboarding } from "../viewport/Onboarding";
import { Dock } from "./Dock";
import { EmptyState } from "./EmptyState";
import { StatusBar } from "./StatusBar";
import { Ribbon, Toolbar } from "./Toolbar";

const Viewport = lazy(() => import("../viewport/Viewport"));

export function ViewportLoading() {
  return <div className="grid h-full place-items-center bg-viewport text-muted">Loading 3D view…</div>;
}

export function DesktopShell() {
  const solved = useSolved();
  const hasModel = useLab((s) => s.doc !== null);
  const tree = usePanelRef();
  const inspector = usePanelRef();
  const [panes, setPanes] = useState({ tree: false, inspector: false });
  const [toolsOpen, setToolsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  // Keep the first view focused. When a model exists, open its inspector so
  // the user can edit immediately; the model tree stays available on demand.
  useEffect(() => {
    tree.current?.collapse();
    if (hasModel) inspector.current?.expand();
    else inspector.current?.collapse();
    setPanes({ tree: false, inspector: hasModel });
  }, [hasModel, inspector, tree]);

  const openInspector = () => {
    if (window.innerWidth < 1180) tree.current?.collapse();
    inspector.current?.expand();
  };

  const toggle = (p: "tree" | "inspector") => {
    const ref = p === "tree" ? tree : inspector;
    if (ref.current?.isCollapsed()) {
      // On laptop widths, keep one drawer open at a time so the viewport stays usable.
      if (window.innerWidth < 1180) {
        const other = p === "tree" ? inspector : tree;
        other.current?.collapse();
      }
      ref.current.expand();
    } else {
      ref.current?.collapse();
    }
  };

  return (
    <div className="flex h-full flex-col" data-testid="desktop-shell">
      <Toolbar
        onOpenLibrary={() => setLibraryOpen(true)}
        panes={panes}
        onTogglePane={toggle}
        toolsOpen={toolsOpen}
        onToggleTools={() => setToolsOpen((open) => !open)}
      />
      {solved && (
        <div className="workspace-tools-wrap shrink-0" data-open={toolsOpen} aria-hidden={!toolsOpen} inert={!toolsOpen}>
          <Ribbon onOpenLibrary={() => setLibraryOpen(true)} />
        </div>
      )}

      <div className="min-h-0 flex-1">
        <Group orientation="horizontal" className="desktop-panel-group h-full">
          <Panel
            id="tree"
            panelRef={tree}
            defaultSize="0px"
            minSize="208px"
            maxSize="380px"
            collapsible
            collapsedSize="0px"
            groupResizeBehavior="preserve-pixel-size"
            onResize={(s) => setPanes((p) => (p.tree === s.inPixels > 0 ? p : { ...p, tree: s.inPixels > 0 }))}
            className="drawer-panel bg-panel"
          >
            <aside
              className="drawer-content drawer-content-left h-full overflow-hidden"
              aria-label="Model tree panel"
              aria-hidden={!panes.tree}
              inert={!panes.tree}
              data-open={panes.tree}
            >
              <ModelTree
                onOpenLibrary={() => setLibraryOpen(true)}
                guide={solved?.ok && panes.tree ? <Onboarding variant="panel" onShowInspector={openInspector} /> : null}
              />
            </aside>
          </Panel>
          <Separator className="sep-v" id="sep-tree" />
          <Panel id="viewport" minSize="360px">
            <main className="h-full" aria-label="Viewport">
              {solved?.ok ? (
                <Suspense fallback={<ViewportLoading />}>
                  <Viewport solved={solved.value} guideInViewport={!panes.tree} onShowInspector={openInspector} />
                </Suspense>
              ) : solved ? (
                <div className="grid h-full place-items-center bg-viewport p-6 text-violated">{solved.reason}</div>
              ) : (
                <EmptyState onOpenLibrary={() => setLibraryOpen(true)} />
              )}
            </main>
          </Panel>
          <Separator className="sep-v" id="sep-inspector" />
          <Panel
            id="inspector"
            panelRef={inspector}
            defaultSize="0px"
            minSize="336px"
            maxSize="440px"
            collapsible
            collapsedSize="0px"
            groupResizeBehavior="preserve-pixel-size"
            onResize={(s) => setPanes((p) => (p.inspector === s.inPixels > 0 ? p : { ...p, inspector: s.inPixels > 0 }))}
            className="drawer-panel bg-panel"
          >
            <aside
              className="drawer-content drawer-content-right h-full overflow-hidden"
              aria-label="Inspector panel"
              aria-hidden={!panes.inspector}
              inert={!panes.inspector}
              data-open={panes.inspector}
            >
              <Inspector />
            </aside>
          </Panel>
        </Group>
      </div>

      {solved?.ok && <Dock solved={solved.value} />}
      <StatusBar />
      <LibraryDialog open={libraryOpen} onOpenChange={setLibraryOpen} />
    </div>
  );
}
