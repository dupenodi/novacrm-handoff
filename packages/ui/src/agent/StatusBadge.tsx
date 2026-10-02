import { cx } from "../theme/utils";
import type { AgentTone } from "./types";

export type StatusBadgeProps = {
  label: string;
  tone?: AgentTone;
  pulse?: boolean;
  blink?: boolean;
  showDot?: boolean;
  className?: string;
};

export function StatusBadge({
  label,
  tone = "neutral",
  pulse = false,
  blink = false,
  showDot = true,
  className,
}: StatusBadgeProps) {
  return (
    <span className={cx("a-badge", `a-badge--${tone}`, className)}>
      {showDot ? (
        <span
          className={cx(
            "a-badge__dot",
            pulse && "a-badge__dot--pulse",
            blink && "a-badge__dot--blink",
          )}
          aria-hidden
        />
      ) : null}
      <span>{label}</span>
    </span>
  );
}
