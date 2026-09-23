/**
 * Camera ownership: projection, fit / reset / frame commands, auto-framing.
 *
 * Fit projects the eight corners of the target bounds onto the camera plane
 * and sizes the view to that silhouette, which frames a long, thin beam far
 * more tightly than a bounding-sphere fit. Transitions are short tweens driven
 * by useFrame + invalidate (the canvas is otherwise render-on-demand).
 */
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { CameraCommand } from "@/state/store";

export interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
}

const FOV = 32;

/** Screen pixels kept clear of the model on each side (HUD bars, guide card). */
export interface Insets {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const DEFAULT_INSETS: Insets = { left: 48, right: 48, top: 60, bottom: 72 };
const TWEEN_MS = 260;

interface Pose {
  target: THREE.Vector3;
  position: THREE.Vector3;
  zoom: number;
}

function corners(b: Bounds): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (const x of [b.min[0], b.max[0]])
    for (const y of [b.min[1], b.max[1]])
      for (const z of [b.min[2], b.max[2]]) out.push(new THREE.Vector3(x, y, z));
  return out;
}

export function fitPose(
  b: Bounds,
  dir: THREE.Vector3,
  camera: THREE.Camera,
  size: { width: number; height: number },
  insets: Insets = DEFAULT_INSETS,
): Pose {
  const d = dir.clone().normalize();
  const forward = d.clone().negate();
  const worldUp = new THREE.Vector3(0, 1, 0);
  let right = forward.clone().cross(worldUp);
  if (right.lengthSq() < 1e-8) right = new THREE.Vector3(1, 0, 0);
  right.normalize();
  const up = right.clone().cross(forward).normalize();

  const cs = corners(b);
  const center = new THREE.Vector3(
    (b.min[0] + b.max[0]) / 2,
    (b.min[1] + b.max[1]) / 2,
    (b.min[2] + b.max[2]) / 2,
  );
  let halfW = 0;
  let halfH = 0;
  let near = 0;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const c of cs) {
    const v = c.clone().sub(center);
    const x = v.dot(right);
    const y = v.dot(up);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    near = Math.max(near, v.dot(d));
  }
  // Re-centre on the projected silhouette.
  center.addScaledVector(right, (minX + maxX) / 2).addScaledVector(up, (minY + maxY) / 2);
  halfW = Math.max((maxX - minX) / 2, 1e-6);
  halfH = Math.max((maxY - minY) / 2, 1e-6);
  const radius = Math.hypot(halfW, halfH, near);

  const w = Math.max(80, size.width - insets.left - insets.right);
  const h = Math.max(80, size.height - insets.top - insets.bottom);
  // Shift so the model is centred in the free area between the insets.
  const shiftX = (insets.right - insets.left) / 2;
  const shiftY = (insets.bottom - insets.top) / 2;

  if (camera instanceof THREE.OrthographicCamera) {
    const zoom = Math.min(w / (2 * halfW), h / (2 * halfH));
    const target = center.clone().addScaledVector(up, -shiftY / zoom).addScaledVector(right, shiftX / zoom);
    return { target, position: target.clone().addScaledVector(d, radius * 6 + 1), zoom };
  }
  const vfov = THREE.MathUtils.degToRad(FOV);
  const tanV = Math.tan(vfov / 2);
  const tanH = tanV * (size.width / size.height);
  const dist =
    near + Math.max((halfW / tanH) * (size.width / w), (halfH / tanV) * (size.height / h));
  const worldPerPx = (2 * dist * tanV) / size.height;
  const target = center
    .clone()
    .addScaledVector(up, -shiftY * worldPerPx)
    .addScaledVector(right, shiftX * worldPerPx);
  return { target, position: target.clone().addScaledVector(d, dist), zoom: 1 };
}

