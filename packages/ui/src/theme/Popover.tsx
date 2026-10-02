"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cx } from "./utils";

export type PopoverProps = {
  trigger: ReactNode;
  children: ReactNode;
  /** Accessible name for the dialog */
  label: string;
  align?: "start" | "end";
  className?: string;
};

type PanelPos = {
  top: number;
  left: number;
  width: number;
};

/**
 * Popover panels portal to document.body so ancestors with overflow:hidden
 * (e.g. onboarding field lists) cannot clip them.
 */
export function Popover({
  trigger,
  children,
  label,
  align = "start",
  className,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PanelPos | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  function measure() {
    const triggerEl = rootRef.current;
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 48);
    let left =
      align === "end" ? rect.right - width : rect.left;
    left = Math.max(24, Math.min(left, window.innerWidth - width - 24));
    const top = rect.bottom + 8;
    setPos({ top, left, width });
  }

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    measure();
    function onScrollOrResize() {
      measure();
    }
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- measure uses align/open
  }, [open, align]);

  useEffect(() => {
    if (!open) return;

    function onPointer(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const panelStyle: CSSProperties | undefined = pos
    ? {
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 80,
      }
    : undefined;

  return (
    <div
      ref={rootRef}
      className={cx("t-popover", `t-popover--${align}`, className)}
    >
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
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-label={label}
              className="t-popover__panel t-popover__panel--portal"
              style={panelStyle}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
