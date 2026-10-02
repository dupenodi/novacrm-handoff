import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type LabelProps = {
  children: ReactNode;
} & HTMLAttributes<HTMLSpanElement>;

export function Label({ children, className, ...rest }: LabelProps) {
  return (
    <span className={cx("t-label", className)} {...rest}>
      {children}
    </span>
  );
}
