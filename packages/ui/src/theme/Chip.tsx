"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type ChipTone =
  | "accent"
  | "guess"
  | "stale"
  | "critical"
  | "muted"
  | "scope"
  | "ok"
  | "removable"
  | "fresh"
  | "due"
  | "risky"
  | "inbound"
  | "info"
  | "neutral";

export type ChipSize = "md" | "sm";

export type ChipProps = {
  children: ReactNode;
  tone?: ChipTone;
  size?: ChipSize;
  onRemove?: () => void;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export function Chip({
  children,
  tone = "accent",
  size = "md",
  onRemove,
  className,
  type = "button",
  onClick,
  ...rest
}: ChipProps) {
  const removable = tone === "removable" || Boolean(onRemove);
  const classes = cx("t-chip", `t-chip--${removable ? "removable" : tone}`, size === "sm" && "t-chip--sm", className);

  // Interactive chips are buttons; plain ones are spans.
  if (!removable && !onClick) return <span className={classes}>{children}</span>;

  return (
    <button type={type} className={classes} onClick={onRemove ?? onClick} {...rest}>
      {children}
      {removable ? <span aria-hidden>×</span> : null}
    </button>
  );
}
