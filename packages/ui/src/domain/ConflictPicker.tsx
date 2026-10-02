"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../theme/utils";

export type ConflictOption = {
  value: string;
  label: ReactNode;
  source?: ReactNode;
  note?: ReactNode;
  color?: string;
};

export type ConflictPickerProps = {
  options: ConflictOption[];
  value: string | null;
  onChange: (value: string) => void;
  hint?: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "onChange">;

export function ConflictPicker({
  options,
  value,
  onChange,
  hint,
  className,
  ...rest
}: ConflictPickerProps) {
  return (
    <div className={cx("d-conflict", className)} role="radiogroup" {...rest}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={cx("d-conflict__opt", selected && "is-selected")}
            onClick={() => onChange(opt.value)}
          >
            <span className="d-conflict__radio" aria-hidden />
            <span className="d-conflict__body">
              <span
                className="d-conflict__val"
                style={opt.color ? { color: opt.color } : undefined}
              >
                {opt.label}
              </span>
              {opt.source ? (
                <span className="d-conflict__src">{opt.source}</span>
              ) : null}
              {opt.note ? (
                <span className="d-conflict__note">{opt.note}</span>
              ) : null}
            </span>
          </button>
        );
      })}
      {hint ? <p className="d-conflict__hint">{hint}</p> : null}
    </div>
  );
}
