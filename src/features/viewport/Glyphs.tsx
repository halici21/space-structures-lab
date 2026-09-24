/**
 * Engineering glyphs: undeformed ghost, fixed support, tip force arrow and
 * dimension lines. Sizes derive from `glyphSize` so they read at any beam
 * proportion; colours come from the scene palette.
 */
import { Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import type { CantileverResult } from "@/lib/structures/cantilever";
import type { ScenePalette } from "./palette";
import {
  arrowLength,
  bendingAxes,
  deflectionDimension,
  glyphSize,
  lengthDimension,
  stationFrame,
  type Vec3,
} from "./sceneMath";

const add = (a: Vec3, b: Vec3, s = 1): Vec3 => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];

interface Pickable {
  selected: boolean;
  hovered: boolean;
  onSelect(e: ThreeEvent<MouseEvent>): void;
  onHover(on: boolean): void;
}

const hoverHandlers = (onHover: (on: boolean) => void) => ({
  onPointerOver: (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHover(true);
  },
  onPointerOut: () => onHover(false),
});

// ------------------------------------------------------------ undeformed ghost

export function UndeformedGhost({ result, palette }: { result: CantileverResult; palette: ScenePalette }) {
  const points = useMemo(() => {
    const { b, h } = result.input.section;
    const L = result.input.length;
    const x = b / 2;
    const y = h / 2;
    const c = (sx: number, sy: number, z: number): Vec3 => [sx * x, sy * y, z];
    const ring = (z: number) => [c(-1, -1, z), c(1, -1, z), c(1, 1, z), c(-1, 1, z)];
    const r0 = ring(0);
    const r1 = ring(L);
    const segs: Vec3[] = [];
    for (let i = 0; i < 4; i++) {
      segs.push(r0[i]!, r0[(i + 1) % 4]!, r1[i]!, r1[(i + 1) % 4]!, r0[i]!, r1[i]!);
    }
    return segs;
  }, [result]);
  const L = result.input.length;
  return (
    <Line
      points={points}
      segments
      color={palette.ghost}
      lineWidth={1}
      dashed
      dashSize={L / 90}
      gapSize={L / 140}
      transparent
      opacity={0.9}
      raycast={() => null}
    />
  );
}

// --------------------------------------------------------------- fixed support

