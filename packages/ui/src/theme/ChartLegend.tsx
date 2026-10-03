"use client";

import type { HTMLAttributes, ReactNode } from "react";
import {
  CHART_COLOR_FALLBACK,
  CHART_COLOR_VAR,
  type ChartColor,
} from "./chart-colors";
import { cx } from "./utils";

export type ChartLegendItem = {
  label: ReactNode;
  color: ChartColor;
  end?: ReactNode;
  active?: boolean;
  onClick?: () => void;
};

export type ChartLegendProps = {
  items: ChartLegendItem[];
  variant?: "line" | "swatch";
} & HTMLAttributes<HTMLDivElement>;

export function ChartLegend({
  items,
  variant = "line",
  className,
  ...rest
}: ChartLegendProps) {
  return (
    <div className={cx("t-chart-legend", className)} {...rest}>
      {items.map((item, i) => {
        const itemClass = cx(
          "t-chart-legend__item",
          item.onClick && "is-clickable",
          item.active === false && "is-dim",
        );
        const body = (
          <>
            <span
              className={cx("t-chart-legend__mark", `t-chart-legend__mark--${variant}`)}
              style={{ background: CHART_COLOR_VAR[item.color] ?? CHART_COLOR_FALLBACK[item.color] }}
              aria-hidden
            />
            <span className="t-chart-legend__label">{item.label}</span>
            {item.end != null ? <span className="t-chart-legend__end">{item.end}</span> : null}
          </>
        );
        return item.onClick ? (
          <button key={i} type="button" className={itemClass} onClick={item.onClick}>
            {body}
          </button>
        ) : (
          <div key={i} className={itemClass}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
