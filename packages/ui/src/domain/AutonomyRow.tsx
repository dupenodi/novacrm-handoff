"use client";

import type { HTMLAttributes, ReactNode } from "react";
import {
  SegmentedControl,
  type SegmentedOption,
} from "../theme/SegmentedControl";
import { cx } from "../theme/utils";

export type AutonomyRowProps<T extends string = string> = {
  what: ReactNode;
  detail?: ReactNode;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
} & Omit<HTMLAttributes<HTMLDivElement>, "onChange">;

export function AutonomyRow<T extends string = string>({
  what,
  detail,
  options,
  value,
  onChange,
  className,
  ...rest
}: AutonomyRowProps<T>) {
  return (
    <div className={cx("d-autonomy", className)} {...rest}>
      <div className="d-autonomy__copy">
        <span className="d-autonomy__what">{what}</span>
        {detail ? <span className="d-autonomy__detail">{detail}</span> : null}
      </div>
      <SegmentedControl
        options={options}
        value={value}
        onChange={onChange}
        size="sm"
        aria-label={typeof what === "string" ? what : "Autonomy"}
      />
    </div>
  );
}
