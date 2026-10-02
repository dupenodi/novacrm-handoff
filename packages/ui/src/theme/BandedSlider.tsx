"use client";

import type { HTMLAttributes } from "react";
import { cx } from "./utils";

export type BandedSliderProps = {
  value: number;
  min?: number;
  max?: number;
  /** Inclusive band highlighted on the track. */
  bandMin: number;
  bandMax: number;
  onChange: (value: number) => void;
  floorLabel?: string;
  bandLabel?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "onChange">;

/** Slider with a highlighted acceptable band (e.g. comp floor). */
export function BandedSlider({
  value,
  min = 0,
  max = 100,
  bandMin,
  bandMax,
  onChange,
  floorLabel,
  bandLabel,
  className,
  ...rest
}: BandedSliderProps) {
  const span = max - min || 1;
  const pct = (n: number) => `${((n - min) / span) * 100}%`;
  const left = ((bandMin - min) / span) * 100;
  const width = ((bandMax - bandMin) / span) * 100;

  return (
    <div className={cx("t-banded", className)} {...rest}>
      {(floorLabel || bandLabel) && (
        <div className="t-banded__meta">
          {floorLabel ? <span>{floorLabel}</span> : <span />}
          {bandLabel ? <span>{bandLabel}</span> : null}
        </div>
      )}
      <div className="t-banded__rail">
        <div className="t-banded__track" />
        <div
          className="t-banded__band"
          style={{ left: `${left}%`, width: `${width}%` }}
        />
        <input
          className="t-banded__input"
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={String(value)}
        />
        <span
          className="t-banded__thumb"
          style={{ left: pct(value) }}
          aria-hidden
        />
      </div>
    </div>
  );
}
