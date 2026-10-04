"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorText, requestJson } from "./request-json";

/**
 * Fetches `url` now and then every `interval(data)` ms while the tab is visible.
 * Requests never overlap, and a failed refresh keeps the last good data.
 */
export function usePolling<T>(
  url: string | null,
  interval: (data: T | null) => number,
  initial: T | null = null,
): { data: T | null; error: string | null; refresh: () => Promise<void> } {
  const [data, setData] = useState<T | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const intervalRef = useRef(interval);
  intervalRef.current = interval;
  const dataRef = useRef(data);
  dataRef.current = data;

  const load = useCallback(async () => {
    if (!url || inFlight.current) return;
    inFlight.current = true;
    try {
      const next = await requestJson<T>(url, { cache: "no-store" });
      setData(next);
      dataRef.current = next;
      setError(null);
    } catch (err) {
      setError(errorText(err, "Couldn't refresh"));
    } finally {
      inFlight.current = false;
    }
  }, [url]);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    const schedule = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(tick, intervalRef.current(dataRef.current));
    };
    const tick = async () => {
      if (cancelled) return;
      if (document.visibilityState === "visible") await load();
      if (!cancelled) schedule();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };

    if (initial === null) void load();
    schedule();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // `initial` only seeds the first render.
  }, [url, load]);

  return { data, error, refresh: load };
}
