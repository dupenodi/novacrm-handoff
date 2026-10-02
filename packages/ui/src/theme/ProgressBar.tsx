import type { HTMLAttributes } from "react";
import { cx } from "./utils";

export type ProgressBarProps = {
  /** 0–100 */
  value: number;
  size?: "sm" | "md";
  label?: string;
  tone?: "accent" | "muted" | "stale" | "ok" | "due" | "risky";
} & HTMLAttributes<HTMLDivElement>;

const toneClass = {
  accent: "t-progress--accent",
  muted: "t-progress--muted",
  stale: "t-progress--stale",
  ok: "t-progress--ok",
  due: "t-progress--due",
  risky: "t-progress--risky",
} as const;

export function ProgressBar({
  value,
  size = "md",
  label,
  tone = "accent",
  className,
  ...rest
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cx("t-progress", size === "sm" && "t-progress--sm", className)}
      {...rest}
    >
      <div
        className={cx("t-progress__track", toneClass[tone])}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="t-progress__fill" style={{ width: `${pct}%` }} />
      </div>
      {label ? <span className="t-progress__label">{label}</span> : null}
    </div>
  );
}
