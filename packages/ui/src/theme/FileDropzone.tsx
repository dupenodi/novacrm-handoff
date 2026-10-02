"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type FileDropzoneProps = {
  title: ReactNode;
  hint?: ReactNode;
  onFiles?: (files: FileList) => void;
} & Omit<HTMLAttributes<HTMLLabelElement>, "onChange" | "title">;

export function FileDropzone({
  title,
  hint,
  onFiles,
  className,
  ...rest
}: FileDropzoneProps) {
  return (
    <label className={cx("t-dropzone", className)} {...rest}>
      <input
        type="file"
        className="t-visually-hidden"
        multiple
        onChange={(e) => {
          if (e.target.files?.length) onFiles?.(e.target.files);
        }}
      />
      <span className="t-dropzone__title">{title}</span>
      {hint ? <span className="t-dropzone__hint">{hint}</span> : null}
    </label>
  );
}
