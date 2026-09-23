/**
 * Pure geometry for the viewport — no three.js, no React — so the deformed
 * shape can be unit-tested against the solver.
 *
 * World frame = section frame (Megson): x horizontal (width b), y vertical up
 * (height h), z along the beam from the root (z = 0) to the tip (z = L).
 */
import {
  bendingStressAt,
  deflectionAt,
  slopeAt,
  type CantileverResult,
} from "@/lib/structures/cantilever";
import type { DeformScale } from "@/state/store";

export type Vec3 = [number, number, number];

export interface DisplayScale {
  factor: number;
  /** Drawn larger than the true displacement. */
  exaggerated: boolean;
  /** Drawn smaller than the true displacement (Auto on a very flexible beam). */
  reduced: boolean;
}

/** Auto scale draws the tip displacement at this fraction of the beam length. */
export const AUTO_TARGET = 0.2;

export function displayScale(mode: DeformScale, r: CantileverResult): DisplayScale {
  let factor: number;
  if (mode === "auto") {
    factor = r.tipDeflection > 0 ? (AUTO_TARGET * r.input.length) / r.tipDeflection : 1;
  } else {
    factor = Number(mode);
  }
  return {
    factor,
    exaggerated: factor > 1 + 1e-9,
    reduced: factor < 1 - 1e-9,
  };
}

/**
 * Bending-plane axes. p points away from the load (tension side), q is the
 * other section axis. halfP/halfQ are section half-dimensions along them.
 */
export function bendingAxes(r: CantileverResult) {
  const { b, h } = r.input.section;
  return r.input.load.plane === "vertical"
    ? { p: [0, 1, 0] as Vec3, q: [1, 0, 0] as Vec3, halfP: h / 2, halfQ: b / 2 }
    : { p: [1, 0, 0] as Vec3, q: [0, 1, 0] as Vec3, halfP: b / 2, halfQ: h / 2 };
}

/** Base size for glyphs (support, arrow), so they read at any beam proportion. */
export function glyphSize(r: CantileverResult): number {
  const { b, h } = r.input.section;
  return Math.max(0.07 * r.input.length, 2.5 * Math.max(b, h));
}

const add = (a: Vec3, b: Vec3, s = 1): Vec3 => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export interface StationFrame {
  z: number;
  /** Drawn centroid position. */
  center: Vec3;
  /** Rotated bending-plane axis (section stays normal to the drawn centroid line). */
  n: Vec3;
  /** Unit tangent of the drawn centroid line. */
  t: Vec3;
}

/**
 * Frame of the drawn beam at station z. The centroid is displaced by
 * −s·v(z) along p (towards the load), and the section rotates by
 * φ = atan(s·v′(z)) so plane sections stay perpendicular to the drawn axis.
 */
export function stationFrame(r: CantileverResult, z: number, s: number): StationFrame {
  const { p } = bendingAxes(r);
  const ez: Vec3 = [0, 0, 1];
  const phi = Math.atan(s * slopeAt(r, z));
  const c = Math.cos(phi);
  const sn = Math.sin(phi);
  return {
    z,
    center: add(scale(p, -s * deflectionAt(r, z)), ez, z),
    n: add(scale(p, c), ez, sn),
    t: add(scale(p, -sn), ez, c),
  };
}

export interface BeamMeshData {
  positions: Float32Array;
  normals: Float32Array;
  /** Signed bending stress at each vertex [Pa] (tension positive). */
  stress: Float32Array;
  indices: Uint32Array;
}

/**
 * Swept rectangular solid along the analytical deflected shape.
 * Four long faces with analytic normals plus the two end caps; vertices are
 * duplicated per face so edges stay crisp.
 */
