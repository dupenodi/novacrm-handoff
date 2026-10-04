"use client";

import { useState } from "react";
import { ExternalIcon, RetryIcon } from "@/components/ui/icons";
import { useDesk } from "@/components/shell/DeskProvider";
import { Badge, Button, ButtonLink, StatusDot } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toaster";
import { DEAL_STATUS, isLive } from "@/lib/deal-status";
import { errorText, requestJson } from "@/lib/request-json";
import type { DealView } from "@/lib/types";
import { usePolling } from "@/lib/use-polling";
import { DealDetails } from "./DealDetails";
import { Progress } from "./Progress";
import { Thread } from "./Thread";
import styles from "./deal.module.css";

export function DealScreen({ initial }: { initial: DealView }) {
  const toast = useToast();
  const { refreshDeals } = useDesk();
  const [retrying, setRetrying] = useState(false);
  const { data, error, refresh } = usePolling<DealView>(
    `/api/deals/${initial.deal.id}`,
    (view) => (view && isLive(view.deal.status) ? 1500 : 10_000),
    initial,
  );
  const view = data ?? initial;
  const { deal } = view;
  const status = DEAL_STATUS[deal.status];

  async function retry() {
    setRetrying(true);
    try {
      await requestJson(`/api/deals/${deal.id}/retry`, { method: "POST" });
      toast({ kind: "info", title: "Picking up where it stopped", text: "The agents are running again." });
      await Promise.all([refresh(), refreshDeals()]);
    } catch (err) {
      toast({ kind: "error", title: "Couldn't retry", text: errorText(err, "Try again.") });
    } finally {
      setRetrying(false);
    }
  }

  const retryButton =
    deal.status === "attention" ? (
      <Button variant="primary" icon={<RetryIcon />} loading={retrying} onClick={() => void retry()}>
        Retry
      </Button>
    ) : null;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{deal.customerName ?? view.email?.subject ?? "New deal"}</h1>
            {deal.planName ? <Badge tone="accent">{deal.planName}</Badge> : null}
          </div>
          <div className={styles.statusLine}>
            <StatusDot tone={status.tone} pulse={status.live} />
            <span>{status.label}</span>
            {error ? <span className={styles.staleNote}>· Reconnecting…</span> : null}
          </div>
        </div>
        <div className={styles.headerActions}>
          {view.rocketlaneUrl ? (
            <ButtonLink href={view.rocketlaneUrl} external icon={<ExternalIcon />}>
              Rocketlane
            </ButtonLink>
          ) : null}
          {retryButton}
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.content}>
          <Progress view={view} />
          <Thread view={view} onRetry={() => void retry()} retrying={retrying} />
        </div>
        <aside className={styles.rail} aria-label="Deal details">
          <DealDetails view={view} />
        </aside>
      </div>
    </div>
  );
}
