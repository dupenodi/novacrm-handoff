"use client";

import type {
  ChangeEvent,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { useId } from "react";
import { cx } from "./utils";

export type TextFieldProps = {
  label?: ReactNode;
  labelHidden?: boolean;
  helpText?: ReactNode;
  error?: ReactNode | boolean;
  value?: string;
  onChange?: (value: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">;

export function TextField({
  label,
  labelHidden = false,
  helpText,
  error,
  value,
  onChange,
  id: idProp,
  disabled,
  className,
  ...rest
}: TextFieldProps) {
  const uid = useId();
  const id = idProp ?? uid;
  const helpId = helpText || error ? `${id}-help` : undefined;
  const hasError = Boolean(error);

  return (
    <div className={cx("t-textfield", className)}>
      {label ? (
        <label
          htmlFor={id}
          className={labelHidden ? "t-visually-hidden" : "t-label"}
        >
          {label}
        </label>
      ) : null}

      <input
        {...rest}
        id={id}
        disabled={disabled}
        value={value}
        aria-invalid={hasError || undefined}
        aria-describedby={helpId}
        className={cx(
          "t-textfield__input",
          hasError && "t-textfield__input--error",
        )}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange?.(e.target.value)
        }
      />

      {error && typeof error !== "boolean" ? (
        <p id={helpId} className="t-textfield__error" role="alert">
          {error}
        </p>
      ) : helpText ? (
        <p id={helpId} className="t-textfield__help">
          {helpText}
        </p>
      ) : null}
    </div>
  );
}
