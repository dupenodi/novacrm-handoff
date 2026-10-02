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

export type ComboboxOption = {
  value: string;
  label?: ReactNode;
};

export type ComboboxProps = {
  label?: ReactNode;
  labelHidden?: boolean;
  helpText?: ReactNode;
  error?: ReactNode | boolean;
  value: string;
  options: Array<string | ComboboxOption>;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
  /** When true (default), typed values need not match an option. */
  allowCustom?: boolean;
  emptyText?: string;
  noMatchText?: string;
};

function normalizeOptions(
  options: Array<string | ComboboxOption>,
): ComboboxOption[] {
  return options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt,
  );
}

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

export function Combobox({
  label,
  labelHidden = false,
  helpText,
  error,
  value,
  options,
  onChange,
  disabled = false,
  placeholder,
  id: idProp,
  className,
  allowCustom = true,
  emptyText = "Type to search",
  noMatchText = "No matches",
}: ComboboxProps) {
  const uid = useId();
  const id = idProp ?? uid;
  const listId = `${id}-list`;
  const helpId = helpText || error ? `${id}-help` : undefined;
  const hasError = Boolean(error);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const normalized = useMemo(() => normalizeOptions(options), [options]);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((opt) => {
      const labelText =
        typeof opt.label === "string" ? opt.label : opt.value;
      return (
        opt.value.toLowerCase().includes(q) ||
        labelText.toLowerCase().includes(q)
      );
    });
  }, [normalized, value]);

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
    setActive(-1);
  }, [value, open]);

  function pick(next: string) {
    onChange(next);
    setOpen(false);
    setActive(-1);
    inputRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(filtered.length ? 0 : -1);
        return;
      }
      if (!filtered.length) return;
      setActive((i) => (i + 1) % filtered.length);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(filtered.length ? filtered.length - 1 : -1);
        return;
      }
      if (!filtered.length) return;
      setActive((i) => (i <= 0 ? filtered.length - 1 : i - 1));
      return;
    }

    if (e.key === "Enter" && open && active >= 0 && filtered[active]) {
      e.preventDefault();
      pick(filtered[active].value);
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
    showList && active >= 0 && filtered[active]
      ? `${listId}-opt-${active}`
      : undefined;

  return (
    <div
      ref={rootRef}
      className={cx(
        "t-picker",
        "t-combobox",
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
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-invalid={hasError || undefined}
          aria-describedby={helpId}
          className={cx(
            "t-picker__control",
            hasError && "t-picker__control--error",
          )}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => {
            onChange(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onBlur={() => {
            if (allowCustom) return;
            const match = normalized.find((o) => o.value === value);
            if (!match && normalized[0]) {
              onChange(normalized[0].value);
            }
          }}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="t-picker__chevron"
          tabIndex={-1}
          disabled={disabled}
          aria-label={showList ? "Hide options" : "Show options"}
          onMouseDown={(e) => {
            e.preventDefault();
            if (disabled) return;
            setOpen((v) => !v);
            inputRef.current?.focus();
          }}
        >
          <Chevron />
        </button>

        {showList ? (
          <ul id={listId} role="listbox" className="t-picker__list">
            {filtered.length === 0 ? (
              <li className="t-picker__empty" role="presentation">
                {value.trim()
                  ? allowCustom
                    ? `${noMatchText} — keep typing`
                    : noMatchText
                  : emptyText}
              </li>
            ) : (
              filtered.map((opt, i) => {
                const selected = opt.value === value;
                return (
                  <li
                    key={opt.value}
                    id={`${listId}-opt-${i}`}
                    role="option"
                    aria-selected={selected}
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
                    <span className="t-picker__option-label">
                      {opt.label ?? opt.value}
                    </span>
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
