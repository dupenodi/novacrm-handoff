import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../theme/utils";

export type WeekDay = {
  label: ReactNode;
  text?: ReactNode;
  active?: boolean;
  muted?: boolean;
};

export type WeekStripProps = {
  days: WeekDay[];
} & HTMLAttributes<HTMLDivElement>;

export function WeekStrip({ days, className, ...rest }: WeekStripProps) {
  return (
    <div className={cx("d-week", className)} {...rest}>
      {days.map((d, i) => (
        <div key={i} className="d-week__col">
          <span className="d-week__label">{d.label}</span>
          <div
            className={cx(
              "d-week__cell",
              d.active && "is-active",
              d.muted && "is-muted",
            )}
          >
            {d.text ? <span className="d-week__text">{d.text}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
