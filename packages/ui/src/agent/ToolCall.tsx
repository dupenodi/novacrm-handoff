"use client";

import { useState } from "react";
import { Button } from "../theme";
import { cx } from "../theme/utils";
import { StatusBadge } from "./StatusBadge";
import { toolStateLabel, toolStateTone, type ToolCallState } from "./types";

export type ToolCallProps = {
  /** Human sentence about what the tool did */
  human: string;
  state: ToolCallState;
  /** Result / status copy */
  out?: string;
  why?: string;
  /** Machine call, shown when expanded */
  raw?: string;
  duration?: string;
  retryLabel?: string;
  onRetry?: () => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

export function ToolCall({
  human,
  state,
  out,
  why,
  raw,
  duration,
  retryLabel,
  onRetry,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
}: ToolCallProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const running = state === "running";
  const tone = toolStateTone[state];

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setUncontrolled(next);
    onOpenChange?.(next);
  };

  return (
    <div className={cx("a-tool", className)}>
      <div className={cx("a-tool__head", running && "a-tool__head--running")}>
        <span
          className={cx("a-tool__dot", running && "a-tool__dot--pulse")}
          aria-hidden
        />
        <span className="a-tool__name">{human}</span>
        <StatusBadge label={toolStateLabel[state]} tone={tone} showDot={false} />
        {duration ? <span className="a-tool__ms">{duration}</span> : null}
        {raw ? (
          <Button
            variant="secondary"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            style={{ height: 24, padding: "0 8px", marginLeft: duration ? 0 : "auto" }}
          >
            {open ? "▾" : "▸"}
          </Button>
        ) : null}
      </div>

      {out || why || onRetry ? (
        <div className="a-tool__body">
          {out ? (
            <span
              className={cx(
                "a-tool__out",
                (state === "queued" || state === "skipped") && "a-tool__out--muted",
              )}
            >
              {out}
            </span>
          ) : null}
          <div className="a-tool__foot">
            {why ? <span className="a-tool__why">{why}</span> : null}
            {onRetry && retryLabel ? (
              <Button
                variant="primary"
                onClick={onRetry}
                style={{ marginLeft: "auto", height: 26, padding: "0 10px" }}
              >
                {retryLabel}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {running ? (
        <div className="a-tool__sweep" aria-hidden>
          <span className="a-tool__sweep-bar" />
        </div>
      ) : null}

      {open && raw ? (
        <div className="a-tool__raw">
          <span className="a-tool__raw-label">what it actually ran</span>
          <pre className="a-tool__raw-code">{raw}</pre>
        </div>
      ) : null}
    </div>
  );
}
