import type { HTMLAttributes } from "react";
import { cx } from "./utils";

export type SparklineProps = {
  points: number[];
  width?: number;
  height?: number;
} & HTMLAttributes<SVGSVGElement>;

/** Minimal polyline spark from a numeric series. */
export function Sparkline({
  points,
  width = 100,
  height = 26,
  className,
  ...rest
}: SparklineProps) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const poly = points
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / span) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      className={cx("t-spark", className)}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width={width}
      height={height}
      aria-hidden
      {...rest}
    >
      <polyline className="t-spark__line" points={poly} />
    </svg>
  );
}
