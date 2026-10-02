"use client";

import { type HTMLAttributes, useState } from "react";
import { CHART_COLOR_FALLBACK, type ChartColor } from "./chart-colors";
import { cx } from "./utils";

export type BarListItem = {
  label: string;
  value: number;
  color?: ChartColor;
};

export type BarListProps = {
  items: BarListItem[];
  /** Cap for bar width. Defaults to max item value. */
  max?: number;
  valueFormatter?: (value: number) => string;
} & HTMLAttributes<HTMLDivElement>;

/** Horizontal bars — hover lifts the row; brand flat fill + ink edge. */
export function BarList({
  items,
  max: maxProp,
  valueFormatter = (v) => String(v),
  className,
  ...rest
}: BarListProps) {
  const [focus, setFocus] = useState<number | null>(null);
  const max = maxProp ?? Math.max(1, ...items.map((i) => i.value));

  return (
    <div className={cx("t-barlist", className)} {...rest}>
      {items.map((item, i) => {
        const pct = Math.max(0, Math.min(100, (item.value / max) * 100));
        const color = CHART_COLOR_FALLBACK[item.color ?? "accent"];
        const dimmed = focus != null && focus !== i;
        return (
          <div
            key={item.label}
            className={cx("t-barlist__row", dimmed && "is-dim")}
            onPointerEnter={() => setFocus(i)}
            onPointerLeave={() => setFocus(null)}
          >
            <span className="t-barlist__label">{item.label}</span>
            <div className="t-barlist__track">
              <div
                className="t-barlist__fill"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            <span className="t-barlist__value">{valueFormatter(item.value)}</span>
          </div>
        );
      })}
    </div>
  );
}
