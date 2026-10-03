"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@novacrm/ui";
import type { Client } from "@/lib/clients";
import { errorText, requestJson } from "@/lib/request-json";
import { Kanban } from "./Kanban";

const REFRESH_MS = 8000;

export function Board() {
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    const body = await requestJson<{ clients?: Client[] }>("/api/clients", { cache: "no-store" });
    setClients(body.clients ?? []);
  }, []);

  useEffect(() => {
    load().catch((err: unknown) => setError(errorText(err, "Failed to load")));
    // Background refreshes stay quiet; the first load reports errors.
    const timer = window.setInterval(() => load().catch(() => undefined), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  async function checkMail() {
    setChecking(true);
    setError(null);
    try {
      await requestJson("/api/mail/poll", { method: "POST" });
      await load();
    } catch (err) {
      setError(errorText(err, "Poll failed"));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="desk">
      <div className="desk__head">
        <div>
          <h1>Clients</h1>
          <p>Received · project · comms. One state each.</p>
        </div>
        <Button variant="secondary" disabled={checking} onClick={() => void checkMail()}>
          {checking ? "Checking…" : "Check mail"}
        </Button>
      </div>
      {error ? <p className="g-err">{error}</p> : null}
      <Kanban clients={clients} />
    </div>
  );
}