export function buildBeamMesh(r: CantileverResult, s: number, stations = 64): BeamMeshData {
  const { q, halfP, halfQ } = bendingAxes(r);
  const L = r.input.length;
  const frames: StationFrame[] = [];
  for (let i = 0; i < stations; i++) frames.push(stationFrame(r, (L * i) / (stations - 1), s));

  const pos: number[] = [];
  const nor: number[] = [];
  const str: number[] = [];
  const idx: number[] = [];

  const corner = (f: StationFrame, eta: number, xi: number): Vec3 =>
    add(add(f.center, f.n, eta), q, xi);

  const pushVertex = (v: Vec3, normal: Vec3, sigma: number) => {
    pos.push(v[0], v[1], v[2]);
    nor.push(normal[0], normal[1], normal[2]);
    str.push(sigma);
    return pos.length / 3 - 1;
  };

  // Each long face: two section-corner coordinates (eta, xi) and a normal function.
  const faces: { a: [number, number]; b: [number, number]; normal: (f: StationFrame) => Vec3 }[] = [
    { a: [halfP, -halfQ], b: [halfP, halfQ], normal: (f) => f.n },
    { a: [-halfP, halfQ], b: [-halfP, -halfQ], normal: (f) => scale(f.n, -1) },
    { a: [halfP, halfQ], b: [-halfP, halfQ], normal: () => q },
    { a: [-halfP, -halfQ], b: [halfP, -halfQ], normal: () => scale(q, -1) },
  ];

  for (const face of faces) {
    // Orient the pair so triangles wind counter-clockwise seen from outside.
    const f0 = frames[0]!;
    const f1 = frames[1]!;
    const A0 = corner(f0, ...face.a);
    const B0 = corner(f0, ...face.b);
    const A1 = corner(f1, ...face.a);
    let [a, b] = [face.a, face.b];
    if (dot(cross(sub(B0, A0), sub(A1, A0)), face.normal(f0)) < 0) [a, b] = [b, a];

    const start = pos.length / 3;
    for (const f of frames) {
      const nrm = face.normal(f);
      pushVertex(corner(f, ...a), nrm, bendingStressAt(r, f.z, a[0]));
      pushVertex(corner(f, ...b), nrm, bendingStressAt(r, f.z, b[0]));
    }
    for (let i = 0; i < stations - 1; i++) {
      const a0 = start + 2 * i;
      const b0 = a0 + 1;
      const a1 = a0 + 2;
      const b1 = a0 + 3;
      idx.push(a0, b0, a1, b0, b1, a1);
    }
  }

  // End caps.
  for (const [f, outward] of [
    [frames[0]!, -1],
    [frames[stations - 1]!, 1],
  ] as const) {
    const normal = scale(f.t, outward);
    const cs: [number, number][] = [
      [halfP, halfQ],
      [halfP, -halfQ],
      [-halfP, -halfQ],
      [-halfP, halfQ],
    ];
    const v = cs.map(([eta, xi]) => pushVertex(corner(f, eta, xi), normal, bendingStressAt(r, f.z, eta)));
    const P = (i: number) => corner(f, ...cs[i]!);
    const flip = dot(cross(sub(P(1), P(0)), sub(P(2), P(0))), normal) < 0;
    if (flip) idx.push(v[0]!, v[2]!, v[1]!, v[0]!, v[3]!, v[2]!);
    else idx.push(v[0]!, v[1]!, v[2]!, v[0]!, v[2]!, v[3]!);
  }

  return {
    positions: new Float32Array(pos),
    normals: new Float32Array(nor),
    stress: new Float32Array(str),
    indices: new Uint32Array(idx),
  };
}

