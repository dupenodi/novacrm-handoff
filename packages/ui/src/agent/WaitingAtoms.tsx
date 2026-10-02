import { cx } from "../theme/utils";

export function StreamingCursor({ className }: { className?: string }) {
  return <span className={cx("a-cursor", className)} aria-hidden />;
}

export function WaitingDots({
  className,
  label = "Reading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span className={cx("a-dots", className)} role="status" aria-label={label}>
      <span className="a-dots__sq" />
      <span className="a-dots__sq" />
      <span className="a-dots__sq" />
    </span>
  );
}
