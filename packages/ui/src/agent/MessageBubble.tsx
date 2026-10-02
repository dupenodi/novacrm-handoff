import type { ReactNode } from "react";
import { cx } from "../theme/utils";
import { StatusBadge } from "./StatusBadge";
import { StreamingCursor } from "./WaitingAtoms";
import type { AgentTone, MessageKind } from "./types";

export type MessageBubbleProps = {
  kind: MessageKind;
  who: string;
  when?: string;
  source?: string;
  sourceTone?: AgentTone;
  children: ReactNode;
  note?: ReactNode;
  streaming?: boolean;
  className?: string;
};

export function MessageBubble({
  kind,
  who,
  when,
  source,
  sourceTone = "neutral",
  children,
  note,
  streaming = false,
  className,
}: MessageBubbleProps) {
  const showCursor = streaming || kind === "streaming";

  return (
    <div className={cx("a-bubble", `a-bubble--${kind}`, className)}>
      <div className="a-bubble__surface">
        <div className="a-bubble__head">
          <span className="a-bubble__who">{who}</span>
          {when ? <span className="a-bubble__when">{when}</span> : null}
          {source ? (
            <StatusBadge label={source} tone={sourceTone} showDot={false} />
          ) : null}
        </div>
        <div className="a-bubble__body">
          {children}
          {showCursor ? <StreamingCursor /> : null}
        </div>
      </div>
      {note ? <span className="a-bubble__note">{note}</span> : null}
    </div>
  );
}
