"use client";

import { useCallback, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { FieldLabel, FieldMessage } from "./field";
import { PickerChevron, PickerList, optionId, useDismiss, wrapIndex } from "./picker";
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

/** A select-style picker: a button that opens a list of fixed options. */
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
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const enabled = useMemo(() => options.filter((o) => !o.disabled), [options]);
  const display = options.find((o) => o.value === value)?.label;
  const isPlaceholder = display == null || display === "";
  const showList = open && !disabled;

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);
  useDismiss(open, [rootRef], close);

  /** Opening highlights the current value, or the first option. */
  function openList() {
    setOpen(true);
    setActive(Math.max(0, enabled.findIndex((o) => o.value === value)));
  }

  function toggle() {
    if (disabled) return;
    if (open) close();
    else openList();
  }

  function pick(next: string) {
    onChange?.(next);
    close();
    triggerRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    const { key } = e;
    if (key === "Escape") {
      if (open) {
        e.preventDefault();
        close();
      }
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Enter", " "].includes(key)) return;

    e.preventDefault();
    if (!open) return openList();
    if (key === "Enter" || key === " ") {
      if (enabled[active]) pick(enabled[active].value);
    } else if (enabled.length) {
      setActive((i) => wrapIndex(i, key === "ArrowDown" ? 1 : -1, enabled.length));
    }
  }

  return (
    <div ref={rootRef} className={cx("t-picker", "t-dropdown", showList && "t-picker--open", className)}>
      <FieldLabel id={id} label={label} hidden={labelHidden} />

      <div className="t-picker__field">
        <button
          ref={triggerRef}
          type="button"
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-haspopup="listbox"
          aria-activedescendant={showList && enabled[active] ? optionId(listId, active) : undefined}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={helpId}
          disabled={disabled}
          className={cx(
            "t-picker__control",
            "t-picker__control--button",
            isPlaceholder && "t-picker__control--placeholder",
            Boolean(error) && "t-picker__control--error",
          )}
          onClick={toggle}
          onKeyDown={onKeyDown}
        >
          <span className="t-picker__value">{isPlaceholder ? placeholder : display}</span>
        </button>
        <PickerChevron
          open={showList}
          disabled={disabled}
          onToggle={() => {
            toggle();
            triggerRef.current?.focus();
          }}
        />

        {showList ? (
          <PickerList
            listId={listId}
            items={enabled}
            value={value}
            active={active}
            emptyText="No options"
            onHover={setActive}
            onPick={pick}
          />
        ) : null}
      </div>

      <FieldMessage block="t-picker" id={helpId} error={error} helpText={helpText} />
    </div>
  );
}
