/**
 * Minimal scientific line chart (SVG). One series, a current-value marker,
 * hover readout, and optional click-to-pick. Log–log axes turn power laws into
 * straight lines whose slope is the exponent.
 */
import { useEffect, useMemo, useRef, useState } from "react";

export interface ChartPoint {
  x: number;
  y: number;
}

const M = { l: 58, r: 14, t: 10, b: 32 };

function linearTicks(min: number, max: number, target = 5): number[] {
  const span = max - min;
  if (!(span > 0)) return [min];
  const raw = span / target;
  const e = Math.floor(Math.log10(raw));
  const f = raw / 10 ** e;
  const step = (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * 10 ** e;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(Number(v.toPrecision(12)));
  return out;
}

function logTicks(min: number, max: number): number[] {
  const pick = (ms: number[]) => {
    const out: number[] = [];
    for (let k = Math.floor(Math.log10(min)) - 1; k <= Math.ceil(Math.log10(max)) + 1; k++)
      for (const m of ms) {
        const v = m * 10 ** k;
        if (v >= min * (1 - 1e-9) && v <= max * (1 + 1e-9)) out.push(Number(v.toPrecision(12)));
      }
    return out;
  };
  let t = pick([1, 2, 5]);
  if (t.length < 3) t = pick([1, 1.5, 2, 3, 4, 5, 6, 8]);
  if (t.length > 7) t = pick([1]);
  if (t.length < 2) t = linearTicks(min, max, 4).filter((v) => v > 0);
  return t;
}

export function LineChart({
  points,
  current,
  log,
  xLabel,
  yLabel,
  fmtX,
  fmtY,
  onPick,
  ariaLabel,
}: {
  points: ChartPoint[];
  current: ChartPoint;
  log: boolean;
  xLabel: string;
  yLabel: string;
  fmtX(v: number): string;
  fmtY(v: number): string;
  onPick?(x: number): void;
  ariaLabel: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(420);
  const [height, setHeight] = useState(180);
  const [hover, setHover] = useState<ChartPoint | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      if (!e) return;
      setWidth(Math.max(200, Math.floor(e.contentRect.width)));
      setHeight(Math.max(130, Math.floor(e.contentRect.height)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const g = useMemo(() => {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y).filter((y) => Number.isFinite(y));
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    let y0 = Math.min(...ys);
    let y1 = Math.max(...ys);
    const flat = !(y1 > y0 * (1 + 1e-9));
    if (flat) {
      // A response that does not depend on the parameter: show a ±50 % band.
      y0 = y0 * 0.5 || -1;
      y1 = y1 * 1.5 || 1;
    }
    const useLog = log && y0 > 0 && x0 > 0;
    const tx = (v: number) => (useLog ? Math.log(v) : v);
    const X = (v: number) => M.l + ((tx(v) - tx(x0)) / (tx(x1) - tx(x0))) * (width - M.l - M.r);
    const Y = (v: number) => {
      const pad = (tx(y1) - tx(y0)) * 0.06;
      return M.t + (1 - (tx(v) - (tx(y0) - pad)) / (tx(y1) + pad - (tx(y0) - pad))) * (height - M.t - M.b);
    };
    const xt = useLog ? logTicks(x0, x1) : linearTicks(x0, x1);
    const yt = useLog ? logTicks(y0, y1) : linearTicks(y0, y1);
    const path = points
      .filter((p) => Number.isFinite(p.y))
      .map((p, i) => `${i ? "L" : "M"}${X(p.x).toFixed(2)},${Y(p.y).toFixed(2)}`)
      .join("");
    return { X, Y, xt, yt, path, x0, x1, useLog, flat };
  }, [points, width, height, log]);

  const invX = (px: number) => {
    const f = (px - M.l) / (width - M.l - M.r);
    const c = Math.max(0, Math.min(1, f));
    return g.useLog ? g.x0 * (g.x1 / g.x0) ** c : g.x0 + (g.x1 - g.x0) * c;
  };
  const nearest = (x: number) =>
    points.reduce((best, p) => (Math.abs(Math.log(p.x / x)) < Math.abs(Math.log(best.x / x)) ? p : best), points[0]!);

  return (
    <div ref={box} className="relative h-full min-h-[130px] w-full select-none" data-testid="sensitivity-chart">
      <svg
        className={"absolute inset-0 " + (onPick ? "cursor-crosshair" : "")}
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(nearest(invX(e.clientX - r.left)));
        }}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => {
          if (!onPick) return;
          const r = e.currentTarget.getBoundingClientRect();
          onPick(nearest(invX(e.clientX - r.left)).x);
        }}
      >
        {/* grid + ticks */}
        {g.xt.map((v) => (
          <g key={"x" + v}>
            <line x1={g.X(v)} x2={g.X(v)} y1={M.t} y2={height - M.b} stroke="var(--line)" />
            <text x={g.X(v)} y={height - M.b + 14} fontSize="10.5" textAnchor="middle" fill="var(--text-faint)" className="num">
              {fmtX(v)}
            </text>
          </g>
        ))}
        {g.yt.map((v) => (
          <g key={"y" + v}>
            <line x1={M.l} x2={width - M.r} y1={g.Y(v)} y2={g.Y(v)} stroke="var(--line)" />
            <text x={M.l - 6} y={g.Y(v) + 3.5} fontSize="10.5" textAnchor="end" fill="var(--text-faint)" className="num">
              {fmtY(v)}
            </text>
          </g>
        ))}
        <rect x={M.l} y={M.t} width={width - M.l - M.r} height={height - M.t - M.b} fill="none" stroke="var(--line-strong)" />
        <text x={(M.l + width - M.r) / 2} y={height - 3} fontSize="10.5" textAnchor="middle" fill="var(--text-muted)">
          {xLabel}
        </text>
        <text transform={`translate(11 ${(M.t + height - M.b) / 2}) rotate(-90)`} fontSize="10.5" textAnchor="middle" fill="var(--text-muted)">
          {yLabel}
        </text>

        {/* current value crosshair */}
        <line x1={g.X(current.x)} x2={g.X(current.x)} y1={M.t} y2={height - M.b} stroke="var(--accent)" strokeDasharray="3 3" opacity={0.6} />
        <line x1={M.l} x2={width - M.r} y1={g.Y(current.y)} y2={g.Y(current.y)} stroke="var(--accent)" strokeDasharray="3 3" opacity={0.6} />

        <path d={g.path} fill="none" stroke="var(--accent)" strokeWidth={1.75} />
        <circle cx={g.X(current.x)} cy={g.Y(current.y)} r={4} fill="var(--bg-panel)" stroke="var(--accent)" strokeWidth={2} />

        {hover && (
          <g pointerEvents="none">
            <line x1={g.X(hover.x)} x2={g.X(hover.x)} y1={M.t} y2={height - M.b} stroke="var(--text-faint)" />
            <circle cx={g.X(hover.x)} cy={g.Y(hover.y)} r={3} fill="var(--text)" />
          </g>
        )}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute top-2 rounded-sm border border-line-strong bg-panel px-1.5 py-0.5 text-[11px] text-fg num"
          style={{ left: Math.min(width - 150, Math.max(M.l + 4, g.X(hover.x) + 8)) }}
        >
          {fmtX(hover.x)} → {fmtY(hover.y)}
        </div>
      )}
    </div>
  );
}
