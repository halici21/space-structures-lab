/**
 * Desktop CAD layout:
 *   toolbar / ribbon
 *   model tree | viewport | inspector   (resizable, collapsible side panes)
 *   analysis dock (result strip + tabs)
 *   status bar
 */
import { lazy, Suspense, useEffect, useState } from "react";
import { Group, Panel, Separator, usePanelRef } from "react-resizable-panels";
import { useSolved } from "@/state/store";
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
  const tree = usePanelRef();
  const inspector = usePanelRef();
  const [panes, setPanes] = useState({ tree: true, inspector: true });
  const [libraryOpen, setLibraryOpen] = useState(false);

  // Narrow laptops start with the tree folded so the viewport keeps priority.
  useEffect(() => {
    if (window.innerWidth < 1180) {
      tree.current?.collapse();
      setPanes((p) => ({ ...p, tree: false }));
    }
  }, [tree]);

  const toggle = (p: "tree" | "inspector") => {
    const ref = p === "tree" ? tree : inspector;
    if (ref.current?.isCollapsed()) ref.current.expand();
    else ref.current?.collapse();
  };

  return (
    <div className="flex h-full flex-col" data-testid="desktop-shell">
      <Toolbar onOpenLibrary={() => setLibraryOpen(true)} panes={panes} onTogglePane={toggle} />
      {solved && <Ribbon onOpenLibrary={() => setLibraryOpen(true)} />}

      <div className="min-h-0 flex-1">
        <Group orientation="horizontal" className="h-full">
          <Panel
            id="tree"
            panelRef={tree}
            defaultSize="256px"
            minSize="208px"
            maxSize="380px"
            collapsible
            collapsedSize="0px"
            groupResizeBehavior="preserve-pixel-size"
            onResize={(s) => setPanes((p) => (p.tree === s.inPixels > 0 ? p : { ...p, tree: s.inPixels > 0 }))}
            className="bg-panel"
          >
            <aside className="h-full overflow-hidden" aria-label="Model tree panel">
              <ModelTree
                onOpenLibrary={() => setLibraryOpen(true)}
                guide={solved?.ok && panes.tree ? <Onboarding variant="panel" /> : null}
              />
            </aside>
          </Panel>
          <Separator className="sep-v" id="sep-tree" />
          <Panel id="viewport" minSize="360px">
            <main className="h-full" aria-label="Viewport">
              {solved?.ok ? (
                <Suspense fallback={<ViewportLoading />}>
                  <Viewport solved={solved.value} guideInViewport={!panes.tree} />
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
            defaultSize="328px"
            minSize="288px"
            maxSize="440px"
            collapsible
            collapsedSize="0px"
            groupResizeBehavior="preserve-pixel-size"
            onResize={(s) => setPanes((p) => (p.inspector === s.inPixels > 0 ? p : { ...p, inspector: s.inPixels > 0 }))}
            className="bg-panel"
          >
            <aside className="h-full overflow-hidden" aria-label="Inspector panel">
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
