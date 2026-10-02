import type { HTMLAttributes, ReactNode } from "react";
import { Label } from "../theme/Label";
import { cx } from "../theme/utils";

export type ChartCardProps = {
  title: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>;

/** Shell for a viz panel — title · meta · body · footer note. */
export function ChartCard({
  title,
  meta,
  footer,
  children,
  className,
  ...rest
}: ChartCardProps) {
  return (
    <section className={cx("d-chart", className)} {...rest}>
      <header className="d-chart__head">
        <span className="d-chart__title">{title}</span>
        {meta ? <span className="d-chart__meta">{meta}</span> : null}
      </header>
      <div className="d-chart__body">{children}</div>
      {footer ? (
        <footer className="d-chart__foot">
          <Label>{footer}</Label>
        </footer>
      ) : null}
    </section>
  );
}
