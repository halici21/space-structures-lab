/**
 * 3D viewport: canvas + in-viewport HUD. Render-on-demand; the scene only
 * draws when the camera moves or the model/view changes.
 */
import * as Popover from "@radix-ui/react-popover";
import { Canvas } from "@react-three/fiber";
import { Box, Home, Layers, Maximize, Scan } from "lucide-react";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatNumber, formatQuantityText } from "@/core/units";
import { Segmented } from "@/components/Segmented";
import { Tex } from "@/components/Tex";
import { Tip } from "@/components/Tip";
import type { SolvedDocument } from "@/model/document";
import { contourEnabled, useLab, type DeformScale } from "@/state/store";
import { LabelOverlay, type LabelNodes, type LabelSpec } from "./Labels";
import { DEFAULT_INSETS, type Insets } from "./CameraRig";
import { GUIDE_WIDTH, Onboarding } from "./Onboarding";
import { useScenePalette } from "./palette";
import { Scene } from "./Scene";
import { displayScale, divergingColor, labelAnchors } from "./sceneMath";

/** Text labels for the load and the dimensions, anchored in world space. */
function useLabels(solved: SolvedDocument): LabelSpec[] {
  const view = useLab((s) => s.view);
  const system = useLab((s) => s.unitSystem);
  const selection = useLab((s) => s.selection);
  const { result, resolved } = solved;
  return useMemo(() => {
    const scale = displayScale(view.deformScale, result);
    const anchors = labelAnchors(result, scale.factor, {
      deformed: view.showDeformed,
      showForce: resolved.load.visible,
      showDimensions: view.showDimensions && resolved.beam.visible,
    });
    const drawnNote = scale.exaggerated || scale.reduced ? `drawn ×${formatNumber(scale.factor, 3)}` : null;
    return anchors.map((a): LabelSpec => {
      if (a.id === "force")
        return {
          ...a,
          tone: "force",
          highlighted: selection === resolved.load.id,
          content: `F = ${formatQuantityText(resolved.load.magnitude, "force", system)}`,
        };
      if (a.id === "length") return { ...a, tone: "muted", content: `L = ${formatQuantityText(result.input.length, "span", system)}` };
      return {
        ...a,
        tone: "default",
        content: (
          <>
            δ = {formatQuantityText(result.tipDeflection, "displacement", system)}
            {drawnNote && <span className="ml-1.5 text-caution">{drawnNote}</span>}
          </>
        ),
      };
    });
  }, [result, resolved, view.deformScale, view.showDeformed, view.showDimensions, system, selection]);
}

class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="grid h-full place-items-center p-6 text-center text-muted">
          <div>
            <p className="mb-1 text-fg">3D view unavailable</p>
            <p>WebGL could not start in this browser. Editing, results and Learn still work.</p>
          </div>
        </div>
      );
    return this.props.children;
  }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}

export default function Viewport({
  solved,
  compact = false,
  guideInViewport = false,
}: {
  solved: SolvedDocument;
  compact?: boolean;
  /** Show the getting-started guide inside the viewport (when the tree panel is closed). */
  guideInViewport?: boolean;
}) {
  const theme = useLab((s) => s.theme);
  const view = useLab((s) => s.view);
  const select = useLab((s) => s.select);
  const palette = useScenePalette(theme);
  const reduced = useReducedMotion();
  const down = useRef<{ x: number; y: number } | null>(null);
  const labelNodes: LabelNodes = useRef({});
  const labels = useLabels(solved);
  const hoveringObject = useLab((s) => s.hover !== null);
  const [pointerInside, setPointerInside] = useState(false);
  const system = useLab((s) => s.unitSystem);
  const scale = displayScale(view.deformScale, solved.result);
  const description =
    `3D view of ${solved.resolved.beam.name}: cantilever, ` +
    `${formatQuantityText(solved.result.input.length, "span", system)} long, ` +
    `tip deflection ${formatQuantityText(solved.result.tipDeflection, "displacement", system)}` +
    (scale.exaggerated || scale.reduced ? `, drawn at ×${formatNumber(scale.factor, 3)}.` : ", drawn at true scale.");
  const guide = useLab((s) => s.onboarding);
  const box = useRef<HTMLDivElement>(null);
  const [short, setShort] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setShort(e.contentRect.height < 460));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const guideOverlay = guideInViewport && !compact && !guide.dismissed;
  const guideBlocksLeft = guideOverlay && !guide.collapsed && !short;
  const insets: Insets = useMemo(
    () =>
      compact
        ? { left: 16, right: 16, top: 64, bottom: 56 }
        : { ...DEFAULT_INSETS, left: guideBlocksLeft ? GUIDE_WIDTH + 24 : DEFAULT_INSETS.left },
    [compact, guideBlocksLeft],
  );

  return (
    <div
      ref={box}
      className="relative h-full w-full overflow-hidden bg-viewport"
      data-testid="viewport"
      onPointerDown={(e) => (down.current = { x: e.clientX, y: e.clientY })}
      onPointerEnter={() => setPointerInside(true)}
      onPointerLeave={() => setPointerInside(false)}
      style={{ cursor: pointerInside && hoveringObject ? "pointer" : undefined }}
    >
      <CanvasBoundary>
        <Canvas
          frameloop="demand"
          dpr={[1, 2]}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          role="img"
          aria-label={description}
          onPointerMissed={(e) => {
            const d = down.current;
            if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) return;
            select(null);
          }}
        >
          <Scene
            solved={solved}
            palette={palette}
            autoFrame={view.autoFrame}
            reducedMotion={reduced}
            labels={labels}
            labelNodes={labelNodes}
            insets={insets}
          />
        </Canvas>
        <LabelOverlay labels={labels} nodes={labelNodes} />
      </CanvasBoundary>

      {guideOverlay && <Onboarding variant="overlay" forceCollapsed={short} />}
      <ViewTools compact={compact} />
      <DeformationBar solved={solved} compact={compact} />
      <ContourLegend solved={solved} compact={compact} />
    </div>
  );
}

