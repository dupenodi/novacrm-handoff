import { Button } from "../theme";
import { cx } from "../theme/utils";
import { StatusBadge } from "./StatusBadge";
import type { AgentTone } from "./types";

export type FailureCardProps = {
  tag: string;
  title: string;
  body: string;
  kept: string;
  tone?: Extract<AgentTone, "risk" | "warn" | "neutral">;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  className?: string;
};

export function FailureCard({
  tag,
  title,
  body,
  kept,
  tone = "warn",
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  className,
}: FailureCardProps) {
  return (
    <div className={cx("a-fail", `a-fail--${tone}`, className)}>
      <div className="a-fail__head">
        <StatusBadge label={tag} tone={tone} showDot={false} />
        <span className="a-fail__title">{title}</span>
      </div>
      <span className="a-fail__body">{body}</span>
      <span className="a-fail__kept">{kept}</span>
      {primaryLabel || secondaryLabel ? (
        <div className="a-fail__actions form-actions">
          {primaryLabel ? (
            <Button variant="primary" onClick={onPrimary}>
              {primaryLabel}
            </Button>
          ) : null}
          {secondaryLabel ? (
            <Button variant="secondary" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
