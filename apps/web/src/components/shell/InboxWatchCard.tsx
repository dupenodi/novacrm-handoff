"use client";

import Link from "next/link";
import { CheckInboxIcon } from "@/components/ui/icons";
import { Button, Skeleton, StatusDot } from "@/components/ui/primitives";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { useDesk } from "./DeskProvider";
import styles from "./shell.module.css";

/** Shows whether the CS inbox is being watched, and lets you check it now. */
export function InboxWatchCard() {
  const { inbox, inboxError, checking, checkInbox, refreshInbox } = useDesk();

  if (!inbox) {
    return (
      <div className={styles.watch}>
        {inboxError ? (
          <>
            <div className={styles.watchHead}>
              <StatusDot tone="red" />
              <span className={styles.watchTitle}>Inbox unavailable</span>
            </div>
            <p className={styles.watchMeta}>{inboxError}</p>
            <Button size="sm" onClick={() => void refreshInbox()} className={styles.watchAction}>
              Try again
            </Button>
          </>
        ) : (
          <>
            <Skeleton width={120} height={14} />
            <Skeleton width={180} height={12} style={{ marginTop: 8 }} />
          </>
        )}
      </div>
    );
  }

  const { watch } = inbox;

  if (!watch.gmail.connected) {
    return (
      <div className={styles.watch}>
        <div className={styles.watchHead}>
          <StatusDot tone="amber" />
          <span className={styles.watchTitle}>Gmail isn&apos;t connected</span>
        </div>
        <p className={styles.watchMeta}>Connect the CS inbox so new deal emails are picked up.</p>
        <Link href="/settings" className={styles.watchLink}>
          Connect Gmail
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.watch}>
      <div className={styles.watchHead}>
        <StatusDot tone={watch.watching ? "green" : "blue"} pulse />
        <span className={styles.watchTitle}>Watching the inbox</span>
        <Button
          variant="ghost"
          size="sm"
          icon={<CheckInboxIcon className={checking ? styles.spinning : undefined} />}
          label={checking ? "Checking…" : "Check now"}
          disabled={checking}
          onClick={() => void checkInbox()}
          className={styles.watchRefresh}
        />
      </div>
      {watch.gmail.account ? <p className={styles.watchAccount}>{watch.gmail.account}</p> : null}
      <p className={styles.watchMeta}>
        {checking ? (
          "Checking for new mail…"
        ) : (
          <>
            {watch.watching ? "Live Gmail trigger" : "Checks every 2 minutes"}
            {watch.lastCheckedAt ? (
              <>
                {" · "}
                <TimeAgo iso={watch.lastCheckedAt} />
              </>
            ) : null}
          </>
        )}
      </p>
    </div>
  );
}