// ----------------------------------------------------------------- view tools

function ViewTools({ compact }: { compact: boolean }) {
  const camera = useLab((s) => s.camera);
  const view = useLab((s) => s.view);
  const setView = useLab((s) => s.setView);
  const ortho = view.projection === "orthographic";

  return (
    <div
      className={
        "absolute top-2 right-2 flex items-center gap-0.5 rounded-md border border-line bg-panel/90 p-0.5 backdrop-blur-sm"
      }
      role="toolbar"
      aria-label="View tools"
    >
      <Tip content={<>Fit to view <kbd>F</kbd></>}>
        <button className="icon-btn" aria-label="Fit to view" onClick={() => camera("fit")} data-testid="vp-fit">
          <Maximize size={15} />
        </button>
      </Tip>
      <Tip content={<>Home view <kbd>H</kbd></>}>
        <button className="icon-btn" aria-label="Home view" onClick={() => camera("reset")} data-testid="vp-home">
          <Home size={15} />
        </button>
      </Tip>
      <span className="mx-0.5 h-4 w-px bg-line" aria-hidden />
      <Tip content={<>{ortho ? "Orthographic" : "Perspective"} — switch <kbd>P</kbd></>}>
        <button
          className="btn btn-ghost h-[26px] px-2 text-[11.5px]"
          aria-label={`Projection: ${ortho ? "orthographic" : "perspective"}. Switch projection`}
          onClick={() => setView({ projection: ortho ? "perspective" : "orthographic" })}
          data-testid="vp-projection"
        >
          {ortho ? <Scan size={14} /> : <Box size={14} />}
          {!compact && (ortho ? "Ortho" : "Persp")}
        </button>
      </Tip>
      <DisplayMenu />
    </div>
  );
}

function Check({ label, checked, onChange, testId }: { label: string; checked: boolean; onChange(v: boolean): void; testId?: string }) {
  return (
    <label className="flex h-7 cursor-pointer items-center gap-2 rounded-sm px-2 hover:bg-hover">
      <input
        type="checkbox"
        className="accent-[var(--accent)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        data-testid={testId}
      />
      <span>{label}</span>
    </label>
  );
}

