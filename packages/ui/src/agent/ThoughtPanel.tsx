"use client";

import { useState } from "react";
import { cx } from "../theme/utils";

export type ThoughtPanelProps = {
  summary: string;
  steps: string[];
  duration?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

export function ThoughtPanel({
  summary,
  steps,
  duration,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
}: ThoughtPanelProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;

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
        <span className="a-panel__mark" aria-hidden />
        <span className="a-panel__title">{summary}</span>
        <span className="a-panel__meta">
          {open ? "▾" : "▸"} {steps.length} steps
          {duration ? ` · ${duration}` : ""}
        </span>
      </button>
      {open ? (
        <div className="a-panel__body">
          {steps.map((step) => (
            <div key={step} className="a-thought-step">
              <span className="a-thought-step__dot" aria-hidden />
              <span className="a-thought-step__text">{step}</span>
            </div>
          ))}
          <span className="a-panel__hint">
            Collapsed by default. Reasoning is available, never performed.
          </span>
        </div>
      ) : null}
    </div>
  );
}
