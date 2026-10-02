import type { ReactNode } from "react";
import { Button } from "../theme";
import { cx } from "../theme/utils";
import { StatusBadge } from "./StatusBadge";
import type { AgentTone } from "./types";

export type AgentRunStatus = {
  label: string;
  tone: AgentTone;
  pulse?: boolean;
  blink?: boolean;
};

export type AgentRunProps = {
  status: AgentRunStatus;
  elapsed?: string;
  onStop?: () => void;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AgentRun({
  status,
  elapsed,
  onStop,
  toolbar,
  children,
  className,
}: AgentRunProps) {
  return (
    <div className={cx("a-run", className)}>
      <div className="a-run__head">
        <StatusBadge
          label={status.label}
          tone={status.tone}
          pulse={status.pulse}
          blink={status.blink}
        />
        {elapsed ? <span className="a-run__elapsed">{elapsed}</span> : null}
        <div className="a-run__actions">
          {toolbar}
          {onStop ? (
            <Button variant="critical" onClick={onStop} style={{ height: 25, padding: "0 9px" }}>
              Stop
            </Button>
          ) : null}
        </div>
      </div>
      <div className="a-run__body">{children}</div>
    </div>
  );
}
