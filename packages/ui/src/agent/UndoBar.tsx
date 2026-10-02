import { cx } from "../theme/utils";

export type UndoBarProps = {
  message: string;
  secondsLeft?: number;
  undoLabel?: string;
  onUndo?: () => void;
  className?: string;
};

export function UndoBar({
  message,
  secondsLeft,
  undoLabel,
  onUndo,
  className,
}: UndoBarProps) {
  const label =
    undoLabel ??
    (secondsLeft !== undefined ? `Undo · ${secondsLeft}s` : "Undo");

  return (
    <div className={cx("a-undo", className)} role="status">
      <span className="a-undo__text">{message}</span>
      {onUndo ? (
        <button type="button" className="a-undo__btn" onClick={onUndo}>
          {label}
        </button>
      ) : null}
    </div>
  );
}
