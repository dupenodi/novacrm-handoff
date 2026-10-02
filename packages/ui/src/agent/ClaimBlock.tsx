import type { ReactNode } from "react";
import { cx } from "../theme/utils";
import { SourceChip, type SourceChipProps } from "./SourceChip";

export type ClaimSource = Pick<SourceChipProps, "label" | "tone" | "title">;

export type ClaimBlockProps = {
  claim: ReactNode;
  sources: ClaimSource[];
  hint?: ReactNode;
  className?: string;
};

export function ClaimBlock({ claim, sources, hint, className }: ClaimBlockProps) {
  return (
    <div className={cx("a-claim", className)}>
      <span className="a-claim__eyebrow">Sources under a claim</span>
      <span className="a-claim__text">{claim}</span>
      <div className="a-claim__sources">
        {sources.map((s) => (
          <SourceChip key={s.label} {...s} />
        ))}
      </div>
      {hint ? <span className="a-claim__hint">{hint}</span> : null}
    </div>
  );
}