function DisplayMenu() {
  const view = useLab((s) => s.view);
  const workspace = useLab((s) => s.workspace);
  const setView = useLab((s) => s.setView);
  const contourOn = contourEnabled(view, workspace);
  return (
    <Popover.Root>
      <Tip content="Display options">
        <Popover.Trigger asChild>
          <button className="icon-btn" aria-label="Display options" data-testid="vp-display">
            <Layers size={15} />
          </button>
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Content className="pop w-56 p-1.5" align="end" sideOffset={6}>
          <p className="caps px-2 pt-1 pb-1.5">Display</p>
          <Check label="Deformed shape" checked={view.showDeformed} onChange={(v) => setView({ showDeformed: v })} testId="opt-deformed" />
          <Check label="Undeformed outline" checked={view.showUndeformed} onChange={(v) => setView({ showUndeformed: v })} testId="opt-undeformed" />
          <Check
            label="Bending-stress contour"
            checked={contourOn}
            onChange={(v) => setView({ contour: v ? "on" : "off" })}
            testId="opt-contour"
          />
          <Check label="Dimensions" checked={view.showDimensions} onChange={(v) => setView({ showDimensions: v })} />
          <Check label="Grid" checked={view.showGrid} onChange={(v) => setView({ showGrid: v })} />
          <div className="my-1 h-px bg-line" />
          <Check label="Auto-frame after edits" checked={view.autoFrame} onChange={(v) => setView({ autoFrame: v })} />
          {view.contour !== "auto" && (
            <button className="btn btn-ghost mt-1 w-full justify-start text-muted" onClick={() => setView({ contour: "auto" })}>
              Contour: follow workspace
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ------------------------------------------------------------ deformation bar

const SCALE_OPTIONS: { value: DeformScale; label: string }[] = [
  { value: "1", label: "1×" },
  { value: "10", label: "10×" },
  { value: "50", label: "50×" },
  { value: "auto", label: "Auto" },
];

function DeformationBar({ solved, compact }: { solved: SolvedDocument; compact: boolean }) {
  const view = useLab((s) => s.view);
  const setView = useLab((s) => s.setView);
  const system = useLab((s) => s.unitSystem);
  const scale = displayScale(view.deformScale, solved.result);
  const trueTip = formatQuantityText(solved.result.tipDeflection, "displacement", system);

  let badge: ReactNode;
  if (!view.showDeformed) badge = <span className="chip chip-info">Deformed shape hidden</span>;
  else if (scale.exaggerated)
    badge = (
      <span className="chip chip-caution" data-testid="scale-badge">
        Exaggerated ×{formatNumber(scale.factor, 3)}
        {!compact && <span className="font-normal">· true δ {trueTip}</span>}
      </span>
    );
  else if (scale.reduced)
    badge = (
      <span className="chip chip-caution" data-testid="scale-badge">
        Reduced ×{formatNumber(scale.factor, 3)}
        {!compact && <span className="font-normal">· true δ {trueTip}</span>}
      </span>
    );
  else
    badge = (
      <span className="chip chip-ok" data-testid="scale-badge">
        True scale
      </span>
    );

  return (
    <div
      className={
        "absolute bottom-2 left-2 flex items-center gap-2 rounded-md border border-line bg-panel/90 py-1 pr-1.5 pl-2.5 backdrop-blur-sm " +
        (compact ? "max-w-[calc(100%-16px)]" : "")
      }
    >
      {!compact && <span className="caps">Deformation</span>}
      <Segmented
        label="Deformation display scale"
        value={view.deformScale}
        options={SCALE_OPTIONS}
        onChange={(v) => setView({ deformScale: v, showDeformed: true })}
        testId="deform-scale"
      />
      {badge}
    </div>
  );
}

// ------------------------------------------------------------- contour legend

function ContourLegend({ solved, compact }: { solved: SolvedDocument; compact: boolean }) {
  const view = useLab((s) => s.view);
  const workspace = useLab((s) => s.workspace);
  const system = useLab((s) => s.unitSystem);
  if (!contourEnabled(view, workspace) || !view.showDeformed || compact) return null;
  const smax = solved.result.maxBendingStress;
  const stops = [-1, -0.5, 0, 0.5, 1]
    .map((t) => {
      const [r, g, b] = divergingColor(t);
      return `rgb(${r * 255} ${g * 255} ${b * 255}) ${((t + 1) / 2) * 100}%`;
    })
    .join(", ");
  return (
    <div className="absolute right-2 bottom-2 w-52 rounded-md border border-line bg-panel/90 px-2.5 py-2 backdrop-blur-sm" data-testid="contour-legend">
      <div className="mb-1.5 flex items-baseline gap-1.5">
        <span className="caps">Bending stress</span>
        <span className="text-muted">
          <Tex tex="\sigma_{zz}" />
        </span>
      </div>
      <div className="h-2 rounded-sm" style={{ background: `linear-gradient(90deg, ${stops})` }} />
      <div className="num mt-1 flex justify-between text-[11px] text-muted">
        <span>−{formatQuantityText(smax, "stress", system, 3)}</span>
        <span>0</span>
        <span>+{formatQuantityText(smax, "stress", system, 3)}</span>
      </div>
      <div className="mt-0.5 flex justify-between text-[10.5px] text-faint">
        <span>compression</span>
        <span>tension</span>
      </div>
    </div>
  );
}