export function FixedSupportGlyph({
  result,
  palette,
  selected,
  hovered,
  onSelect,
  onHover,
}: { result: CantileverResult; palette: ScenePalette } & Pickable) {
  const g = glyphSize(result);
  const { b, h } = result.input.section;
  const W = Math.max(1.8 * b, 1.1 * g);
  const H = Math.max(1.8 * h, 1.1 * g);
  const t = 0.1 * g;
  const color = selected ? palette.accent : hovered ? palette.accent : palette.support;

  const hatch = useMemo(() => {
    const segs: Vec3[] = [];
    const n = 7;
    const d = 0.32 * g;
    for (const x of [-W / 2, W / 2]) {
      for (let i = 0; i < n; i++) {
        const y = H / 2 - (H * i) / (n - 1);
        segs.push([x, y, -t], [x, y - d, -t - d]);
      }
    }
    return segs;
  }, [W, H, t, g]);

  return (
    <group name="support" onClick={onSelect} {...hoverHandlers(onHover)}>
      <mesh position={[0, 0, -t / 2]}>
        <boxGeometry args={[W, H, t]} />
        <meshStandardMaterial
          color={color}
          roughness={0.7}
          metalness={0.05}
          transparent
          opacity={0.92}
          emissive={selected ? palette.accent : "#000000"}
          emissiveIntensity={selected ? 0.25 : 0}
        />
      </mesh>
      <Line points={hatch} segments color={color} lineWidth={1.1} raycast={() => null} />
      {/* generous invisible hit volume so the thin glyph is easy to pick */}
      <mesh position={[0, 0, -0.25 * g]}>
        <boxGeometry args={[W * 1.1, H * 1.1, 0.55 * g]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ------------------------------------------------------------------ tip force

export function ForceArrow({
  result,
  scale,
  loadFraction,
  deformed,
  palette,
  selected,
  hovered,
  onSelect,
  onHover,
}: {
  result: CantileverResult;
  scale: number;
  loadFraction: number;
  deformed: boolean;
  palette: ScenePalette;
} & Pickable) {
  const L = result.input.length;
  const { p, halfP } = bendingAxes(result);
  const tip = deformed ? stationFrame(result, L, scale).center : ([0, 0, L] as Vec3);
  const apex = add(tip, p, halfP);
  const A = arrowLength(result);
  const coneLen = 0.05 * L;
  const coneR = 0.017 * L;
  const shaftR = 0.0055 * L;
  // Local +Y maps to p: identity for vertical, −90° about z for lateral.
  const rotation: [number, number, number] =
    result.input.load.plane === "vertical" ? [0, 0, 0] : [0, 0, -Math.PI / 2];
  const zero = result.input.load.magnitude === 0;
  const color = selected || hovered ? palette.accent : palette.force;

  return (
    <group name="force" position={apex} rotation={rotation} scale={[1, Math.max(0.05, loadFraction), 1]} onClick={onSelect} {...hoverHandlers(onHover)}>
      <mesh position={[0, coneLen / 2, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[coneR, coneLen, 24]} />
        <meshStandardMaterial color={color} roughness={0.5} transparent opacity={zero ? 0.35 : 1} />
      </mesh>
      <mesh position={[0, coneLen + (A - coneLen) / 2, 0]}>
        <cylinderGeometry args={[shaftR, shaftR, A - coneLen, 12]} />
        <meshStandardMaterial color={color} roughness={0.5} transparent opacity={zero ? 0.35 : 1} />
      </mesh>
      <mesh position={[0, A / 2, 0]}>
        <cylinderGeometry args={[coneR * 1.6, coneR * 1.6, A, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ----------------------------------------------------------------- dimensions

export function Dimensions({
  result,
  scale,
  deformed,
  palette,
}: {
  result: CantileverResult;
  scale: number;
  deformed: boolean;
  palette: ScenePalette;
}) {
  const L = result.input.length;
  const { p } = bendingAxes(result);
  const len = lengthDimension(result);
  const dfl = deflectionDimension(result, scale);
  const ez: Vec3 = [0, 0, 1];

  const lengthSegs = useMemo(() => {
    const { o, offset: D, g, halfQ } = len;
    const tick = 0.1 * g;
    const a = add([0, 0, 0], o, D);
    const b = add([0, 0, L], o, D);
    const segs: Vec3[] = [a, b];
    for (const [z, P] of [
      [0, a],
      [L, b],
    ] as const) {
      segs.push(add([0, 0, z], o, halfQ + 0.12 * g), add([0, 0, z], o, D + 0.15 * g));
      segs.push(add(add(P, o, tick), ez, -tick), add(add(P, o, -tick), ez, tick));
    }
    return segs;
    // len is derived from result; recompute when the result changes
  }, [result, L]);

  const deflectionSegs = useMemo(() => {
    if (!deformed || dfl.drawn <= 0) return null;
    const top: Vec3 = [0, 0, dfl.z];
    const bot = add(top, p, -dfl.drawn);
    const w = 0.12 * dfl.g;
    return [top, bot, add(top, ez, -w), add(top, ez, w), add(bot, ez, -w), add(bot, ez, w)] as Vec3[];
  }, [deformed, dfl.drawn, dfl.z, dfl.g, p]);

  return (
    <group raycast={() => null}>
      <Line points={lengthSegs} segments color={palette.dimension} lineWidth={1} transparent opacity={0.8} />
      {deflectionSegs && (
        <Line points={deflectionSegs} segments color={palette.dimension} lineWidth={1} transparent opacity={0.8} />
      )}
    </group>
  );
}
