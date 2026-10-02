"use client";

import {
  type HTMLAttributes,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

type Point = { x: number; y: number; value: number };

const PAD = { top: 10, right: 8, bottom: 4, left: 28 };

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
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
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const measure = () => {
      const next = Math.round(node.clientWidth);
      if (next > 0) setWidth(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const activeSeries = useMemo(
    () => series.filter((s) => !hidden[s.key]),
    [series, hidden],
  );

  const plotW = Math.max(40, width - PAD.left - PAD.right);
  const plotH = Math.max(40, height - PAD.top - PAD.bottom);

  const { pointsByKey, yTicks, niceMax } = useMemo(() => {
    const values = data.flatMap((row) =>
      activeSeries.map((s) => num(row[s.key])),
    );
    const max = Math.max(1, ...values);
    const niceMax = Math.ceil(max / 4) * 4 || 4;
    const n = Math.max(1, data.length - 1);
    const pointsByKey: Record<string, Point[]> = {};
    for (const s of activeSeries) {
      pointsByKey[s.key] = data.map((row, i) => {
        const value = num(row[s.key]);
        return {
          value,
          x: PAD.left + (i / n) * plotW,
          y: PAD.top + plotH - (value / niceMax) * plotH,
        };
      });
    }
    const yTicks = [0, 0.5, 1].map((t) => ({
      v: Math.round(niceMax * t),
      y: PAD.top + plotH - t * plotH,
    }));
    return { pointsByKey, yTicks, niceMax };
  }, [data, activeSeries, plotW, plotH]);

  void niceMax;

  const onMove = (clientX: number) => {
    const el = wrapRef.current;
    if (!el || data.length === 0 || width <= 0) return;
    const rect = el.getBoundingClientRect();
    const px = clientX - rect.left - PAD.left;
    const n = Math.max(1, data.length - 1);
    const idx = Math.round((px / plotW) * n);
    setHover(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const hoverX =
    hover != null && data.length > 1
      ? PAD.left + (hover / (data.length - 1)) * plotW
      : hover != null
        ? PAD.left
        : null;

  const xLabIndexes = useMemo(() => {
    if (data.length <= 5) return data.map((_, i) => i);
    const step = Math.ceil((data.length - 1) / 3);
    const idxs = [0];
    for (let i = step; i < data.length - 1; i += step) idxs.push(i);
    idxs.push(data.length - 1);
    return [...new Set(idxs)];
  }, [data.length]);

  return (
    <div
      ref={wrapRef}
      className={cx("t-linechart", className)}
      onPointerLeave={() => setHover(null)}
      onPointerMove={(e) => onMove(e.clientX)}
      {...rest}
    >
      <ChartLegend
        items={series.map((s) => ({
          label: s.label,
          color: s.color ?? "accent",
          end:
            hover != null
              ? valueFormatter(num(data[hover]?.[s.key]), s.key)
              : data.length
                ? valueFormatter(num(data[data.length - 1]?.[s.key]), s.key)
                : undefined,
          active: !hidden[s.key],
          onClick: () =>
            setHidden((prev) => ({ ...prev, [s.key]: !prev[s.key] })),
        }))}
      />

      <div className="t-linechart__plot" style={{ height }}>
        {width > 0 ? (
          <svg
            width={width}
            height={height}
            className="t-linechart__svg"
            role="img"
            aria-label="Line chart"
          >
            {showYLabels
              ? yTicks.map((t) => (
                  <g key={`y-${t.v}-${t.y}`}>
                    <line
                      x1={PAD.left}
                      x2={PAD.left + plotW}
                      y1={t.y}
                      y2={t.y}
                      className="t-linechart__grid"
                    />
                    <text
                      x={PAD.left - 6}
                      y={t.y}
                      className="t-linechart__ylab"
                      textAnchor="end"
                      dominantBaseline="middle"
                    >
                      {t.v}
                    </text>
                  </g>
                ))
              : null}

            {activeSeries.map((s) => {
              const pts = pointsByKey[s.key] ?? [];
              if (pts.length < 2) return null;
              const color = CHART_COLOR_FALLBACK[s.color ?? "accent"];
              return (
                <polyline
                  key={s.key}
                  points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke={color}
                  strokeWidth={s.color === "accent" || !s.color ? 2.4 : 2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              );
            })}

            {hoverX != null ? (
              <line
                x1={hoverX}
                x2={hoverX}
                y1={PAD.top}
                y2={PAD.top + plotH}
                className="t-linechart__cross"
              />
            ) : null}

            {hover != null
              ? activeSeries.map((s) => {
                  const p = pointsByKey[s.key]?.[hover];
                  if (!p) return null;
                  return (
                    <circle
                      key={s.key}
                      cx={p.x}
                      cy={p.y}
                      r={3.4}
                      fill={CHART_COLOR_FALLBACK[s.color ?? "accent"]}
                      stroke="var(--t-surf)"
                      strokeWidth={1.5}
                    />
                  );
                })
              : activeSeries.map((s) => {
                  const pts = pointsByKey[s.key];
                  const p = pts?.[pts.length - 1];
                  if (!p) return null;
                  return (
                    <circle
                      key={`end-${s.key}`}
                      cx={p.x}
                      cy={p.y}
                      r={3.4}
                      fill={CHART_COLOR_FALLBACK[s.color ?? "accent"]}
                    />
                  );
                })}
          </svg>
        ) : null}

        {hover != null && hoverX != null && width > 0 ? (
          <div
            className="t-linechart__tip"
            style={{
              left: Math.min(width - 148, Math.max(8, hoverX + 10)),
              top: PAD.top,
            }}
          >
            <div className="t-linechart__tip-label">
              {String(data[hover]?.[xKey] ?? "")}
            </div>
            {activeSeries.map((s) => (
              <div key={s.key} className="t-linechart__tip-row">
                <span
                  className="t-linechart__tip-swatch"
                  style={{
                    background: CHART_COLOR_FALLBACK[s.color ?? "accent"],
                  }}
                />
                <span>{s.label}</span>
                <strong>
                  {valueFormatter(num(data[hover]?.[s.key]), s.key)}
                </strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="t-linechart__xlabs">
        {xLabIndexes.map((i) => (
          <span key={i}>{String(data[i]?.[xKey] ?? "")}</span>
        ))}
      </div>
    </div>
  );
}
