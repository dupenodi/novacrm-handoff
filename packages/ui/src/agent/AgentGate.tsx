import type { ReactNode } from "react";
import { Button } from "../theme";
import { cx } from "../theme/utils";
import type { AgentGateVariant } from "./types";

export type AgentGateAction = {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "critical" | "plain" | "link";
};

export type AgentGateProps = {
  variant: AgentGateVariant;
  eyebrow?: string;
  children: ReactNode;
  actions?: AgentGateAction[];
  className?: string;
};

const defaultEyebrow: Record<AgentGateVariant, string> = {
  reach: "asking for reach, not trust",
  refusal: "I won't do this one",
  clarify: "one question, then I continue",
  approval: "waiting on you · nothing sends",
};

export function AgentGate({
  variant,
  eyebrow,
  children,
  actions = [],
  className,
}: AgentGateProps) {
  return (
    <div className={cx("a-gate", `a-gate--${variant}`, className)}>
      <span className="a-gate__eyebrow">{eyebrow ?? defaultEyebrow[variant]}</span>
      <div className="a-gate__body">{children}</div>
      {actions.length > 0 ? (
        <div className="a-gate__actions form-actions">
          {actions.map((a) =>
            a.variant === "link" || a.variant === "plain" ? (
              <button
                key={a.label}
                type="button"
                className="a-gate__link"
                onClick={a.onClick}
              >
                {a.label}
              </button>
            ) : (
              <Button
                key={a.label}
                variant={a.variant ?? "secondary"}
                onClick={a.onClick}
              >
                {a.label}
              </Button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
