"use client";

import { useState } from "react";
import { CheckInboxIcon } from "@/components/ui/icons";
import { useDesk } from "@/components/shell/DeskProvider";
import { Card } from "@/components/ui/Page";
import { Button, Skeleton, StatusDot } from "@/components/ui/primitives";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { useToast } from "@/components/ui/Toaster";
import { errorText, requestJson } from "@/lib/request-json";
import styles from "./settings.module.css";

/** Turns the live Gmail trigger on or off, and explains how the inbox is being watched. */
export function InboxWatchSettings() {
  const { inbox, checking, checkInbox, refreshInbox } = useDesk();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function setWatching(on: boolean) {
    setBusy(true);
    try {
      await requestJson("/api/inbox/watch", { method: on ? "POST" : "DELETE" });
      toast({
        kind: "success",
        title: on ? "Live watching is on" : "Live watching is off",
        text: on ? "Gmail will notify the app about new mail within a minute." : "The app will check the inbox itself while it's open.",
      });
      await refreshInbox();
    } catch (error) {
      toast({ kind: "error", title: on ? "Couldn't turn on live watching" : "Couldn't turn off live watching", text: errorText(error, "") });
    } finally {
      setBusy(false);
    }
  }

  if (!inbox) {
    return (
      <Card>
        <Skeleton width={160} height={14} />
        <Skeleton width="80%" height={12} style={{ marginTop: 10 }} />
      </Card>
    );
  }

  const { watch } = inbox;

  return (
    <Card>
      <div className={styles.watch}>
        <div className={styles.watchMain}>
          <div className={styles.rowTitle}>
            <StatusDot tone={!watch.gmail.connected ? "amber" : watch.watching ? "green" : "blue"} pulse={watch.gmail.connected} />
            <span className={styles.rowName}>
              {!watch.gmail.connected ? "Not watching" : watch.watching ? "Live Gmail trigger" : "Checking every 2 minutes"}
            </span>
          </div>
          <p className={styles.rowScope}>
            {!watch.gmail.connected
              ? "Connect Gmail below so the app can read the CS inbox."
              : watch.watching
                ? `Gmail tells the app about each new message in ${watch.gmail.account ?? "the inbox"}, even when nobody has it open.`
                : watch.canWatch
                  ? "The app checks the inbox every 2 minutes while it's open. Turn on live watching so new mail is picked up even when it's closed."
                  : "The app checks the inbox every 2 minutes while it's open. Live watching needs a public address: set PUBLIC_APP_URL in .env once the app is hosted."}
          </p>
          {watch.lastCheckedAt ? (
            <p className={styles.rowIdentity}>
              Last checked <TimeAgo iso={watch.lastCheckedAt} />
            </p>
          ) : null}
        </div>
        <div className={styles.rowActions}>
          {watch.gmail.connected ? (
            <Button size="sm" icon={<CheckInboxIcon />} loading={checking} onClick={() => void checkInbox()}>
              Check now
            </Button>
          ) : null}
          {watch.gmail.connected && watch.watching ? (
            <Button size="sm" variant="ghost" loading={busy} onClick={() => void setWatching(false)}>
              Turn off
            </Button>
          ) : null}
          {watch.gmail.connected && !watch.watching && watch.canWatch ? (
            <Button size="sm" variant="primary" loading={busy} onClick={() => void setWatching(true)}>
              Turn on live watching
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
