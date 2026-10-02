"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { cx } from "./utils";

export type SwitchProps = {
  label?: ReactNode;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "type">;

export function Switch({
  label,
  checked = false,
  onChange,
  disabled,
  id: idProp,
  className,
  ...rest
}: SwitchProps) {
  const uid = useId();
  const id = idProp ?? uid;

  return (
    <div className={cx("t-switch", className)}>
      <button
        {...rest}
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className="t-switch__control"
        onClick={() => onChange?.(!checked)}
      >
        <span
          className={cx("t-switch__track", checked && "t-switch__track--on")}
        >
          <span className="t-switch__knob" />
        </span>
        {label ? <span className="t-switch__label">{label}</span> : null}
      </button>
    </div>
  );
}
