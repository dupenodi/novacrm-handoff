import type { ReactNode } from "react";
import { cx } from "../theme/utils";
import { StatusBadge } from "./StatusBadge";
import type { AgentTone } from "./types";

export type ConfidenceRow = {
  claim: string;
  level: string;
  tone?: AgentTone;
  /** 1–5 filled pips */
  pips: number;
};

export type ConfidenceMeterProps = {
  rows: ConfidenceRow[];
  eyebrow?: ReactNode;
  hint?: ReactNode;
  className?: string;
};

export function ConfidenceMeter({
  rows,
  eyebrow = "How sure I am, stated plainly",
  hint = "Five pips, never a percentage. A number implies arithmetic I can't actually show you.",
  className,
}: ConfidenceMeterProps) {
  return (
    <div className={cx("a-claim", className)}>
      <span className="a-claim__eyebrow">{eyebrow}</span>
      <div className="a-confidence">
        {rows.map((row) => {
          const tone = row.tone ?? "ok";
          const filled = Math.max(0, Math.min(5, row.pips));
          return (
            <div key={row.claim} className="a-confidence__row">
              <div className="a-confidence__head">
                <span className="a-confidence__claim">{row.claim}</span>
                <span style={{ marginLeft: "auto" }}>
                  <StatusBadge label={row.level} tone={tone} showDot={false} />
                </span>
              </div>
              <div
                className="a-confidence__pips"
                role="meter"
                aria-valuenow={filled}
                aria-valuemin={0}
                aria-valuemax={5}
                aria-label={`${row.claim}: ${filled} of 5`}
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <span
                    key={i}
                    className={cx(
                      "a-confidence__pip",
                      i < filled && "a-confidence__pip--on",
                      i < filled && tone === "warn" && "a-confidence__pip--warn",
                      i < filled && tone === "risk" && "a-confidence__pip--risk",
                    )}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {hint ? <span className="a-claim__hint">{hint}</span> : null}
    </div>
  );
}
