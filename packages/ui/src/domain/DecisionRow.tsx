import type { HTMLAttributes, ReactNode } from "react";
import { Button } from "../theme/Button";
import { Chip, type ChipTone } from "../theme/Chip";
import { cx } from "../theme/utils";

export type DecisionRowProps = {
  tone?: ChipTone;
  typeLabel: ReactNode;
  claim: ReactNode;
  why?: ReactNode;
  proposal?: ReactNode;
  primary: { label: string; onClick: () => void };
  secondary: { label: string; onClick: () => void };
} & HTMLAttributes<HTMLDivElement>;

/**
 * Type pill · claim · why · accent proposal · two CTAs (affirmative first).
 * Brand §06 — the pattern the product is built on.
 */
export function DecisionRow({
  tone = "guess",
  typeLabel,
  claim,
  why,
  proposal,
  primary,
  secondary,
  className,
  ...rest
}: DecisionRowProps) {
  return (
    <div className={cx("d-decision", className)} {...rest}>
      <div className="d-decision__body">
        <div className="d-decision__head">
          <Chip tone={tone} size="sm">
            {typeLabel}
          </Chip>
          <span className="d-decision__claim">{claim}</span>
        </div>
        {why ? <p className="d-decision__why">{why}</p> : null}
        {proposal ? <p className="d-decision__proposal">{proposal}</p> : null}
      </div>
      <div className="d-decision__actions">
        <Button variant="primary" onClick={primary.onClick}>
          {primary.label}
        </Button>
        <Button variant="secondary" onClick={secondary.onClick}>
          {secondary.label}
        </Button>
      </div>
    </div>
  );
}
