"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/Toaster";
import { isLive } from "@/lib/deal-status";
import { errorText, requestJson } from "@/lib/request-json";
import type { DealSummary, Email, InboxCheckResult, InboxWatch } from "@/lib/types";
import { usePolling } from "@/lib/use-polling";

export type InboxState = { watch: InboxWatch; recent: Email[] };

type Desk = {
  deals: DealSummary[] | null;
  dealsError: string | null;
  inbox: InboxState | null;
  inboxError: string | null;
  checking: boolean;
  /** Checks Gmail for new deal emails now. */
  checkInbox(): Promise<void>;
  refreshDeals(): Promise<void>;
  refreshInbox(): Promise<void>;
};

const DeskContext = createContext<Desk | null>(null);

/** Without a live Gmail trigger, the open app checks the inbox this often. */
const AUTO_CHECK_MS = 120_000;

export function DeskProvider({ initialDeals, children }: { initialDeals: DealSummary[] | null; children: ReactNode }) {
  const toast = useToast();
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);

  const dealsPoll = usePolling<{ deals: DealSummary[] }>(
    "/api/deals",
    (data) => (data?.deals.some((deal) => isLive(deal.status)) ? 2500 : 8000),
    initialDeals ? { deals: initialDeals } : null,
  );
  const inboxPoll = usePolling<InboxState>("/api/inbox", () => 20_000);
  const { refresh: refreshDeals } = dealsPoll;
  const { refresh: refreshInbox } = inboxPoll;

  const runCheck = useCallback(
    async (quiet: boolean) => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      setChecking(true);
      try {
        const result = await requestJson<InboxCheckResult>("/api/inbox/check", { method: "POST" });
        if (result.newDeals.length > 0) {
          const names = result.newDeals.map((deal) => deal.customerName ?? "a new customer").join(", ");
          toast({
            kind: "success",
            title: result.newDeals.length === 1 ? "New deal handoff" : `${result.newDeals.length} new deal handoffs`,
            text: `Starting onboarding for ${names}.`,
          });
        } else if (!quiet) {
          toast({
            kind: "info",
            title: "No new deals",
            text:
              result.checked === 0
                ? "There's no recent mail in the inbox."
                : `Looked at ${result.checked} recent ${result.checked === 1 ? "email" : "emails"}. None were new deal handoffs.`,
          });
        }
        await Promise.all([refreshDeals(), refreshInbox()]);
      } catch (error) {
        if (!quiet) toast({ kind: "error", title: "Couldn't check the inbox", text: errorText(error, "Try again.") });
      } finally {
        checkingRef.current = false;
        setChecking(false);
      }
    },
    [refreshDeals, refreshInbox, toast],
  );

  // With no live trigger, keep checking while the app is open, starting with a check if the last one is stale.
  const watch = inboxPoll.data?.watch;
  const autoCheck = Boolean(watch?.gmail.connected && !watch.watching);
  const lastCheckedAt = watch?.lastCheckedAt ?? null;
  useEffect(() => {
    if (!autoCheck) return;
    const stale = !lastCheckedAt || Date.now() - Date.parse(lastCheckedAt) > AUTO_CHECK_MS;
    if (stale) void runCheck(true);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void runCheck(true);
    }, AUTO_CHECK_MS);
    return () => window.clearInterval(timer);
    // Re-arm only when auto-checking turns on or off, not on every check.
  }, [autoCheck, runCheck]);

  const value = useMemo<Desk>(
    () => ({
      deals: dealsPoll.data?.deals ?? null,
      dealsError: dealsPoll.error,
      inbox: inboxPoll.data,
      inboxError: inboxPoll.error,
      checking,
      checkInbox: () => runCheck(false),
      refreshDeals,
      refreshInbox,
    }),
    [dealsPoll.data, dealsPoll.error, inboxPoll.data, inboxPoll.error, checking, runCheck, refreshDeals, refreshInbox],
  );

  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>;
}

export function useDesk(): Desk {
  const desk = useContext(DeskContext);
  if (!desk) throw new Error("useDesk must be used inside DeskProvider");
  return desk;
}
