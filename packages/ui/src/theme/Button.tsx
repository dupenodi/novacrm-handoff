"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "plain"
  | "critical"
  | "icon";

export type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  disabled?: boolean;
  fullWidth?: boolean;
  loading?: boolean;
  loadingLabel?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

const variantClass: Record<ButtonVariant, string> = {
  primary: "t-button--primary",
  secondary: "t-button--secondary",
  plain: "t-button--plain",
  critical: "t-button--critical",
  icon: "t-button--icon",
};

export function Button({
  children,
  variant = "primary",
  disabled = false,
  fullWidth = false,
  loading = false,
  loadingLabel,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={cx(
        "t-button",
        loading ? "t-button--loading" : variantClass[variant],
        fullWidth && "t-button--fullWidth",
        className,
      )}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="t-button__scan" aria-hidden /> : null}
      <span className="t-button__label">
        {loading ? (loadingLabel ?? children) : children}
      </span>
    </button>
  );
}
