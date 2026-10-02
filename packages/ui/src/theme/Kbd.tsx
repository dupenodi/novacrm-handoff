import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type KbdProps = {
  children: ReactNode;
} & HTMLAttributes<HTMLElement>;

/** Keyboard hint chip (⌘K, J, A). */
export function Kbd({ children, className, ...rest }: KbdProps) {
  return (
    <kbd className={cx("t-kbd", className)} {...rest}>
      {children}
    </kbd>
  );
}
