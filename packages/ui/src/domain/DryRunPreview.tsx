import type { HTMLAttributes, ReactNode } from "react";
import { Label } from "../theme/Label";
import { cx } from "../theme/utils";

export type DryRunPreviewProps = {
  to: ReactNode;
  when?: ReactNode;
  body: ReactNode;
  title?: ReactNode;
} & HTMLAttributes<HTMLElement>;

export function DryRunPreview({
  to,
  when,
  body,
  title = "Dry run",
  className,
  ...rest
}: DryRunPreviewProps) {
  return (
    <section className={cx("d-dryrun", className)} {...rest}>
      <Label>{title}</Label>
      <div className="d-dryrun__card">
        <div className="d-dryrun__meta">
          <span className="d-dryrun__k">To</span>
          <span className="d-dryrun__to">{to}</span>
          {when ? <span className="d-dryrun__when">{when}</span> : null}
        </div>
        <div className="d-dryrun__body">{body}</div>
      </div>
    </section>
  );
}
