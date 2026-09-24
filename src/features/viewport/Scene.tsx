import { GizmoHelper, GizmoViewport, Grid } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import type { SolvedDocument } from "@/model/document";
import { contourEnabled, useLab } from "@/state/store";
import { BeamSolid } from "./BeamSolid";
import { CameraRig, type Bounds, type Insets } from "./CameraRig";
import { Dimensions, FixedSupportGlyph, ForceArrow, UndeformedGhost } from "./Glyphs";
import { LabelProjector, type LabelNodes, type LabelSpec } from "./Labels";
import { TestHooks } from "./TestHooks";
import type { ScenePalette } from "./palette";
import {
  arrowLength,
  bendingAxes,
  displayScale,
  glyphSize,
  niceCell,
  sceneBounds,
  stationFrame,
  type Vec3,
} from "./sceneMath";

/** Selection by click only: ignore clicks that ended an orbit/pan drag. */
const CLICK_TOLERANCE_PX = 4;

export function Scene({
  solved,
  palette,
  autoFrame,
  reducedMotion,
  loadFraction,
  labels,
  labelNodes,
  insets,
}: {
  solved: SolvedDocument;
  palette: ScenePalette;
  autoFrame: boolean;
  reducedMotion: boolean;
  loadFraction: number;
  labels: LabelSpec[];
  labelNodes: LabelNodes;
  insets: Insets;
}) {
  const { result, resolved } = solved;
  const view = useLab((s) => s.view);
  const workspace = useLab((s) => s.workspace);
  const selection = useLab((s) => s.selection);
  const hover = useLab((s) => s.hover);
  const select = useLab((s) => s.select);
  const setHover = useLab((s) => s.setHover);
  const cameraCommand = useLab((s) => s.cameraCommand);

  const scale = displayScale(view.deformScale, result);
  const fullScale = view.showDeformed ? scale.factor : 0;
  const s = fullScale * loadFraction;
  const contour = contourEnabled(view, workspace) && view.showDeformed;

  // Frame for the target shape so the camera stays still during a load ramp.
  const bounds = useMemo(() => sceneBounds(result, fullScale, view.showDeformed), [result, fullScale, view.showDeformed]);
  const boundsFor = (target: string | undefined): Bounds => {
    const L = result.input.length;
    const g = glyphSize(result);
    const { p, halfP, halfQ } = bendingAxes(result);
    if (target === resolved.support.id) return { min: [-g, -g, -0.6 * g], max: [g, g, 0.4 * g] };
    if (target === resolved.load.id) {
      const tip = stationFrame(result, L, s).center;
      const a = tip;
      const b: Vec3 = [tip[0] + p[0] * (halfP + arrowLength(result)), tip[1] + p[1] * (halfP + arrowLength(result)), tip[2]];
      return {
        min: [Math.min(a[0], b[0]) - g, Math.min(a[1], b[1]) - g, L - g],
        max: [Math.max(a[0], b[0]) + g, Math.max(a[1], b[1]) + g, L + g],
      };
    }
    if (target === resolved.beam.id) {
      const min: Vec3 = [-halfQ, -halfP, 0];
      const max: Vec3 = [halfQ, halfP, L];
      for (let i = 0; i <= 16; i++) {
        const c = stationFrame(result, (L * i) / 16, s).center;
        for (let k = 0; k < 3; k++) {
          min[k] = Math.min(min[k]!, c[k]! - halfP);
          max[k] = Math.max(max[k]!, c[k]! + halfP);
        }
      }
      return { min, max };
    }
    return bounds;
  };

  const pick = (id: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > CLICK_TOLERANCE_PX) return;
    select(id);
  };
  const hoverFor = (id: string) => (on: boolean) => setHover(on ? id : hover === id ? null : hover);

  const beam = resolved.beam;
  const support = resolved.support;
  const load = resolved.load;
  const L = result.input.length;
  const g = glyphSize(result);
  const cell = niceCell(L);

  return (
    <>
      <color attach="background" args={[palette.background]} />
      <hemisphereLight args={["#ffffff", palette.background, 0.9]} />
      <directionalLight position={[-3, 5, 4]} intensity={1.5} />
      <directionalLight position={[4, 2, -3]} intensity={0.45} />

      <CameraRig
        projection={view.projection}
        bounds={bounds}
        boundsFor={boundsFor}
        command={cameraCommand}
        plane={result.input.load.plane}
        autoFrame={autoFrame}
        reducedMotion={reducedMotion}
        insets={insets}
      />

      {view.showGrid && (
        <Grid
          position={[0, -Math.max(result.input.section.h, 1.1 * g) / 2 - 1e-4, L / 2]}
          args={[10, 10]}
          cellSize={cell}
          sectionSize={cell * 10}
          cellThickness={0.6}
          sectionThickness={1}
          cellColor={palette.gridCell}
          sectionColor={palette.gridSection}
          infiniteGrid
          fadeDistance={L * 6}
          fadeStrength={1.5}
          followCamera={false}
        />
      )}

      {beam.visible && view.showUndeformed && <UndeformedGhost result={result} palette={palette} />}

      {beam.visible && view.showDeformed && (
        <BeamSolid
          result={result}
          scale={s}
          loadFraction={loadFraction}
          contour={contour}
          palette={palette}
          selected={selection === beam.id}
          hovered={hover === beam.id}
          onSelect={pick(beam.id)}
          onHover={hoverFor(beam.id)}
        />
      )}

      {/* With the deformed solid hidden, the undeformed box becomes the pickable body. */}
      {beam.visible && !view.showDeformed && (
        <BeamSolid
          result={result}
          scale={0}
          loadFraction={1}
          contour={false}
          palette={palette}
          selected={selection === beam.id}
          hovered={hover === beam.id}
          onSelect={pick(beam.id)}
          onHover={hoverFor(beam.id)}
        />
      )}

      {support.visible && (
        <FixedSupportGlyph
          result={result}
          palette={palette}
          selected={selection === support.id}
          hovered={hover === support.id}
          onSelect={pick(support.id)}
          onHover={hoverFor(support.id)}
        />
      )}

      {load.visible && (
        <ForceArrow
          result={result}
          scale={s}
          loadFraction={loadFraction}
          deformed={view.showDeformed}
          palette={palette}
          selected={selection === load.id}
          hovered={hover === load.id}
          onSelect={pick(load.id)}
          onHover={hoverFor(load.id)}
        />
      )}

      {view.showDimensions && beam.visible && (
        <Dimensions
          result={result}
          scale={s}
          deformed={view.showDeformed}
          palette={palette}
        />
      )}

      <LabelProjector labels={labels} nodes={labelNodes} />
      {import.meta.env.DEV && <TestHooks />}

      <GizmoHelper alignment="bottom-left" margin={[58, 92]}>
        <GizmoViewport
          axisColors={[palette.axisX, palette.axisY, palette.axisZ]}
          labelColor={palette.axisLabel}
          axisHeadScale={0.9}
          hideNegativeAxes
        />
      </GizmoHelper>
    </>
  );
}
