import type { HTMLAttributes, ReactNode } from "react";
import { Button } from "./Button";
import { cx } from "./utils";

export type EmptyStateProps = {
  title: ReactNode;
  body?: ReactNode;
  action?: { label: string; onClick: () => void };
  /** Standalone card chrome. Off by default so it nests cleanly. */
  framed?: boolean;
} & HTMLAttributes<HTMLDivElement>;

export function EmptyState({
  title,
  body,
  action,
  framed = false,
  className,
  ...rest
}: EmptyStateProps) {
  return (
    <div
      className={cx("t-empty", framed && "t-empty--framed", className)}
      {...rest}
    >
      <h3 className="t-empty__title">{title}</h3>
      {body ? <p className="t-empty__body">{body}</p> : null}
      {action ? (
        <Button variant="secondary" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
