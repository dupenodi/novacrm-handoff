"use client";

import { type HTMLAttributes, useEffect, useMemo, useRef, useState } from "react";
import { CHART_COLOR_FALLBACK, type ChartColor } from "./chart-colors";
import { ChartLegend } from "./ChartLegend";
import { cx } from "./utils";

export type LineSeries = {
  key: string;
  label: string;
  color?: ChartColor;
};

export type LineChartProps<T extends Record<string, unknown> = Record<string, unknown>> = {
  data: T[];
  series: LineSeries[];
  xKey: keyof T & string;
  height?: number;
  showYLabels?: boolean;
  valueFormatter?: (value: number, key: string) => string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

type Point = { x: number; y: number };

const PAD = { top: 10, right: 8, bottom: 4, left: 28 };
const TOOLTIP_WIDTH = 148;
const DOT_RADIUS = 3.4;

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function seriesColor(s: LineSeries): string {
  return CHART_COLOR_FALLBACK[s.color ?? "accent"];
}

/** x position of the i-th of `count` evenly spaced points. */
function xAt(i: number, count: number, plotW: number): number {
  return PAD.left + (i / Math.max(1, count - 1)) * plotW;
}

/** Pixel points per series, plus three y gridlines (0, half, max) on a max rounded up to a multiple of 4. */
function buildGeometry(data: Record<string, unknown>[], series: LineSeries[], plotW: number, plotH: number) {
  const max = Math.max(1, ...data.flatMap((row) => series.map((s) => num(row[s.key]))));
  const yMax = Math.ceil(max / 4) * 4;
  const yAt = (value: number) => PAD.top + plotH - (value / yMax) * plotH;

  const points: Record<string, Point[]> = {};
  for (const s of series) {
    points[s.key] = data.map((row, i) => ({ x: xAt(i, data.length, plotW), y: yAt(num(row[s.key])) }));
  }
  const yTicks = [0, 0.5, 1].map((t) => ({ value: Math.round(yMax * t), y: yAt(yMax * t) }));
  return { points, yTicks };
}

/** Up to ~5 x labels: first, last, and evenly spaced ones between. */
function xLabelIndexes(count: number): number[] {
  if (count <= 5) return Array.from({ length: count }, (_, i) => i);
  const step = Math.ceil((count - 1) / 3);
  const indexes = [0];
  for (let i = step; i < count - 1; i += step) indexes.push(i);
  indexes.push(count - 1);
  return indexes;
}

/** Tracks an element's rounded width. */
function useWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      const next = Math.round(node.clientWidth);
      if (next > 0) setWidth(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

export function LineChart<T extends Record<string, unknown>>({
  data,
  series,
  xKey,
  height = 160,
  showYLabels = true,
  valueFormatter = (v) => String(v),
  className,
  ...rest
}: LineChartProps<T>) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const width = useWidth(wrapRef);
  const [hover, setHover] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const visible = useMemo(() => series.filter((s) => !hidden[s.key]), [series, hidden]);
  const plotW = Math.max(40, width - PAD.left - PAD.right);
  const plotH = Math.max(40, height - PAD.top - PAD.bottom);
  const { points, yTicks } = useMemo(() => buildGeometry(data, visible, plotW, plotH), [data, visible, plotW, plotH]);

  // The highlighted row: the hovered one, otherwise the latest.
  const focusIndex = hover ?? data.length - 1;
  const hoverX = hover != null ? xAt(hover, data.length, plotW) : null;
  const valueAt = (index: number, key: string) => valueFormatter(num(data[index]?.[key]), key);

  function onPointerMove(clientX: number) {
    const el = wrapRef.current;
    if (!el || data.length === 0 || width <= 0) return;
    const px = clientX - el.getBoundingClientRect().left - PAD.left;
    const index = Math.round((px / plotW) * Math.max(1, data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, index)));
  }

  return (
    <div
      ref={wrapRef}
      className={cx("t-linechart", className)}
      onPointerLeave={() => setHover(null)}
      onPointerMove={(e) => onPointerMove(e.clientX)}
      {...rest}
    >
      <ChartLegend
        items={series.map((s) => ({
          label: s.label,
          color: s.color ?? "accent",
          end: data.length ? valueAt(focusIndex, s.key) : undefined,
          active: !hidden[s.key],
          onClick: () => setHidden((prev) => ({ ...prev, [s.key]: !prev[s.key] })),
        }))}
      />

      <div className="t-linechart__plot" style={{ height }}>
        {width > 0 ? (
          <svg width={width} height={height} className="t-linechart__svg" role="img" aria-label="Line chart">
            {showYLabels
              ? yTicks.map((tick) => (
                  <g key={`y-${tick.value}-${tick.y}`}>
                    <line x1={PAD.left} x2={PAD.left + plotW} y1={tick.y} y2={tick.y} className="t-linechart__grid" />
                    <text
                      x={PAD.left - 6}
                      y={tick.y}
                      className="t-linechart__ylab"
                      textAnchor="end"
                      dominantBaseline="middle"
                    >
                      {tick.value}
                    </text>
                  </g>
                ))
              : null}

            {visible.map((s) => {
              const line = points[s.key] ?? [];
              if (line.length < 2) return null;
              return (
                <polyline
                  key={s.key}
                  points={line.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke={seriesColor(s)}
                  strokeWidth={(s.color ?? "accent") === "accent" ? 2.4 : 2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              );
            })}

            {hoverX != null ? (
              <line x1={hoverX} x2={hoverX} y1={PAD.top} y2={PAD.top + plotH} className="t-linechart__cross" />
            ) : null}

            {/* A dot on each line at the focused row; hovered dots get a ring. */}
            {visible.map((s) => {
              const p = points[s.key]?.[focusIndex];
              if (!p) return null;
              const ring = hover != null ? { stroke: "var(--t-surf)", strokeWidth: 1.5 } : {};
              return <circle key={s.key} cx={p.x} cy={p.y} r={DOT_RADIUS} fill={seriesColor(s)} {...ring} />;
            })}
          </svg>
        ) : null}

        {hover != null && hoverX != null && width > 0 ? (
          <div
            className="t-linechart__tip"
            style={{ left: Math.min(width - TOOLTIP_WIDTH, Math.max(8, hoverX + 10)), top: PAD.top }}
          >
            <div className="t-linechart__tip-label">{String(data[hover]?.[xKey] ?? "")}</div>
            {visible.map((s) => (
              <div key={s.key} className="t-linechart__tip-row">
                <span className="t-linechart__tip-swatch" style={{ background: seriesColor(s) }} />
                <span>{s.label}</span>
                <strong>{valueAt(hover, s.key)}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="t-linechart__xlabs">
        {xLabelIndexes(data.length).map((i) => (
          <span key={i}>{String(data[i]?.[xKey] ?? "")}</span>
        ))}
      </div>
    </div>
  );
}
