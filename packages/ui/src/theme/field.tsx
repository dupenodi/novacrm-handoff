import type { ReactNode } from "react";

/** Label and help/error message shared by the form controls. */

export function FieldLabel({ id, label, hidden }: { id: string; label?: ReactNode; hidden: boolean }) {
  if (!label) return null;
  return (
    <label htmlFor={id} className={hidden ? "t-visually-hidden" : "t-label"}>
      {label}
    </label>
  );
}

/**
 * Error text wins over help text; a boolean error only styles the control.
 * `block` is the control's class prefix, e.g. "t-textfield" → "t-textfield__error".
 */
export function FieldMessage({
  block,
  id,
  error,
  helpText,
}: {
  block: string;
  id?: string;
  error?: ReactNode | boolean;
  helpText?: ReactNode;
}) {
  if (error && typeof error !== "boolean") {
    return (
      <p id={id} className={`${block}__error`} role="alert">
        {error}
      </p>
    );
  }
  if (helpText) {
    return (
      <p id={id} className={`${block}__help`}>
        {helpText}
      </p>
    );
  }
  return null;
}
