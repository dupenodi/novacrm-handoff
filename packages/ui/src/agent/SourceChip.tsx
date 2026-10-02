import { cx } from "../theme/utils";
import type { AgentTone } from "./types";

export type SourceChipProps = {
  label: string;
  tone?: Extract<AgentTone, "ok" | "warn" | "neutral">;
  title?: string;
  className?: string;
};

export function SourceChip({
  label,
  tone = "neutral",
  title,
  className,
}: SourceChipProps) {
  return (
    <span
      className={cx("a-source", `a-source--${tone}`, className)}
      title={title ?? label}
    >
      <span className="a-source__dot" aria-hidden />
      <span>{label}</span>
    </span>
  );
}
