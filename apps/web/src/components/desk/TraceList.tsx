import type { ToolTrace } from "@/lib/clients";

const PREVIEW_CHARS = 280;

const VERB: Record<string, string> = { running: "Using", failed: "Failed", done: "Used" };

function preview(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.slice(0, PREVIEW_CHARS);
  try {
    return JSON.stringify(value).slice(0, PREVIEW_CHARS);
  } catch {
    return "";
  }
}

function ToolRow({ row }: { row: ToolTrace }) {
  const stateClass = row.status === "failed" || row.status === "running" ? ` is-${row.status}` : "";
  const detail = row.error ?? preview(row.output);
  return (
    <div className={`trace__row${stateClass}`}>
      <div className="trace__at">{row.createdAt.slice(11, 19)}</div>
      <div>
        <div className="trace__title">
          {VERB[row.status] ?? "Used"} {row.tool}
        </div>
        <code className="trace__tool">{row.tool}</code>
        {detail ? <div className="trace__out">{detail}</div> : null}
      </div>
    </div>
  );
}

export function TraceList({ rows, text }: { rows: ToolTrace[]; text?: string }) {
  return (
    <div className="trace">
      {rows.length === 0 && !text ? <p className="trace__text">Waiting for the agent.</p> : null}
      {rows.map((row) => (
        <ToolRow key={row.id} row={row} />
      ))}
      {text ? <p className="trace__text">{text}</p> : null}
    </div>
  );
}
