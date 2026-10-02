import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type MarkProps = {
  size?: number;
  children?: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

/** Squared brand / company mark placeholder. */
export function Mark({
  size = 30,
  children = "◧",
  className,
  style,
  ...rest
}: MarkProps) {
  return (
    <div
      className={cx("t-mark", className)}
      style={{ width: size, height: size, ...style }}
      aria-hidden={typeof children === "string" ? true : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}
