"use client";

import {
  type FormEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  useState,
} from "react";
import { Chip } from "./Chip";
import { cx } from "./utils";

export type TokenFieldProps = {
  tokens: string[];
  onAdd: (token: string) => void;
  onRemove: (token: string) => void;
  placeholder?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "onChange">;

/** Chip token input — type Enter to add, × to remove. */
export function TokenField({
  tokens,
  onAdd,
  onRemove,
  placeholder = "Add…",
  className,
  ...rest
}: TokenFieldProps) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const next = draft.trim();
    if (!next) return;
    onAdd(next);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && tokens.length) {
      onRemove(tokens[tokens.length - 1]!);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    commit();
  };

  return (
    <div className={cx("t-tokenfield", className)} {...rest}>
      {tokens.map((t) => (
        <Chip key={t} tone="removable" size="sm" onRemove={() => onRemove(t)}>
          {t}
        </Chip>
      ))}
      <form className="t-tokenfield__form" onSubmit={onSubmit}>
        <input
          className="t-tokenfield__input"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label={placeholder}
        />
      </form>
    </div>
  );
}
