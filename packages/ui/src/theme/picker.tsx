"use client";

import { useEffect, type ReactNode, type RefObject } from "react";
import { cx } from "./utils";

/** Shared parts of Dropdown and Combobox. Both use the `t-picker` styles. */

export type PickerItem = { value: string; label?: ReactNode };

/** Calls `onDismiss` on a mousedown outside every ref while `active`. Escape too, when `escape` is set. */
export function useDismiss(
  active: boolean,
  refs: Array<RefObject<HTMLElement | null>>,
  onDismiss: () => void,
  { escape = false } = {},
) {
  useEffect(() => {
    if (!active) return;
    function onPointer(e: MouseEvent) {
      const target = e.target as Node;
      if (!refs.some((ref) => ref.current?.contains(target))) onDismiss();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    document.addEventListener("mousedown", onPointer);
    if (escape) document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
    // Refs are stable; re-binding on every render isn't needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, onDismiss, escape]);
}

/** Next index when moving by `step` through `length` items, wrapping at both ends. */
export function wrapIndex(current: number, step: 1 | -1, length: number): number {
  if (current < 0) return step === 1 ? 0 : length - 1;
  return (current + step + length) % length;
}

export function optionId(listId: string, index: number): string {
  return `${listId}-opt-${index}`;
}

export function PickerChevron({ open, disabled, onToggle }: { open: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="t-picker__chevron"
      tabIndex={-1}
      disabled={disabled}
      aria-label={open ? "Hide options" : "Show options"}
      onMouseDown={(e) => {
        // Keep focus on the control.
        e.preventDefault();
        onToggle();
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        <path
          d="M2.5 4.25 6 7.75l3.5-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export function PickerList({
  listId,
  items,
  value,
  active,
  emptyText,
  onHover,
  onPick,
}: {
  listId: string;
  items: PickerItem[];
  value: string;
  active: number;
  emptyText: ReactNode;
  onHover: (index: number) => void;
  onPick: (value: string) => void;
}) {
  return (
    <ul id={listId} role="listbox" className="t-picker__list">
      {items.length === 0 ? (
        <li className="t-picker__empty" role="presentation">
          {emptyText}
        </li>
      ) : (
        items.map((item, i) => {
          const selected = item.value === value;
          return (
            <li
              key={item.value}
              id={optionId(listId, i)}
              role="option"
              aria-selected={selected}
              className={cx("t-picker__option", i === active && "t-picker__option--active")}
              onMouseEnter={() => onHover(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(item.value);
              }}
            >
              <span className="t-picker__option-label">{item.label ?? item.value}</span>
              {selected ? (
                <span className="t-picker__check" aria-hidden>
                  ✓
                </span>
              ) : null}
            </li>
          );
        })
      )}
    </ul>
  );
}
