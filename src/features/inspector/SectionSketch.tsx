/**
 * Cross-section sketch with the section axes, so "Ixx" and "Iyy" have a
 * visible meaning. Proportions are true unless the section is extremely
 * slender, in which case the thin side is widened and the sketch says so.
 */
import { formatQuantityText } from "@/core/units";
import type { BendingPlane } from "@/lib/structures/cantilever";
import { useLab } from "@/state/store";

const W = 216;
const H = 92;
const MIN_PX = 6;

export function SectionSketch({ b, h, plane }: { b: number; h: number; plane: BendingPlane }) {
  const system = useLab((s) => s.unitSystem);
  // Left margin holds the h dimension, right margin the x-axis label.
  const LEFT = 40;
  const RIGHT = 24;
  const maxW = W - LEFT - RIGHT - 20;
  const maxH = H - 34;
  const k = Math.min(maxW / b, maxH / h);
  let wPx = b * k;
  let hPx = h * k;
  const distorted = wPx < MIN_PX || hPx < MIN_PX;
  wPx = Math.max(wPx, MIN_PX);
  hPx = Math.max(hPx, MIN_PX);
  const cx = (LEFT + W - RIGHT) / 2;
  const cy = (H - 12) / 2 + 2;
  const x0 = cx - wPx / 2;
  const y0 = cy - hPx / 2;
  const governs = plane === "vertical" ? "x" : "y";

  return (
    <figure className="mt-2 mb-1" aria-label={`Rectangular section ${formatQuantityText(b, "sectionDim", system)} wide by ${formatQuantityText(h, "sectionDim", system)} high`}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="block" role="img" aria-hidden>
        <rect
          x={x0}
          y={y0}
          width={wPx}
          height={hPx}
          fill="var(--bg-raised)"
          stroke="var(--text-muted)"
          strokeWidth={1}
        />
        {/* x–x axis (horizontal) */}
        <line
          x1={x0 - 14}
          x2={x0 + wPx + 14}
          y1={cy}
          y2={cy}
          stroke={governs === "x" ? "var(--accent)" : "var(--text-faint)"}
          strokeWidth={governs === "x" ? 1.4 : 1}
          strokeDasharray="5 3"
        />
        <text x={x0 + wPx + 18} y={cy + 3.5} fontSize="10.5" fill={governs === "x" ? "var(--accent-text)" : "var(--text-faint)"} fontStyle="italic">
          x
        </text>
        {/* y–y axis (vertical) */}
        <line
          x1={cx}
          x2={cx}
          y1={y0 - 10}
          y2={y0 + hPx + 10}
          stroke={governs === "y" ? "var(--accent)" : "var(--text-faint)"}
          strokeWidth={governs === "y" ? 1.4 : 1}
          strokeDasharray="5 3"
        />
        <text x={cx + 4} y={y0 - 3} fontSize="10.5" fill={governs === "y" ? "var(--accent-text)" : "var(--text-faint)"} fontStyle="italic">
          y
        </text>
        {/* b dimension */}
        <line x1={x0} x2={x0 + wPx} y1={H - 12} y2={H - 12} stroke="var(--text-faint)" />
        <line x1={x0} x2={x0} y1={H - 16} y2={H - 8} stroke="var(--text-faint)" />
        <line x1={x0 + wPx} x2={x0 + wPx} y1={H - 16} y2={H - 8} stroke="var(--text-faint)" />
        <text x={cx} y={H - 1} fontSize="10.5" fill="var(--text-muted)" textAnchor="middle">
          b = {formatQuantityText(b, "sectionDim", system)}
        </text>
        {/* h dimension */}
        <line x1={x0 - 20} x2={x0 - 20} y1={y0} y2={y0 + hPx} stroke="var(--text-faint)" />
        <line x1={x0 - 24} x2={x0 - 16} y1={y0} y2={y0} stroke="var(--text-faint)" />
        <line x1={x0 - 24} x2={x0 - 16} y1={y0 + hPx} y2={y0 + hPx} stroke="var(--text-faint)" />
        <text x={x0 - 27} y={cy + 3.5} fontSize="10.5" fill="var(--text-muted)" textAnchor="end">
          h
        </text>
      </svg>
      <figcaption className="flex justify-between text-[11px] text-faint">
        <span>
          Bending about <span className="text-accent-text italic">{governs}–{governs}</span>
        </span>
        {distorted && <span>not to scale</span>}
      </figcaption>
    </figure>
  );
}
