import type { HTMLAttributes, ReactNode } from "react";
import { ProgressBar } from "../theme/ProgressBar";
import { cx } from "../theme/utils";

export type StalenessAge = {
  days: ReactNode;
  word: ReactNode;
  pct: number;
  tone?: "ok" | "stale" | "due" | "risky" | "accent" | "muted";
};

export type StalenessMeterProps = {
  ages: StalenessAge[];
} & HTMLAttributes<HTMLDivElement>;

export function StalenessMeter({
  ages,
  className,
  ...rest
}: StalenessMeterProps) {
  return (
    <div className={cx("d-stale", className)} {...rest}>
      {ages.map((a, i) => (
        <div key={i} className="d-stale__cell">
          <ProgressBar value={a.pct} size="sm" tone={a.tone ?? "accent"} />
          <span className="d-stale__days">{a.days}</span>
          <span className="d-stale__word">{a.word}</span>
        </div>
      ))}
    </div>
  );
}
