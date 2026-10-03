"use client";

import type { ReactNode } from "react";
import { Chip } from "./Chip";
import { Label } from "./Label";
import { cx } from "./utils";

export type DataTableStageTone = "accent" | "guess" | "stale";

export type DataTableRow = {
  id: string;
  company: string;
  role: string;
  stage: string;
  stageTone?: DataTableStageTone;
  lastTouch: string;
};

export type DataTableProps = {
  title?: ReactNode;
  note?: ReactNode;
  rows: DataTableRow[];
  selectedId?: string | null;
  onSelectRow?: (id: string) => void;
  sortLabel?: string;
  sortGlyph?: string;
  onSort?: () => void;
  showSkeleton?: boolean;
  emptyTitle?: ReactNode;
  emptyBody?: ReactNode;
  page?: number;
  pageCount?: number;
  pageNote?: ReactNode;
  onPageChange?: (page: number) => void;
};

/** Loading placeholder bars; undefined means full width. */
const SKELETON_WIDTHS = [undefined, undefined, "72%", "60%", "50%"];

export function DataTable({
  title,
  note,
  rows,
  selectedId,
  onSelectRow,
  sortLabel = "Company",
  sortGlyph = "▲",
  onSort,
  showSkeleton = true,
  emptyTitle,
  emptyBody,
  page = 1,
  pageCount = 3,
  pageNote,
  onPageChange,
}: DataTableProps) {
  const pages = Array.from({ length: Math.min(pageCount, 3) }, (_, i) => i + 1);

  return (
    <div className="t-table">
      {(title || note) && (
        <div className="t-table__toolbar">
          {title ? <Label>{title}</Label> : null}
          {note ? <span className="t-table__note">{note}</span> : null}
        </div>
      )}

      <div className="t-table__head">
        <span />
        <button type="button" className="t-table__sort" onClick={onSort}>
          {sortLabel} {sortGlyph}
        </button>
        <span className="t-table__col">Role</span>
        <span className="t-table__col">Stage</span>
        <span className="t-table__col">Last touch</span>
      </div>

      {rows.map((row) => {
        const selected = row.id === selectedId;
        return (
          <div
            key={row.id}
            role="button"
            tabIndex={0}
            className={cx("t-table__row", selected && "t-table__row--selected")}
            onClick={() => onSelectRow?.(row.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectRow?.(row.id);
              }
            }}
          >
            <span className="t-table__check" aria-hidden>
              {selected ? "✓" : ""}
            </span>
            <span className="t-table__co">{row.company}</span>
            <span className="t-table__role">{row.role}</span>
            <Chip tone={row.stageTone ?? "stale"}>{row.stage}</Chip>
            <span className="t-table__touch">{row.lastTouch}</span>
          </div>
        );
      })}

      {showSkeleton ? (
        <div className="t-table__skel" aria-hidden>
          {SKELETON_WIDTHS.map((width, i) => (
            <span key={i} className="t-table__skel-bar" style={width ? { width } : undefined} />
          ))}
        </div>
      ) : null}

      {emptyTitle || emptyBody ? (
        <div className="t-table__empty">
          {emptyTitle ? (
            <h4 className="t-table__empty-title">{emptyTitle}</h4>
          ) : null}
          {emptyBody ? <p className="t-table__empty-body">{emptyBody}</p> : null}
        </div>
      ) : null}

      <div className="t-table__pager">
        <button type="button" className="t-table__page" disabled aria-label="Previous">
          ←
        </button>
        {pages.map((n) => (
          <button
            key={n}
            type="button"
            className={cx("t-table__page", n === page && "t-table__page--active")}
            onClick={() => onPageChange?.(n)}
          >
            {n}
          </button>
        ))}
        <span className="t-table__ellipsis">…</span>
        <button
          type="button"
          className="t-table__page"
          onClick={() => onPageChange?.(Math.min(page + 1, pageCount))}
          aria-label="Next"
        >
          →
        </button>
        {pageNote ? <span className="t-table__note">{pageNote}</span> : null}
      </div>
    </div>
  );
}
