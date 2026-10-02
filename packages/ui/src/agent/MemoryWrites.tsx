import { Button } from "../theme";
import { cx } from "../theme/utils";

export type MemoryFact = {
  id: string;
  text: string;
  source: string;
};

export type MemoryWritesProps = {
  facts: MemoryFact[];
  onForget?: (id: string) => void;
  footer?: string;
  className?: string;
};

export function MemoryWrites({
  facts,
  onForget,
  footer = "Anything I inferred rather than read stays labelled a guess until you confirm it.",
  className,
}: MemoryWritesProps) {
  return (
    <div className={cx("a-memory", className)}>
      <div className="a-memory__head">
        <span className="a-memory__eyebrow">written to memory</span>
        <span className="a-memory__meta">
          {facts.length} fact{facts.length === 1 ? "" : "s"} · reversible
        </span>
      </div>
      {facts.map((f) => (
        <div key={f.id} className="a-memory__row">
          <div>
            <div className="a-memory__fact">{f.text}</div>
            <div className="a-memory__src">{f.source}</div>
          </div>
          {onForget ? (
            <Button
              variant="secondary"
              onClick={() => onForget(f.id)}
              style={{ height: 25, padding: "0 9px" }}
            >
              Forget
            </Button>
          ) : null}
        </div>
      ))}
      {footer ? <div className="a-memory__foot">{footer}</div> : null}
    </div>
  );
}
