/**
 * Development-only hooks for end-to-end tests: project a world point to canvas
 * pixels (to click a specific 3D object), read the camera pose, and read the
 * store. Compiled out of production builds by the `import.meta.env.DEV` guard.
 */
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { useLab } from "@/state/store";

declare global {
  interface Window {
    __ssl?: {
      project(p: [number, number, number]): [number, number];
      camera(): { type: string; position: number[]; target: number[] | null; zoom: number };
      state(): ReturnType<typeof useLab.getState>;
    };
  }
}

export function TestHooks() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3 } | null;

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__ssl = {
      project: (p) => {
        camera.updateMatrixWorld();
        const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera);
        return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height];
      },
      camera: () => ({
        type: camera.type,
        position: camera.position.toArray(),
        target: controls ? controls.target.toArray() : null,
        zoom: camera.zoom,
      }),
      state: () => useLab.getState(),
    };
  }, [camera, size, controls]);
  return null;
}
