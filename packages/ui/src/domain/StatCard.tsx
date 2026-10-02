import type { HTMLAttributes, ReactNode } from "react";
import { Label } from "../theme/Label";
import { Sparkline } from "../theme/Sparkline";
import { cx } from "../theme/utils";

export type StatCardProps = {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  deltaTone?: "up" | "down" | "muted";
  sparkPoints?: number[];
  note?: ReactNode;
} & HTMLAttributes<HTMLElement>;

export function StatCard({
  label,
  value,
  delta,
  deltaTone = "muted",
  sparkPoints,
  note,
  className,
  ...rest
}: StatCardProps) {
  return (
    <article className={cx("d-stat", className)} {...rest}>
      <Label>{label}</Label>
      <div className="d-stat__row">
        <span className="d-stat__value">{value}</span>
        {delta ? (
          <span className={cx("d-stat__delta", `d-stat__delta--${deltaTone}`)}>
            {delta}
          </span>
        ) : null}
      </div>
      {sparkPoints ? (
        <Sparkline points={sparkPoints} width={100} height={24} className="d-stat__spark" />
      ) : null}
      {note ? <p className="d-stat__note">{note}</p> : null}
    </article>
  );
}
