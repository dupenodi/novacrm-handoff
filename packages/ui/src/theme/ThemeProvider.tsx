"use client";

import type { ReactNode } from "react";
import { cx } from "./utils";
import "./tokens.css";
import "./components.css";

export type ThemeName = "signal" | "pressure" | "geist";

export type ThemeProviderProps = {
  theme: ThemeName;
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "main";
};

export function ThemeProvider({
  theme,
  children,
  className,
  as: Tag = "div",
}: ThemeProviderProps) {
  return (
    <Tag data-theme={theme} className={cx("t-root", className)}>
      {children}
    </Tag>
  );
}
