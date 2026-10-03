"use client";

import type {
  ChangeEvent,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { useId } from "react";
import { FieldLabel, FieldMessage } from "./field";
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
      <FieldLabel id={id} label={label} hidden={labelHidden} />

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

      <FieldMessage block="t-textfield" id={helpId} error={error} helpText={helpText} />
    </div>
  );
}
