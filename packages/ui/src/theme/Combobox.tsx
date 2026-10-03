"use client";

import { useCallback, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { FieldLabel, FieldMessage } from "./field";
import { PickerChevron, PickerList, optionId, useDismiss, wrapIndex } from "./picker";
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

function toOption(option: string | ComboboxOption): ComboboxOption {
  return typeof option === "string" ? { value: option, label: option } : option;
}

/** Options whose value or text label contains the query. */
function filterOptions(options: ComboboxOption[], query: string): ComboboxOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter((option) => {
    const text = typeof option.label === "string" ? option.label : option.value;
    return option.value.toLowerCase().includes(q) || text.toLowerCase().includes(q);
  });
}

/** A text input with a filtered suggestion list. */
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
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const normalized = useMemo(() => options.map(toOption), [options]);
  const filtered = useMemo(() => filterOptions(normalized, value), [normalized, value]);
  const showList = open && !disabled;

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);
  useDismiss(open, [rootRef], close);

  function pick(next: string) {
    onChange(next);
    close();
    inputRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    const { key } = e;

    if (key === "ArrowDown" || key === "ArrowUp") {
      e.preventDefault();
      // Opening lands on the first (down) or last (up) option.
      if (!open) setOpen(true);
      if (filtered.length) setActive((i) => wrapIndex(open ? i : -1, key === "ArrowDown" ? 1 : -1, filtered.length));
    } else if (key === "Enter" && open && filtered[active]) {
      e.preventDefault();
      pick(filtered[active].value);
    } else if (key === "Escape" && open) {
      e.preventDefault();
      close();
    }
  }

  /** Without custom values, leaving the field snaps an unknown value to the first option. */
  function onBlur() {
    if (allowCustom || normalized.some((o) => o.value === value)) return;
    if (normalized[0]) onChange(normalized[0].value);
  }

  function emptyMessage(): string {
    if (!value.trim()) return emptyText;
    return allowCustom ? `${noMatchText} — keep typing` : noMatchText;
  }

  return (
    <div ref={rootRef} className={cx("t-picker", "t-combobox", showList && "t-picker--open", className)}>
      <FieldLabel id={id} label={label} hidden={labelHidden} />

      <div className="t-picker__field">
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && filtered[active] ? optionId(listId, active) : undefined}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={helpId}
          className={cx("t-picker__control", Boolean(error) && "t-picker__control--error")}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
        <PickerChevron
          open={showList}
          disabled={disabled}
          onToggle={() => {
            if (disabled) return;
            if (open) close();
            else setOpen(true);
            inputRef.current?.focus();
          }}
        />

        {showList ? (
          <PickerList
            listId={listId}
            items={filtered}
            value={value}
            active={active}
            emptyText={emptyMessage()}
            onHover={setActive}
            onPick={pick}
          />
        ) : null}
      </div>

      <FieldMessage block="t-picker" id={helpId} error={error} helpText={helpText} />
    </div>
  );
}
