import { Edges } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import type { CantileverResult } from "@/lib/structures/cantilever";
import { buildBeamMesh, divergingColor } from "./sceneMath";
import type { ScenePalette } from "./palette";

export function BeamSolid({
  result,
  scale,
  loadFraction,
  contour,
  palette,
  selected,
  hovered,
  onSelect,
  onHover,
}: {
  result: CantileverResult;
  scale: number;
  loadFraction: number;
  contour: boolean;
  palette: ScenePalette;
  selected: boolean;
  hovered: boolean;
  onSelect(e: ThreeEvent<MouseEvent>): void;
  onHover(on: boolean): void;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const mesh = useMemo(() => buildBeamMesh(result, scale, 72), [result, scale]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(mesh.normals, 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(mesh.positions.length), 3));
    g.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    g.computeBoundingSphere();
    return g;
  }, [mesh]);

  // Colours are the only thing that changes with the contour toggle or theme.
  // Buffer mutation bypasses React props, so request a frame explicitly.
  useLayoutEffect(() => {
    const attr = geometry.getAttribute("color") as THREE.BufferAttribute;
    const base = new THREE.Color(palette.beam);
    const smax = result.maxBendingStress;
    for (let i = 0; i < mesh.stress.length; i++) {
      if (contour && smax > 0) {
        const [r, g, b] = divergingColor(mesh.stress[i]! / smax);
        attr.setXYZ(
          i,
          base.r + (r - base.r) * loadFraction,
          base.g + (g - base.g) * loadFraction,
          base.b + (b - base.b) * loadFraction,
        );
      } else {
        attr.setXYZ(i, base.r, base.g, base.b);
      }
    }
    attr.needsUpdate = true;
    invalidate();
  }, [geometry, mesh, contour, palette.beam, result.maxBendingStress, loadFraction, invalidate]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const highlighted = selected || hovered;
  const edgeColor = highlighted ? palette.accent : palette.edge;
  const edgeWidth = contour ? (highlighted ? 1.2 : 0.8) : selected ? 1.8 : hovered ? 1.4 : 1;

  return (
    <mesh
      geometry={geometry}
      name="beam"
      onClick={onSelect}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(true);
      }}
      onPointerOut={() => onHover(false)}
    >
      <meshStandardMaterial
        vertexColors
        roughness={0.62}
        metalness={0.05}
        emissive={selected && !contour ? palette.accent : "#000000"}
        emissiveIntensity={selected && !contour ? 0.16 : 0}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
      <Edges
        threshold={25}
        color={edgeColor}
        lineWidth={edgeWidth}
        transparent
        opacity={highlighted ? (contour ? 0.85 : 1) : 0.55}
      />
    </mesh>
  );
}