/** Axis-aligned bounds of everything drawn, for fit-to-view. */
export function sceneBounds(r: CantileverResult, s: number, showDeformed: boolean) {
  const { p, halfP, halfQ } = bendingAxes(r);
  const L = r.input.length;
  const g = glyphSize(r);
  const min: Vec3 = [-halfQ - g, -halfP - g, -g * 0.6];
  const max: Vec3 = [halfQ + g, halfP + g, L + g * 0.6];
  const grow = (v: Vec3) => {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k]!, v[k]!);
      max[k] = Math.max(max[k]!, v[k]!);
    }
  };
  if (showDeformed) {
    for (let i = 0; i <= 16; i++) grow(stationFrame(r, (L * i) / 16, s).center);
  }
  // Load arrow sits on the tension side, opposite the load, at the drawn tip.
  const tip = showDeformed ? stationFrame(r, L, s).center : ([0, 0, L] as Vec3);
  grow(add(tip, p, halfP + arrowLength(r)));
  return { min, max };
}

export function arrowLength(r: CantileverResult): number {
  return 0.22 * r.input.length;
}

/**
 * Length-dimension placement: offset sideways from the beam, away from both
 * the load and the deflection (−x for a vertical load, +y for a lateral one).
 */
export function lengthDimension(r: CantileverResult) {
  const g = glyphSize(r);
  const { q, halfQ } = bendingAxes(r);
  const o: Vec3 = r.input.load.plane === "vertical" ? [-q[0], -q[1], -q[2]] : q;
  return { o, offset: halfQ + 0.9 * g, g, halfQ };
}

/** Tip-deflection dimension: a line just beyond the tip, from 0 to the drawn tip. */
export function deflectionDimension(r: CantileverResult, s: number) {
  const g = glyphSize(r);
  return { z: r.input.length + 0.55 * g, drawn: s * r.tipDeflection, g };
}

export type LabelId = "force" | "length" | "deflection";

export interface LabelAnchor {
  id: LabelId;
  position: Vec3;
  /** "center" centres the label on the point; "right" places it to the right. */
  align: "center" | "right";
}

/** World positions of the viewport's text labels (rendered as DOM, projected per frame). */
export function labelAnchors(
  r: CantileverResult,
  s: number,
  opts: { deformed: boolean; showForce: boolean; showDimensions: boolean },
): LabelAnchor[] {
  const L = r.input.length;
  const { p, halfP } = bendingAxes(r);
  const out: LabelAnchor[] = [];
  if (opts.showForce) {
    const tip = opts.deformed ? stationFrame(r, L, s).center : ([0, 0, L] as Vec3);
    out.push({ id: "force", position: add(tip, p, halfP + arrowLength(r) + 0.035 * L), align: "center" });
  }
  if (opts.showDimensions) {
    const d = lengthDimension(r);
    out.push({ id: "length", position: add([0, 0, L / 2], d.o, d.offset), align: "center" });
    const f = deflectionDimension(r, s);
    if (opts.deformed && f.drawn > 0) {
      out.push({ id: "deflection", position: add(add([0, 0, f.z], p, -f.drawn / 2), [0, 0, 1], 0.2 * f.g), align: "right" });
    }
  }
  return out;
}

/**
 * Diverging colour map (compression blue → neutral → tension red), sampled
 * from Moreland's "cool to warm", with t in [-1, 1].
 */
const COOL_WARM: Vec3[] = [
  [0.23, 0.299, 0.754],
  [0.552, 0.69, 0.996],
  [0.866, 0.866, 0.866],
  [0.958, 0.604, 0.482],
  [0.706, 0.016, 0.15],
];

export function divergingColor(t: number): Vec3 {
  const u = (Math.max(-1, Math.min(1, t)) + 1) / 2;
  const x = u * (COOL_WARM.length - 1);
  const i = Math.min(COOL_WARM.length - 2, Math.floor(x));
  const f = x - i;
  const a = COOL_WARM[i]!;
  const b = COOL_WARM[i + 1]!;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

/** "Nice" grid cell size: 1, 2 or 5 × 10ⁿ, about a tenth of the length. */
export function niceCell(length: number): number {
  const raw = length / 10;
  const e = Math.floor(Math.log10(raw));
  const m = raw / 10 ** e;
  const n = m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10;
  return n * 10 ** e;
}
