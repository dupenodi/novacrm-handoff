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

const toneClass: Record<ChipTone, string> = {
  accent: "t-chip--accent",
  guess: "t-chip--guess",
  stale: "t-chip--stale",
  critical: "t-chip--critical",
  muted: "t-chip--muted",
  scope: "t-chip--scope",
  ok: "t-chip--ok",
  removable: "t-chip--removable",
  fresh: "t-chip--fresh",
  due: "t-chip--due",
  risky: "t-chip--risky",
  inbound: "t-chip--inbound",
  info: "t-chip--info",
  neutral: "t-chip--neutral",
};

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
  const sizeClass = size === "sm" ? "t-chip--sm" : undefined;

  if (tone === "removable" || onRemove) {
    return (
      <button
        type={type}
        className={cx("t-chip", "t-chip--removable", sizeClass, className)}
        onClick={onRemove ?? onClick}
        {...rest}
      >
        {children}
        <span aria-hidden>×</span>
      </button>
    );
  }

  if (onClick) {
    return (
      <button
        type={type}
        className={cx("t-chip", toneClass[tone], sizeClass, className)}
        onClick={onClick}
        {...rest}
      >
        {children}
      </button>
    );
  }

  return (
    <span className={cx("t-chip", toneClass[tone], sizeClass, className)}>
      {children}
    </span>
  );
}
