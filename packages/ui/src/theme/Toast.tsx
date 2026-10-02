"use client";

import { useEffect } from "react";
import { cx } from "./utils";

export type ToastProps = {
  content: string;
  duration?: number;
  onDismiss?: () => void;
  className?: string;
};

export function Toast({
  content,
  duration = 0,
  onDismiss,
  className,
}: ToastProps) {
  useEffect(() => {
    if (!onDismiss || duration <= 0) return;
    const id = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(id);
  }, [duration, onDismiss]);

  return (
    <div className={cx("t-toast", className)} role="status">
      <span>{content}</span>
      {onDismiss ? (
        <button
          type="button"
          className="t-toast__dismiss"
          aria-label="Dismiss"
          onClick={onDismiss}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
