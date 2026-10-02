"use client";

import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
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
        const markStyle: CSSProperties = {
          background:
            CHART_COLOR_VAR[item.color] ?? CHART_COLOR_FALLBACK[item.color],
        };
        const body = (
          <>
            <span
              className={cx(
                "t-chart-legend__mark",
                variant === "swatch"
                  ? "t-chart-legend__mark--swatch"
                  : "t-chart-legend__mark--line",
              )}
              style={markStyle}
              aria-hidden
            />
            <span className="t-chart-legend__label">{item.label}</span>
            {item.end != null ? (
              <span className="t-chart-legend__end">{item.end}</span>
            ) : null}
          </>
        );
        if (item.onClick) {
          return (
            <button
              key={i}
              type="button"
              className={cx(
                "t-chart-legend__item",
                "is-clickable",
                item.active === false && "is-dim",
              )}
              onClick={item.onClick}
            >
              {body}
            </button>
          );
        }
        return (
          <div
            key={i}
            className={cx(
              "t-chart-legend__item",
              item.active === false && "is-dim",
            )}
          >
            {body}
          </div>
        );
      })}
    </div>
  );
}
