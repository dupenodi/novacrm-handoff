"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type SegmentedOption<T extends string = string> = {
  value: T;
  label: ReactNode;
};

export type SegmentedControlProps<T extends string = string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  "aria-label"?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "onChange">;

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = "md",
  className,
  "aria-label": ariaLabel,
  ...rest
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cx(
        "t-segment",
        size === "sm" && "t-segment--sm",
        className,
      )}
      {...rest}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={cx("t-segment__btn", selected && "is-selected")}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
