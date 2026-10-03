"use client";

import { useCallback, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDismiss } from "./picker";
import { cx } from "./utils";

export type PopoverProps = {
  trigger: ReactNode;
  children: ReactNode;
  /** Accessible name for the dialog */
  label: string;
  align?: "start" | "end";
  className?: string;
};

type PanelPosition = { top: number; left: number; width: number };

const PANEL_MAX_WIDTH = 340;
const VIEWPORT_MARGIN = 24;
const GAP = 8;

/** Places the panel under the trigger, clamped inside the viewport. */
function panelPosition(trigger: HTMLElement, align: "start" | "end"): PanelPosition {
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(PANEL_MAX_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
  const preferredLeft = align === "end" ? rect.right - width : rect.left;
  const left = Math.max(VIEWPORT_MARGIN, Math.min(preferredLeft, window.innerWidth - width - VIEWPORT_MARGIN));
  return { top: rect.bottom + GAP, left, width };
}

/**
 * Popover panels portal to document.body so ancestors with overflow:hidden
 * (e.g. onboarding field lists) cannot clip them.
 */
export function Popover({ trigger, children, label, align = "start", className }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, [rootRef, panelRef], close, { escape: true });

  // Keep the panel pinned to the trigger while the page scrolls or resizes.
  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const measure = () => {
      if (rootRef.current) setPosition(panelPosition(rootRef.current, align));
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, align]);

  return (
    <div ref={rootRef} className={cx("t-popover", `t-popover--${align}`, className)}>
      <button
        type="button"
        className="t-popover__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </button>
      {open && position
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-label={label}
              className="t-popover__panel t-popover__panel--portal"
              style={{ position: "fixed", zIndex: 80, ...position }}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
