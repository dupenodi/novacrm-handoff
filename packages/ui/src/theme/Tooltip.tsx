"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";
import { cx } from "./utils";

export type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  /** When true, always shows the tip bubble (showcase style). */
  persistent?: boolean;
  className?: string;
};

export function Tooltip({
  content,
  children,
  persistent = false,
  className,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const visible = persistent || open;

  return (
    <span
      className={cx("t-tooltip", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span
        className="t-tooltip__activator"
        aria-describedby={visible ? id : undefined}
        tabIndex={0}
      >
        {children}
      </span>
      {visible ? (
        <span id={id} role="tooltip" className="t-tooltip__content">
          {content}
        </span>
      ) : null}
    </span>
  );
}
