"use client";

import type { InputHTMLAttributes } from "react";
import { useId } from "react";
import { cx } from "./utils";

export type SliderProps = {
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  showValue?: boolean;
  valueLabel?: string;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "min" | "max" | "step"
>;

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  showValue = true,
  valueLabel,
  id: idProp,
  disabled,
  className,
  ...rest
}: SliderProps) {
  const uid = useId();
  const id = idProp ?? uid;
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className={cx("t-slider", className)}>
      <div className="t-slider__track">
        <div className="t-slider__fill" style={{ width: `${pct}%` }} />
        <div className="t-slider__knob" style={{ left: `${pct}%` }} />
        <input
          {...rest}
          id={id}
          type="range"
          className="t-slider__input"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange?.(Number(e.target.value))}
        />
      </div>
      {showValue ? (
        <span className="t-slider__value">
          {valueLabel ?? `fit ${Math.round(value)}`}
        </span>
      ) : null}
    </div>
  );
}
