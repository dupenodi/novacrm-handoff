"use client";

import { useEffect, useState } from "react";
import { formatDateTime, formatRelative } from "@/lib/format";

/** "2m ago" that keeps itself current. The exact time is in the tooltip. */
export function TimeAgo({ iso, className }: { iso: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <time dateTime={iso} title={formatDateTime(iso)} className={className} suppressHydrationWarning>
      {formatRelative(iso, now)}
    </time>
  );
}

/** A running m:ss timer from `iso`, for things in progress like a phone call. */
export function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const seconds = Math.max(0, Math.floor((now - Date.parse(since)) / 1000));
  return (
    <span suppressHydrationWarning style={{ fontVariantNumeric: "tabular-nums" }}>
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
    </span>
  );
}
