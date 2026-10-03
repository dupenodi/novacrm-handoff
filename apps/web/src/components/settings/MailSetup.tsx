"use client";

import { useState } from "react";
import { Button } from "@novacrm/ui";
import { errorText, requestJson } from "@/lib/request-json";

/** Subscribes the connected Gmail inbox to Composio's new-message webhook. */
export function MailSetup() {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function enableTrigger() {
    setBusy(true);
    setNote(null);
    try {
      const { webhookUrl } = await requestJson<{ webhookUrl: string }>("/api/mail/setup", { method: "POST" });
      setNote(`Trigger → ${webhookUrl}`);
    } catch (err) {
      setNote(errorText(err, "Setup failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button variant="secondary" disabled={busy} onClick={() => void enableTrigger()}>
        {busy ? "Enabling…" : "Enable Gmail trigger"}
      </Button>
      {note ? <p className="desk__head p" style={{ marginTop: 8 }}>{note}</p> : null}
    </div>
  );
}