/** Default "home" view: side-on for vertical bending, from above for lateral. */
export function homeDirection(plane: "vertical" | "lateral"): THREE.Vector3 {
  return plane === "vertical"
    ? new THREE.Vector3(-1, 0.5, 0.42).normalize()
    : new THREE.Vector3(-0.5, 1, 0.42).normalize();
}

const ease = (t: number) => 1 - (1 - t) ** 3;

export function CameraRig({
  projection,
  bounds,
  boundsFor,
  command,
  plane,
  autoFrame,
  reducedMotion,
  insets,
}: {
  projection: "perspective" | "orthographic";
  bounds: Bounds;
  boundsFor(target: string | undefined): Bounds;
  command: CameraCommand | null;
  plane: "vertical" | "lateral";
  autoFrame: boolean;
  reducedMotion: boolean;
  insets: Insets;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const invalidate = useThree((s) => s.invalidate);

  const tween = useRef<{ from: Pose; to: Pose; start: number } | null>(null);
  const saved = useRef<{ target: THREE.Vector3; position: THREE.Vector3; zoom: number; persp: boolean } | null>(null);
  const lastFit = useRef<{ radius: number; center: THREE.Vector3 } | null>(null);
  const handled = useRef<number | null>(null);
  /** True until the user moves the camera after the last fit; layout changes then re-fit. */
  const pristine = useRef(true);

  const current = (): Pose => ({
    target: controls ? controls.target.clone() : new THREE.Vector3(),
    position: camera.position.clone(),
    zoom: camera instanceof THREE.OrthographicCamera ? camera.zoom : 1,
  });

  const apply = (pose: Pose) => {
    camera.position.copy(pose.position);
    if (camera instanceof THREE.OrthographicCamera) camera.zoom = pose.zoom;
    const dist = pose.position.distanceTo(pose.target);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.near = Math.max(1e-4, dist / 2000);
      camera.far = dist * 200;
    } else if (camera instanceof THREE.OrthographicCamera) {
      camera.near = -dist * 50;
      camera.far = dist * 50;
    }
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.copy(pose.target);
      controls.update();
    }
    saved.current = {
      target: pose.target.clone(),
      position: pose.position.clone(),
      zoom: pose.zoom,
      persp: camera instanceof THREE.PerspectiveCamera,
    };
    invalidate();
  };

  const go = (pose: Pose) => {
    if (reducedMotion) {
      tween.current = null;
      apply(pose);
    } else {
      tween.current = { from: current(), to: pose, start: performance.now() };
      invalidate();
    }
  };

  const remember = (b: Bounds) => {
    const c = new THREE.Vector3(
      (b.min[0] + b.max[0]) / 2,
      (b.min[1] + b.max[1]) / 2,
      (b.min[2] + b.max[2]) / 2,
    );
    const r = Math.hypot(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]) / 2;
    lastFit.current = { radius: r, center: c };
  };

  const fit = (b: Bounds, dir?: THREE.Vector3, animate = true) => {
    const last = saved.current;
    const d = dir ?? (last ? last.position.clone().sub(last.target).normalize() : homeDirection(plane));
    const pose = fitPose(b, d, camera, size, insets);
    if (animate) go(pose);
    else apply(pose);
    remember(b);
    pristine.current = true;
  };

  /**
   * Controls are rebuilt whenever the default camera changes (at start-up,
   * when drei's camera replaces R3F's, and on every projection switch).
   * Only act once the controls drive the camera actually being rendered.
   */
  const ready = !!controls && (controls as unknown as { object: THREE.Camera }).object === camera;
  const initialised = useRef(false);
  const lastProjection = useRef(projection);

  // Commands from toolbar / keyboard / tree.
  useEffect(() => {
    if (!command || !ready || handled.current === command.nonce) return;
    handled.current = command.nonce;
    if (command.kind === "reset") fit(bounds, homeDirection(plane), false);
    else if (command.kind === "fit") fit(bounds);
    else fit(boundsFor(command.target));
  }, [command, ready]);

  // Projection switch: carry the user's view across, converting distance ↔ zoom.
  useEffect(() => {
    if (!ready || lastProjection.current === projection) return;
    lastProjection.current = projection;
    const s = saved.current;
    if (!s || pristine.current) return; // the pristine re-fit below handles it
    const dir = s.position.clone().sub(s.target).normalize();
    const tanV = Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
    if (camera instanceof THREE.PerspectiveCamera) {
      const dist = size.height / (s.zoom * 2 * tanV);
      apply({ target: s.target, position: s.target.clone().addScaledVector(dir, dist), zoom: 1 });
    } else {
      const dist = s.position.distanceTo(s.target);
      apply({ target: s.target, position: s.target.clone().addScaledVector(dir, dist), zoom: size.height / (2 * dist * tanV) });
    }
  }, [ready, projection, camera]);

  // First ready frame frames the model; afterwards, layout changes (panels
  // settling, dock opening, window resize, projection switch) keep it framed
  // for as long as the user has not taken over the camera.
  useEffect(() => {
    if (!ready) return;
    if (!initialised.current) {
      initialised.current = true;
      fit(bounds, homeDirection(plane), false);
    } else if (pristine.current) {
      fit(bounds, undefined, false);
    }
  }, [ready, controls, size.width, size.height, insets.left, insets.right, insets.top, insets.bottom]);

  // Track the pose (for projection switches) and user takeover (ends pristine).
  useEffect(() => {
    if (!ready || !controls) return;
    const save = () => {
      saved.current = {
        target: controls.target.clone(),
        position: camera.position.clone(),
        zoom: camera instanceof THREE.OrthographicCamera ? camera.zoom : 1,
        persp: camera instanceof THREE.PerspectiveCamera,
      };
    };
    const takeOver = () => {
      tween.current = null;
      pristine.current = false;
    };
    controls.addEventListener("change", save);
    controls.addEventListener("start", takeOver);
    return () => {
      controls.removeEventListener("change", save);
      controls.removeEventListener("start", takeOver);
    };
  }, [ready, controls, camera]);

  // Auto-frame when an edit changes the model's size or position a lot.
  useEffect(() => {
    if (!autoFrame || !ready || !lastFit.current) return;
    const id = window.setTimeout(() => {
      const last = lastFit.current;
      if (!last) return;
      const c = new THREE.Vector3(
        (bounds.min[0] + bounds.max[0]) / 2,
        (bounds.min[1] + bounds.max[1]) / 2,
        (bounds.min[2] + bounds.max[2]) / 2,
      );
      const r =
        Math.hypot(bounds.max[0] - bounds.min[0], bounds.max[1] - bounds.min[1], bounds.max[2] - bounds.min[2]) / 2;
      const ratio = r / last.radius;
      if (ratio > 1.35 || ratio < 0.65 || c.distanceTo(last.center) > 0.35 * last.radius) fit(bounds);
    }, 450);
    return () => window.clearTimeout(id);
  }, [bounds, autoFrame, ready]);

  useFrame(() => {
    const t = tween.current;
    if (!t) return;
    const k = Math.min(1, (performance.now() - t.start) / TWEEN_MS);
    const e = ease(k);
    apply({
      target: t.from.target.clone().lerp(t.to.target, e),
      position: t.from.position.clone().lerp(t.to.position, e),
      zoom: t.from.zoom + (t.to.zoom - t.from.zoom) * e,
    });
    if (k >= 1) tween.current = null;
  });

  return (
    <>
      {projection === "perspective" ? (
        <PerspectiveCamera makeDefault fov={FOV} position={[-2, 1, 1.5]} near={0.001} far={1000} />
      ) : (
        <OrthographicCamera makeDefault position={[-2, 1, 1.5]} zoom={400} near={-1000} far={1000} />
      )}
      <OrbitControls
        makeDefault
        enableDamping={false}
        zoomToCursor
        mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN }}
        minDistance={1e-3}
        maxDistance={500}
      />
    </>
  );
}
