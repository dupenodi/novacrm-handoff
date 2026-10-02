import type { ReactNode } from "react";
import { Button } from "../theme";
import { cx } from "../theme/utils";
import { StatusBadge } from "./StatusBadge";
import type { ProgressVariant } from "./types";

export type AgentProgressProps = {
  variant: ProgressVariant;
  label?: ReactNode;
  text?: ReactNode;
  meta?: ReactNode;
  /** 0–100 for determinate */
  value?: number;
  onStop?: () => void;
  className?: string;
};

export function AgentProgress({
  variant,
  label,
  text,
  meta,
  value = 0,
  onStop,
  className,
}: AgentProgressProps) {
  if (variant === "skeleton") {
    return (
      <div className={cx("a-progress", className)}>
        {label ? <span className="a-progress__label">{label}</span> : null}
        <div className="a-progress__skel" aria-hidden>
          <span className="a-progress__skel-line" />
          <span className="a-progress__skel-line a-progress__skel-line--short" />
        </div>
        {text ? <span className="a-progress__text">{text}</span> : null}
      </div>
    );
  }

  if (variant === "background") {
    return (
      <div className={cx("a-progress", "a-progress--muted", className)}>
        {label ? <span className="a-progress__label">{label}</span> : null}
        {text ? <span className="a-progress__text">{text}</span> : null}
        <div className="a-progress__row">
          <StatusBadge label="running in background" tone="info" showDot={false} />
          {meta ? <span className="a-progress__meta">{meta}</span> : null}
        </div>
      </div>
    );
  }

  const thin = variant === "indeterminate";

  return (
    <div className={cx("a-progress", className)}>
      {label ? <span className="a-progress__label">{label}</span> : null}
      <div
        className={cx("a-progress__bar", thin && "a-progress__bar--thin")}
        role="progressbar"
        aria-valuenow={thin ? undefined : Math.round(value)}
        aria-valuemin={thin ? undefined : 0}
        aria-valuemax={thin ? undefined : 100}
      >
        {thin ? (
          <span className="a-progress__sweep" aria-hidden />
        ) : (
          <div
            className="a-progress__fill"
            style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          />
        )}
      </div>
      <div className="a-progress__row">
        {text ? <span className="a-progress__text">{text}</span> : null}
        {meta ? <span className="a-progress__meta">{meta}</span> : null}
        {onStop ? (
          <Button variant="secondary" onClick={onStop} style={{ height: 26, padding: "0 10px" }}>
            Stop
          </Button>
        ) : null}
      </div>
    </div>
  );
}
