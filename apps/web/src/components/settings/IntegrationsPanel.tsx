"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AttentionIcon, ErrorIcon } from "@/components/ui/icons";
import { Card } from "@/components/ui/Page";
import { Badge, Button, Skeleton, cx } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toaster";
import {
  GROUP_LABEL,
  GROUP_ORDER,
  INTEGRATIONS,
  integrationLogoUrl,
  type IntegrationGroup,
  type IntegrationsStatus,
} from "@/lib/integrations";
import { errorText, requestJson } from "@/lib/request-json";
import { friendlyError, integrationName, toRowState, type IntegrationRowState } from "./integration-rows";
import styles from "./settings.module.css";

const GROUP_HINT: Record<IntegrationGroup, string> = {
  core: "Needed to read deal emails and create onboarding projects.",
  communication: "Optional. Without Slack, channels and welcome messages are simulated and marked as such.",
  voice: "Server-side API keys for calling AEs and running the agents. Set them in .env.",
};

/** How long "Confirm" stays armed after the first Disconnect click. */
const CONFIRM_MS = 4000;

type Busy = { action: "connect" | "disconnect"; id: string } | null;

export function IntegrationsPanel() {
  const toast = useToast();
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const confirmTimer = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const next = await requestJson<IntegrationsStatus>("/api/integrations", { cache: "no-store" });
      setStatus(next);
      setLoadError(next.composio.error ? friendlyError(next.composio.error) : null);
    } catch (error) {
      setLoadError(friendlyError(errorText(error, "")));
    }
  }, []);

  // First load, plus the result Composio's connect flow sent back in the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");
    if (connected) toast({ kind: "success", title: `${integrationName(connected)} is connected` });
    if (error) toast({ kind: "error", title: "The connection didn't finish", text: friendlyError(error) });
    if (connected || error) window.history.replaceState({}, "", "/settings");
    void load();
  }, [load, toast]);

  useEffect(() => () => window.clearTimeout(confirmTimer.current), []);

  const configured = Boolean(status?.composio.configured);
  const rows = INTEGRATIONS.map((def) => toRowState(def, status));

  async function connect(row: IntegrationRowState) {
    if (busy) return;
    setBusy({ action: "connect", id: row.def.id });
    try {
      const { redirectUrl } = await requestJson<{ redirectUrl: string }>("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolkit: row.def.toolkit }),
      });
      window.location.href = redirectUrl;
    } catch (error) {
      toast({ kind: "error", title: `Couldn't connect ${row.def.name}`, text: friendlyError(errorText(error, "")) });
      setBusy(null);
    }
  }

  async function disconnect(row: IntegrationRowState) {
    if (busy || !row.connection) return;
    setBusy({ action: "disconnect", id: row.def.id });
    setConfirmId(null);
    try {
      await requestJson(`/api/integrations/accounts/${encodeURIComponent(row.connection.accountId)}`, { method: "DELETE" });
      toast({ kind: "success", title: `${row.def.name} is disconnected` });
      await load();
    } catch (error) {
      toast({ kind: "error", title: `Couldn't disconnect ${row.def.name}`, text: friendlyError(errorText(error, "")) });
    } finally {
      setBusy(null);
    }
  }

  /** The first click arms "Confirm"; a second click within CONFIRM_MS disconnects. */
  function disconnectWithConfirm(row: IntegrationRowState) {
    if (confirmId === row.def.id) {
      void disconnect(row);
      return;
    }
    setConfirmId(row.def.id);
    window.clearTimeout(confirmTimer.current);
    confirmTimer.current = window.setTimeout(() => setConfirmId(null), CONFIRM_MS);
  }

  return (
    <div className={styles.groups}>
      {loadError ? (
        <div className={cx(styles.banner, styles.bannerError)} role="alert">
          <ErrorIcon aria-hidden />
          <div>
            <p className={styles.bannerTitle}>Couldn&apos;t load integrations</p>
            <p className={styles.bannerText}>{loadError}</p>
          </div>
          <Button size="sm" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : null}

      {status && !configured ? (
        <div className={styles.banner} role="status">
          <AttentionIcon aria-hidden />
          <div>
            <p className={styles.bannerTitle}>Composio isn&apos;t set up</p>
            <p className={styles.bannerText}>Gmail, Rocketlane and Slack connect through Composio. Add COMPOSIO_API_KEY to .env.</p>
          </div>
        </div>
      ) : null}

      {GROUP_ORDER.map((group) => (
        <section key={group} className={styles.group}>
          <div className={styles.groupHead}>
            <h3 className={styles.groupTitle}>{GROUP_LABEL[group]}</h3>
            <p className={styles.groupHint}>{GROUP_HINT[group]}</p>
          </div>
          <Card flush>
            <ul className={styles.rows}>
              {rows
                .filter((row) => row.def.group === group)
                .map((row) =>
                  status === null && !loadError ? (
                    <RowSkeleton key={row.def.id} />
                  ) : (
                    <IntegrationRow
                      key={row.def.id}
                      row={row}
                      busy={busy?.id === row.def.id ? busy.action : null}
                      disabled={busy !== null || (row.def.method === "composio" && !configured)}
                      confirming={confirmId === row.def.id}
                      onConnect={() => void connect(row)}
                      onDisconnect={() => disconnectWithConfirm(row)}
                    />
                  ),
                )}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  );
}

function IntegrationRow({
  row,
  busy,
  disabled,
  confirming,
  onConnect,
  onDisconnect,
}: {
  row: IntegrationRowState;
  busy: "connect" | "disconnect" | null;
  disabled: boolean;
  confirming: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const viaComposio = row.def.method === "composio";
  return (
    <li className={styles.row}>
      <span className={styles.logo}>
        <img src={integrationLogoUrl(row.def.toolkit)} alt="" width={20} height={20} />
      </span>
      <div className={styles.rowMain}>
        <div className={styles.rowTitle}>
          <span className={styles.rowName}>{row.def.name}</span>
          {row.connected ? (
            <Badge tone="green">{viaComposio ? "Connected" : "Configured"}</Badge>
          ) : row.connection ? (
            <Badge tone="amber">Needs attention</Badge>
          ) : (
            <Badge>{viaComposio ? "Not connected" : "Not set"}</Badge>
          )}
        </div>
        <p className={styles.rowScope}>{row.def.scope}</p>
        {row.identity ? <p className={styles.rowIdentity}>{row.identity}</p> : null}
        {row.attention ? <p className={styles.rowAttention}>{row.attention}</p> : null}
      </div>
      <div className={styles.rowActions}>
        {viaComposio ? (
          row.connected ? (
            <Button
              variant={confirming ? "danger" : "ghost"}
              size="sm"
              loading={busy === "disconnect"}
              disabled={disabled && busy !== "disconnect"}
              onClick={onDisconnect}
            >
              {confirming ? "Confirm disconnect" : "Disconnect"}
            </Button>
          ) : (
            <Button variant="primary" size="sm" loading={busy === "connect"} disabled={disabled && busy !== "connect"} onClick={onConnect}>
              {row.connection ? "Reconnect" : "Connect"}
            </Button>
          )
        ) : (
          <code className={styles.envName}>{row.def.envVar}</code>
        )}
      </div>
    </li>
  );
}

function RowSkeleton() {
  return (
    <li className={styles.row}>
      <Skeleton width={36} height={36} />
      <div className={styles.rowMain}>
        <Skeleton width={120} height={14} />
        <Skeleton width="70%" height={12} style={{ marginTop: 8 }} />
      </div>
    </li>
  );
}
