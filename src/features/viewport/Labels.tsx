/**
 * Viewport text labels as plain DOM.
 *
 * `LabelOverlay` renders the label elements beside the canvas; `LabelProjector`
 * (inside the canvas) projects their world anchors to screen space on every
 * rendered frame and writes the transform directly — no React re-render and
 * no nested React roots per label.
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, type MutableRefObject, type ReactNode } from "react";
import * as THREE from "three";
import type { LabelAnchor, LabelId } from "./sceneMath";

export interface LabelSpec extends LabelAnchor {
  content: ReactNode;
  tone: "force" | "muted" | "default";
  highlighted?: boolean;
}

export type LabelNodes = MutableRefObject<Partial<Record<LabelId, HTMLDivElement | null>>>;

const v = new THREE.Vector3();
/** Minimum distance between a label and the viewport edge [px]. */
const EDGE = 6;

export function LabelProjector({ labels, nodes }: { labels: LabelSpec[]; nodes: LabelNodes }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [labels, invalidate]);

  useFrame(({ camera, size }) => {
    // The HUD (gizmo) renders at a higher priority, after this callback, so the
    // camera's world matrix may still be last frame's. Refresh it before projecting.
    camera.updateMatrixWorld();
    for (const l of labels) {
      const el = nodes.current[l.id];
      if (!el) continue;
      v.set(l.position[0], l.position[1], l.position[2]).project(camera);
      if (v.z < -1 || v.z > 1) {
        el.style.visibility = "hidden";
        continue;
      }
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const px = ((v.x + 1) / 2) * size.width;
      const py = ((1 - v.y) / 2) * size.height;
      // Top-left corner of the label, kept inside the viewport with a small margin.
      let left: number;
      if (l.align === "center") left = px - w / 2;
      else left = px + 8 + w > size.width - EDGE ? px - 8 - w : px + 8; // flip left near the edge
      left = Math.min(Math.max(left, EDGE), size.width - EDGE - w);
      const top = Math.min(Math.max(py - h / 2, EDGE), size.height - EDGE - h);
      el.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px)`;
      el.style.visibility = "visible";
    }
  });
  return null;
}

export function LabelOverlay({ labels, nodes }: { labels: LabelSpec[]; nodes: LabelNodes }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {labels.map((l) => (
        <div
          key={l.id}
          ref={(el) => {
            nodes.current[l.id] = el;
          }}
          className={
            "vp-label absolute top-0 left-0 " +
            (l.tone === "force" ? "vp-label-force " : l.tone === "muted" ? "vp-label-muted " : "") +
            (l.highlighted ? "vp-label-selected" : "")
          }
          style={{ visibility: "hidden", transform: "none" }}
          data-testid={`vp-label-${l.id}`}
        >
          {l.content}
        </div>
      ))}
    </div>
  );
}
