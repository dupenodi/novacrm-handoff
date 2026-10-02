import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type CardProps = {
  children: ReactNode;
  title?: ReactNode;
  /** Right-aligned meta controls in the title row (e.g. Refresh) — not primary Save */
  actions?: ReactNode;
  flush?: boolean;
} & Omit<HTMLAttributes<HTMLElement>, "title">;

export function Card({
  children,
  title,
  actions,
  flush = false,
  className,
  ...rest
}: CardProps) {
  return (
    <section
      className={cx("t-card", flush && "t-card--flush", className)}
      {...rest}
    >
      {title || actions ? (
        <div className="t-card__head">
          {title ? <h3 className="t-card__title">{title}</h3> : <span />}
          {actions ? <div className="t-card__actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
