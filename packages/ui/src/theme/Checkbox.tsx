"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { FieldMessage } from "./field";
import { cx } from "./utils";

export type CheckboxProps = {
  label: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode | boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange" | "checked"
>;

export function Checkbox({
  label,
  helpText,
  error,
  checked = false,
  onChange,
  id: idProp,
  disabled,
  className,
  ...rest
}: CheckboxProps) {
  const uid = useId();
  const id = idProp ?? uid;
  const hasError = Boolean(error);

  return (
    <div className={cx("t-checkbox", className)}>
      <label className="t-checkbox__control" htmlFor={id}>
        <input
          {...rest}
          id={id}
          type="checkbox"
          className="t-checkbox__input"
          checked={checked}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        <span
          className={cx(
            "t-checkbox__box",
            checked && "t-checkbox__box--checked",
          )}
          aria-hidden
        >
          {checked ? "✓" : ""}
        </span>
        <span className="t-checkbox__label">{label}</span>
      </label>
      <FieldMessage block="t-checkbox" error={error} helpText={helpText} />
    </div>
  );
}
