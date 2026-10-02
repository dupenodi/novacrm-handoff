import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type AvatarProps = {
  size?: number;
  initials?: string;
  src?: string;
  alt?: string;
  shape?: "circle" | "squircle";
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

export function Avatar({
  size = 32,
  initials,
  src,
  alt = "",
  shape = "circle",
  children,
  className,
  style,
  ...rest
}: AvatarProps) {
  return (
    <div
      className={cx(
        "t-avatar",
        shape === "circle" ? "t-avatar--circle" : "t-avatar--squircle",
        className,
      )}
      style={{ width: size, height: size, ...style }}
      {...rest}
    >
      {src ? (
        // biome-ignore lint/performance/noImgElement: theme avatar accepts arbitrary URLs
        <img className="t-avatar__img" src={src} alt={alt} />
      ) : (
        <span className="t-avatar__fallback">{children ?? initials ?? "·"}</span>
      )}
    </div>
  );
}
