import type { CSSProperties, HTMLAttributes } from "react";
import { cx } from "./utils";

export type SkeletonProps = {
  width?: string | number;
  height?: string | number;
} & HTMLAttributes<HTMLSpanElement>;

export function Skeleton({
  width,
  height = 12,
  className,
  style,
  ...rest
}: SkeletonProps) {
  const merged: CSSProperties = {
    ...style,
    width: width ?? style?.width,
    height: height ?? style?.height,
  };
  return (
    <span
      className={cx("t-skel", className)}
      style={merged}
      aria-hidden
      {...rest}
    />
  );
}
