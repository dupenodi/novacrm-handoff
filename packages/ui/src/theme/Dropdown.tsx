"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cx } from "./utils";

export type DropdownOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

export type DropdownProps = {
  label?: ReactNode;
  labelHidden?: boolean;
  helpText?: ReactNode;
  error?: ReactNode | boolean;
  value?: string;
  onChange?: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
};

function Chevron() {
  return (
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
  );
}

export function Dropdown({
  label,
  labelHidden = false,
  helpText,
  error,
  value = "",
  onChange,
  options,
  placeholder = "Select…",
  disabled = false,
  id: idProp,
  className,
}: DropdownProps) {
  const uid = useId();
  const id = idProp ?? uid;
  const listId = `${id}-list`;
  const helpId = helpText || error ? `${id}-help` : undefined;
  const hasError = Boolean(error);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const enabled = useMemo(
    () => options.filter((o) => !o.disabled),
    [options],
  );

  const selected = options.find((o) => o.value === value);
  const display = selected?.label;
  const isPlaceholder = display == null || display === "";

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setActive(-1);
      }
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const idx = enabled.findIndex((o) => o.value === value);
    setActive(idx >= 0 ? idx : enabled.length ? 0 : -1);
  }, [open, value, enabled]);

  function pick(next: string) {
    onChange?.(next);
    setOpen(false);
    setActive(-1);
    triggerRef.current?.focus();
  }

  function toggle() {
    if (disabled) return;
    setOpen((v) => !v);
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (!enabled.length) return;
      setActive((i) => (i + 1) % enabled.length);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (!enabled.length) return;
      setActive((i) => (i <= 0 ? enabled.length - 1 : i - 1));
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (active >= 0 && enabled[active]) {
        pick(enabled[active].value);
      }
      return;
    }

    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  const showList = open && !disabled;
  const activeId =
    showList && active >= 0 && enabled[active]
      ? `${listId}-opt-${active}`
      : undefined;

  return (
    <div
      ref={rootRef}
      className={cx(
        "t-picker",
        "t-dropdown",
        showList && "t-picker--open",
        className,
      )}
    >
      {label ? (
        <label
          htmlFor={id}
          className={labelHidden ? "t-visually-hidden" : "t-label"}
        >
          {label}
        </label>
      ) : null}

      <div className="t-picker__field">
        <button
          ref={triggerRef}
          type="button"
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-haspopup="listbox"
          aria-activedescendant={activeId}
          aria-invalid={hasError || undefined}
          aria-describedby={helpId}
          disabled={disabled}
          className={cx(
            "t-picker__control",
            "t-picker__control--button",
            isPlaceholder && "t-picker__control--placeholder",
            hasError && "t-picker__control--error",
          )}
          onClick={toggle}
          onKeyDown={onKeyDown}
        >
          <span className="t-picker__value">
            {isPlaceholder ? placeholder : display}
          </span>
        </button>
        <button
          type="button"
          className="t-picker__chevron"
          tabIndex={-1}
          disabled={disabled}
          aria-label={showList ? "Hide options" : "Show options"}
          onMouseDown={(e) => {
            e.preventDefault();
            toggle();
            triggerRef.current?.focus();
          }}
        >
          <Chevron />
        </button>

        {showList ? (
          <ul id={listId} role="listbox" className="t-picker__list">
            {enabled.length === 0 ? (
              <li className="t-picker__empty" role="presentation">
                No options
              </li>
            ) : (
              enabled.map((opt, i) => {
                const selectedOpt = opt.value === value;
                return (
                  <li
                    key={opt.value}
                    id={`${listId}-opt-${i}`}
                    role="option"
                    aria-selected={selectedOpt}
                    className={cx(
                      "t-picker__option",
                      i === active && "t-picker__option--active",
                    )}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(opt.value);
                    }}
                  >
                    <span className="t-picker__option-label">{opt.label}</span>
                    {selectedOpt ? (
                      <span className="t-picker__check" aria-hidden>
                        ✓
                      </span>
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
      </div>

      {error && typeof error !== "boolean" ? (
        <p id={helpId} className="t-picker__error" role="alert">
          {error}
        </p>
      ) : helpText ? (
        <p id={helpId} className="t-picker__help">
          {helpText}
        </p>
      ) : null}
    </div>
  );
}
