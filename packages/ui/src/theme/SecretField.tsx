"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
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

  useEffect(() => {
    if (hasMasked) setEditing(false);
    else setEditing(true);
  }, [masked, hasMasked]);

  useEffect(() => {
    if (editing && hasMasked) {
      inputRef.current?.focus();
    }
  }, [editing, hasMasked]);

  const showFilled = hasMasked && !editing;
  const hasDraft = value.length > 0;
  /** Dots only when there is something to hide. */
  const usePassword = showFilled || hasDraft;

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
      {label ? (
        <label
          htmlFor={id}
          className={labelHidden ? "t-visually-hidden" : "t-label"}
        >
          {label}
        </label>
      ) : null}

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
          showFilled ? (
            <button
              type="button"
              className="t-secretfield__action"
              onClick={startEdit}
            >
              Edit
            </button>
          ) : (
            <button
              type="button"
              className="t-secretfield__action"
              onClick={cancelEdit}
            >
              Cancel
            </button>
          )
        ) : null}
      </div>

      {error && typeof error !== "boolean" ? (
        <p id={helpId} className="t-textfield__error" role="alert">
          {error}
        </p>
      ) : helpText ? (
        <p id={helpId} className="t-textfield__help">
          {helpText}
        </p>
      ) : null}
    </div>
  );
}
