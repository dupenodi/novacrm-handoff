"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { FieldLabel, FieldMessage } from "./field";
import { cx } from "./utils";

/** Fixed length so every saved secret renders the same password-dot row. */
const FILLED_SENTINEL = "xxxxxxxxxxxxxxxx";

export type SecretFieldProps = {
  label?: ReactNode;
  labelHidden?: boolean;
  helpText?: ReactNode;
  error?: ReactNode | boolean;
  /** Truthy when a secret is already saved (value is never shown). */
  masked?: string | null;
  /** Draft while editing; empty when showing the filled dots. */
  value: string;
  onChange: (value: string) => void;
  /** Shown only while empty / editing with no draft. */
  placeholder?: string;
  disabled?: boolean;
  className?: string;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value" | "type" | "disabled" | "placeholder" | "readOnly"
>;

/**
 * Saved secret → password dots + Edit.
 * Empty → plain empty field (no dots).
 * Typing a replacement → password dots as you type.
 */
export function SecretField({
  label,
  labelHidden = false,
  helpText,
  error,
  masked,
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  id: idProp,
  ...rest
}: SecretFieldProps) {
  const uid = useId();
  const id = idProp ?? uid;
  const helpId = helpText || error ? `${id}-help` : undefined;
  const hasError = Boolean(error);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasMasked = Boolean(masked);
  const [editing, setEditing] = useState(!hasMasked);

  // A newly saved secret goes back to the dots; clearing it opens the field.
  useEffect(() => setEditing(!hasMasked), [masked, hasMasked]);

  // Clicking Edit on a saved secret focuses the field.
  useEffect(() => {
    if (editing && hasMasked) inputRef.current?.focus();
  }, [editing, hasMasked]);

  const showFilled = hasMasked && !editing;
  // Dots only when there is something to hide.
  const usePassword = showFilled || value.length > 0;

  function startEdit() {
    setEditing(true);
    onChange("");
  }

  function cancelEdit() {
    setEditing(false);
    onChange("");
  }

  return (
    <div className={cx("t-secretfield", className)}>
      <FieldLabel id={id} label={label} hidden={labelHidden} />

      <div className="t-secretfield__row">
        <input
          {...rest}
          ref={inputRef}
          id={id}
          type={usePassword ? "password" : "text"}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          readOnly={showFilled}
          value={showFilled ? FILLED_SENTINEL : value}
          placeholder={showFilled ? undefined : placeholder}
          aria-invalid={hasError || undefined}
          aria-describedby={helpId}
          className={cx(
            "t-textfield__input",
            "t-secretfield__input",
            showFilled && "t-secretfield__input--filled",
            hasError && "t-textfield__input--error",
          )}
          onChange={(e) => {
            if (!showFilled) onChange(e.target.value);
          }}
        />
        {hasMasked && !disabled ? (
          <button type="button" className="t-secretfield__action" onClick={showFilled ? startEdit : cancelEdit}>
            {showFilled ? "Edit" : "Cancel"}
          </button>
        ) : null}
      </div>

      <FieldMessage block="t-textfield" id={helpId} error={error} helpText={helpText} />
    </div>
  );
}
