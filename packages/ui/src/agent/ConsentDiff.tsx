import type { ReactNode } from "react";
import { Button } from "../theme";
import { cx } from "../theme/utils";

export type DiffChange = {
  field: string;
  from: string;
  to: string;
};

export type ConsentDiffProps = {
  changes: DiffChange[];
  onApplyAll?: () => void;
  onPickIndividually?: () => void;
  applyLabel?: string;
  pickLabel?: string;
  className?: string;
  actions?: ReactNode;
};

export function ConsentDiff({
  changes,
  onApplyAll,
  onPickIndividually,
  applyLabel = "Apply both",
  pickLabel = "Pick individually",
  className,
  actions,
}: ConsentDiffProps) {
  return (
    <div className={cx("a-diff", className)}>
      <div className="a-diff__head">
        <span className="a-diff__eyebrow">diff before I change your data</span>
        <span className="a-diff__meta">
          {changes.length} change{changes.length === 1 ? "" : "s"}
        </span>
      </div>
      {changes.map((c) => (
        <div key={c.field} className="a-diff__row">
          <span className="a-diff__field">{c.field}</span>
          <div className="a-diff__values">
            <span className="a-diff__from">{c.from}</span>
            <span className="a-diff__arrow" aria-hidden>
              →
            </span>
            <span className="a-diff__to">{c.to}</span>
          </div>
        </div>
      ))}
      <div className="a-diff__actions form-actions">
        {actions ?? (
          <>
            {onApplyAll ? (
              <Button variant="primary" onClick={onApplyAll}>
                {applyLabel}
              </Button>
            ) : null}
            {onPickIndividually ? (
              <Button variant="secondary" onClick={onPickIndividually}>
                {pickLabel}
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
