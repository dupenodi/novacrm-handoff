"use client";

import { useState } from "react";
import { cx } from "../theme/utils";

export type PlanStep = {
  label: string;
  status: "done" | "active" | "queued" | "idle";
  note?: string;
};

export type PlanPanelProps = {
  headline: string;
  steps: PlanStep[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

const STEP_MARK: Record<PlanStep["status"], string> = { done: "✓", active: "›", queued: "", idle: "" };
const STEP_NOTE: Record<PlanStep["status"], string> = { done: "done", active: "writing", queued: "queued", idle: "" };

export function PlanPanel({
  headline,
  steps,
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  className,
}: PlanPanelProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const done = steps.filter((s) => s.status === "done").length;

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setUncontrolled(next);
    onOpenChange?.(next);
  };

  return (
    <div className={cx("a-panel", className)}>
      <button
        type="button"
        className="a-panel__toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="a-panel__eyebrow">
          plan · {done} of {steps.length}
        </span>
        <span className="a-panel__title">{headline}</span>
        <span className="a-panel__meta">{open ? "▾" : "▸"}</span>
      </button>
      {open ? (
        <div className="a-panel__body" style={{ gap: 8 }}>
          {steps.map((step) => (
            <div key={step.label} className="a-plan-step">
              <span
                className={cx(
                  "a-plan-step__box",
                  step.status === "done" && "a-plan-step__box--done",
                )}
                aria-hidden
              >
                {STEP_MARK[step.status]}
              </span>
              <span
                className={cx(
                  "a-plan-step__label",
                  step.status === "done" && "a-plan-step__label--done",
                )}
              >
                {step.label}
              </span>
              {step.note || step.status !== "idle" ? (
                <span className="a-plan-step__note">{step.note ?? STEP_NOTE[step.status]}</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
