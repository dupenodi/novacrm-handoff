import type { HTMLAttributes, ReactNode } from "react";
import { Label } from "../theme/Label";
import { cx } from "../theme/utils";

export type DiffLine = {
  sign: "+" | "-" | " ";
  text: ReactNode;
};

export type SentenceDiffProps = {
  title?: ReactNode;
  meta?: ReactNode;
  lines: DiffLine[];
  footer?: ReactNode;
} & HTMLAttributes<HTMLElement>;

/** Tinted sentence rows — not a code diff. */
export function SentenceDiff({
  title,
  meta,
  lines,
  footer,
  className,
  ...rest
}: SentenceDiffProps) {
  return (
    <section className={cx("d-diff", className)} {...rest}>
      {(title || meta) && (
        <header className="d-diff__head">
          {title ? <Label>{title}</Label> : null}
          {meta ? <span className="d-diff__meta">{meta}</span> : null}
        </header>
      )}
      <div className="d-diff__body">
        {lines.map((line, i) => (
          <div
            key={i}
            className={cx(
              "d-diff__row",
              line.sign === "+" && "d-diff__row--add",
              line.sign === "-" && "d-diff__row--del",
            )}
          >
            <span className="d-diff__sign" aria-hidden>
              {line.sign}
            </span>
            <span className="d-diff__text">{line.text}</span>
          </div>
        ))}
      </div>
      {footer ? <footer className="d-diff__foot">{footer}</footer> : null}
    </section>
  );
}
