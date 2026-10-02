"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { Kbd } from "../theme/Kbd";
import { TextField } from "../theme/TextField";
import { cx } from "../theme/utils";

export type CommandItem = {
  key: string;
  label: ReactNode;
  group?: ReactNode;
  id?: string;
};

export type CommandPaletteProps = {
  query: string;
  onQueryChange: (q: string) => void;
  items: CommandItem[];
  onSelect?: (item: CommandItem) => void;
  placeholder?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "onSelect">;

export function CommandPalette({
  query,
  onQueryChange,
  items,
  onSelect,
  placeholder = "Search…",
  className,
  ...rest
}: CommandPaletteProps) {
  return (
    <div className={cx("d-cmd", className)} {...rest}>
      <div className="d-cmd__query">
        <TextField
          value={query}
          onChange={onQueryChange}
          placeholder={placeholder}
          aria-label={placeholder}
          label={placeholder}
          labelHidden
        />
      </div>
      <ul className="d-cmd__list" role="listbox">
        {items.map((item) => (
          <li key={item.id ?? `${item.key}-${String(item.label)}`}>
            <button
              type="button"
              className="d-cmd__row"
              role="option"
              onClick={() => onSelect?.(item)}
            >
              <Kbd>{item.key}</Kbd>
              <span className="d-cmd__label">{item.label}</span>
              {item.group ? (
                <span className="d-cmd__group">{item.group}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
