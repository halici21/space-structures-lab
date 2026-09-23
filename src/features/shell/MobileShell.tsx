/**
 * Phone layout. The CAD layout is not squeezed onto 390 px: the viewport is
 * full-bleed, and the tree, inspector, results and Learn open as bottom sheets.
 * Mobile is for viewing and light editing.
 */
import * as Dialog from "@radix-ui/react-dialog";
import { BookOpen, ChartLine, ListTree, SlidersHorizontal, X } from "lucide-react";
import { lazy, Suspense, useState, type ReactNode } from "react";
import { formatQuantityText } from "@/core/units";
import { useLab, useSolved, type MobileSheet } from "@/state/store";
import { Inspector } from "../inspector/Inspector";
import { AssumptionsPanel } from "../learn/AssumptionsPanel";
import { LearnPanel } from "../learn/LearnPanel";
import { LibraryDialog } from "../library/Library";
import { ResultDetails } from "../results/ResultDetails";
import { ModelTree } from "../tree/ModelTree";
import { ViewportLoading } from "./DesktopShell";
import { EmptyState } from "./EmptyState";
import { BrandMark, WorkspaceTabs } from "./Toolbar";

const Viewport = lazy(() => import("../viewport/Viewport"));

function Sheet({ id, title, children }: { id: Exclude<MobileSheet, null>; title: string; children: ReactNode }) {
  const open = useLab((s) => s.mobileSheet === id);
  const setSheet = useLab((s) => s.setMobileSheet);
  return (
    <Dialog.Root open={open} onOpenChange={(o) => setSheet(o ? id : null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/35" />
        <Dialog.Content
          className="fixed right-0 bottom-0 left-0 z-50 flex max-h-[62vh] flex-col rounded-t-lg border-t border-line-strong bg-panel shadow-[var(--shadow-pop)] outline-none"
          style={{ animation: "sheet-in 180ms var(--ease)" }}
          aria-describedby={undefined}
          data-testid={`sheet-${id}`}
        >
          <div className="mx-auto mt-1.5 h-1 w-9 rounded-full bg-line-strong" aria-hidden />
          <div className="flex h-10 shrink-0 items-center border-b border-line px-3">
            <Dialog.Title className="caps flex-1 !text-fg">{title}</Dialog.Title>
            <Dialog.Close className="icon-btn" aria-label={`Close ${title}`}>
              <X size={16} />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function MobileShell() {
  const solved = useSolved();
  const setSheet = useLab((s) => s.setMobileSheet);
  const system = useLab((s) => s.unitSystem);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const ok = solved?.ok ? solved.value : null;

  const nav: { id: Exclude<MobileSheet, null>; label: string; icon: ReactNode }[] = [
    { id: "tree", label: "Model", icon: <ListTree size={17} /> },
    { id: "inspector", label: "Properties", icon: <SlidersHorizontal size={17} /> },
    { id: "results", label: "Results", icon: <ChartLine size={17} /> },
    { id: "learn", label: "Learn", icon: <BookOpen size={17} /> },
  ];

  return (
    <div className="flex h-full flex-col" data-testid="mobile-shell">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line bg-panel px-3">
        <BrandMark />
        <span className="truncate font-semibold">Space Structures Lab</span>
      </header>
      {ok && (
        <div className="h-9 shrink-0 border-b border-line bg-panel">
          <WorkspaceTabs compact />
        </div>
      )}

      <main className="relative min-h-0 flex-1">
        {ok ? (
          <Suspense fallback={<ViewportLoading />}>
            <Viewport solved={ok} compact />
          </Suspense>
        ) : (
          <EmptyState onOpenLibrary={() => setLibraryOpen(true)} />
        )}
        {ok && (
          <button
            className="absolute top-2 left-2 flex max-w-[calc(100%-150px)] cursor-pointer flex-col items-start rounded-md border border-line bg-panel/95 px-2.5 py-1.5 text-left backdrop-blur-sm"
            onClick={() => setSheet("results")}
            data-testid="mobile-result-chip"
          >
            <span className="caps !text-[10px]">Static bending</span>
            <span className="num text-[12px] text-fg">
              δ {formatQuantityText(ok.result.tipDeflection, "displacement", system)} · σ{" "}
              {formatQuantityText(ok.result.maxBendingStress, "stress", system, 3)}
            </span>
          </button>
        )}
      </main>

      {ok && (
        <nav className="grid h-14 shrink-0 grid-cols-4 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)]" aria-label="Panels">
          {nav.map((n) => (
            <button key={n.id} className="flex cursor-pointer flex-col items-center justify-center gap-0.5 text-[11px] text-muted active:text-fg" onClick={() => setSheet(n.id)} data-testid={`mobile-nav-${n.id}`}>
              {n.icon}
              {n.label}
            </button>
          ))}
        </nav>
      )}

      {ok && (
        <>
          <Sheet id="tree" title="Model">
            <ModelTree onOpenLibrary={() => setLibraryOpen(true)} />
          </Sheet>
          <Sheet id="inspector" title="Properties">
            <Inspector showTitle={false} />
          </Sheet>
          <Sheet id="results" title="Results">
            <div className="p-3">
              <ResultDetails solved={ok} />
            </div>
          </Sheet>
          <Sheet id="learn" title="Learn">
            <div className="space-y-5 p-3">
              <LearnPanel solved={ok} />
              <AssumptionsPanel solved={ok} />
            </div>
          </Sheet>
        </>
      )}
      <LibraryDialog open={libraryOpen} onOpenChange={setLibraryOpen} />
    </div>
  );
}
