import type { HTMLAttributes, ReactNode } from "react";
import { Chip, type ChipTone } from "../theme/Chip";
import { cx } from "../theme/utils";

export type ProvenanceFactProps = {
  fact: ReactNode;
  ageLabel?: ReactNode;
  ageTone?: ChipTone;
  sourceTip?: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

export function ProvenanceFact({
  fact,
  ageLabel,
  ageTone = "guess",
  sourceTip,
  className,
  ...rest
}: ProvenanceFactProps) {
  return (
    <div className={cx("d-prov", className)} {...rest}>
      <span className="d-prov__fact">{fact}</span>
      {ageLabel ? (
        <Chip tone={ageTone} size="sm">
          {ageLabel}
        </Chip>
      ) : null}
      {sourceTip ? <span className="d-prov__tip">{sourceTip}</span> : null}
    </div>
  );
}
