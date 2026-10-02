"use client";

import {
  useEffect,
  useId,
  type ReactNode,
  type MouseEvent,
} from "react";
import { cx } from "./utils";
import { Button } from "./Button";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** Optional footer actions — right-aligned; put primary last (trailing) */
  footer?: ReactNode;
  /** Wider dialog for forms */
  size?: "md" | "lg";
  className?: string;
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  className,
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  function onBackdrop(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="t-modal-overlay" role="presentation" onClick={onBackdrop}>
      <div
        className={cx(
          "t-modal",
          size === "lg" && "t-modal--lg",
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="t-modal__head">
          <h2 className="t-modal__title" id={titleId}>
            {title}
          </h2>
          <Button variant="plain" onClick={onClose} aria-label="Close">
            Close
          </Button>
        </div>
        <div className="t-modal__body">{children}</div>
        {footer ? <div className="t-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
