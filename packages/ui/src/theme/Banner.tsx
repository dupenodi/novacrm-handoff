import type { ReactNode } from "react";
import { cx } from "./utils";

export type BannerTone = "warning" | "success" | "danger";

export type BannerProps = {
  title?: ReactNode;
  children?: ReactNode;
  tone?: BannerTone;
  onDismiss?: () => void;
  className?: string;
};

export function Banner({
  title,
  children,
  tone = "warning",
  onDismiss,
  className,
}: BannerProps) {
  return (
    <div
      className={cx("t-banner", `t-banner--${tone}`, className)}
      role={tone === "danger" ? "alert" : "status"}
    >
      {tone === "warning" || tone === "danger" ? (
        <span className="t-banner__dot" aria-hidden />
      ) : null}
      <div className="t-banner__body">
        {title ? <p className="t-banner__title">{title}</p> : null}
        {children ? <div className="t-banner__text">{children}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          className="t-banner__dismiss"
          aria-label="Dismiss"
          onClick={onDismiss}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
