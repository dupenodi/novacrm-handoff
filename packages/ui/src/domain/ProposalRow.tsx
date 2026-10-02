import type { HTMLAttributes, ReactNode } from "react";
import { Button } from "../theme/Button";
import { Chip } from "../theme/Chip";
import { cx } from "../theme/utils";

export type ProposalRowProps = {
  verb: string;
  headline: ReactNode;
  why?: ReactNode;
  act?: ReactNode;
  onApprove?: () => void;
  onEdit?: () => void;
  onSkip?: () => void;
} & HTMLAttributes<HTMLDivElement>;

export function ProposalRow({
  verb,
  headline,
  why,
  act,
  onApprove,
  onEdit,
  onSkip,
  className,
  ...rest
}: ProposalRowProps) {
  return (
    <div className={cx("d-proposal", className)} {...rest}>
      <div className="d-proposal__head">
        <Chip tone="accent" size="sm">
          I would {verb}
        </Chip>
        <span className="d-proposal__claim">{headline}</span>
      </div>
      {why ? <p className="d-proposal__why">{why}</p> : null}
      {act ? <p className="d-proposal__act">{act}</p> : null}
      <div className="d-proposal__actions">
        {onApprove ? (
          <Button variant="primary" onClick={onApprove}>
            Approve & {verb}
          </Button>
        ) : null}
        {onEdit ? (
          <Button variant="secondary" onClick={onEdit}>
            Edit first
          </Button>
        ) : null}
        {onSkip ? (
          <Button variant="plain" onClick={onSkip}>
            Skip
          </Button>
        ) : null}
      </div>
    </div>
  );
}
