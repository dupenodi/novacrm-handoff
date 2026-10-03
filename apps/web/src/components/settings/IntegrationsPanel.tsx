"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Banner,
  Button,
  Card,
  Chip,
  IntegrationRow,
  IntegrationRowSkeleton,
  Toast,
  type IntegrationBusyAction,
} from "@novacrm/ui";
import {
  GROUP_LABEL,
  GROUP_ORDER,
  INTEGRATIONS,
  METHOD_LABEL,
  integrationLogoUrl,
  type IntegrationGroup,
  type IntegrationsStatus,
} from "@/lib/integrations";
import { errorText, requestJson } from "@/lib/request-json";
import { friendlyError, integrationName, toRowState, type IntegrationRowState } from "./integration-rows";

const GROUP_HINT: Record<IntegrationGroup, string> = {
  core: "Needed to pick up new deals and set up their onboarding projects.",
  communication: "Optional. Until Slack is connected, customer channels are only simulated.",
  voice: "Used to call account executives and read deal emails. These keys live on the server.",
};

/** How long "Confirm disconnect" stays armed. */
const CONFIRM_MS = 4000;

type Flash = { kind: "toast"; text: string } | { kind: "error"; title: string; text: string } | null;

type Busy = { action: "connect" | "disconnect"; id: string } | null;

export function IntegrationsPanel() {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [flash, setFlash] = useState<Flash>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  // Only the latest load may update state.
  const loadSeq = useRef(0);
  const confirmTimer = useRef<number | undefined>(undefined);

  const showToast = (text: string) => setFlash({ kind: "toast", text });
  const showError = useCallback(
    (title: string, error: unknown) => setFlash({ kind: "error", title, text: friendlyError(errorText(error, "")) }),
    [],
  );
  const clearFlash = () => setFlash(null);

  const load = useCallback(
    async ({ quiet = false, announceError = true } = {}): Promise<boolean> => {
      const seq = ++loadSeq.current;
      const isLatest = () => seq === loadSeq.current;
      (quiet ? setRefreshing : setLoading)(true);
      try {
        const next = await requestJson<IntegrationsStatus>("/api/integrations");
        if (!isLatest()) return false;
        setStatus(next);
        if (!next.composio.error) return true;
        if (announceError) showError("Couldn't load integrations", new Error(next.composio.error));
        return false;
      } catch (error) {
        if (isLatest() && announceError) showError("Couldn't load integrations", error);
        return false;
      } finally {
        if (isLatest()) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [showError],
  );

  // First load, plus the outcome Composio's connect flow sent back in the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");
    if (connected) showToast(`${integrationName(connected)} is connected.`);
    if (error) showError("Connection didn't finish", new Error(error));
    if (connected || error) window.history.replaceState({}, "", "/settings#integrations");
    void load({ announceError: !connected && !error });
  }, [load, showError]);

  useEffect(() => () => window.clearTimeout(confirmTimer.current), []);

  const configured = Boolean(status?.composio.configured);
  const showSkeleton = loading && status === null;
  const rows = INTEGRATIONS.map((def) => toRowState(def, status));

  async function connect(row: IntegrationRowState) {
    if (busy) return;
    if (!configured) {
      showError("Composio isn't set up", new Error("Add COMPOSIO_API_KEY to .env, then try again."));
      return;
    }
    setBusy({ action: "connect", id: row.def.id });
    clearFlash();
    try {
      const { redirectUrl } = await requestJson<{ redirectUrl: string }>("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolkit: row.def.toolkit }),
      });
      window.location.href = redirectUrl;
    } catch (error) {
      showError(`Couldn't connect ${row.def.name}`, error);
      setBusy(null);
    }
  }

  async function disconnect(row: IntegrationRowState) {
    if (busy || !row.connection) return;
    setBusy({ action: "disconnect", id: row.def.id });
    setConfirmId(null);
    clearFlash();
    try {
      await requestJson(`/api/integrations/accounts/${encodeURIComponent(row.connection.accountId)}`, {
        method: "DELETE",
      });
      showToast(`${row.def.name} is disconnected.`);
      await load({ quiet: true, announceError: false });
    } catch (error) {
      showError(`Couldn't disconnect ${row.def.name}`, error);
    } finally {
      setBusy(null);
    }
  }

  /** First click arms "Confirm disconnect"; a second click within CONFIRM_MS disconnects. */
  function disconnectWithConfirm(row: IntegrationRowState) {
    if (confirmId === row.def.id) {
      void disconnect(row);
      return;
    }
    setConfirmId(row.def.id);
    window.clearTimeout(confirmTimer.current);
    confirmTimer.current = window.setTimeout(() => setConfirmId(null), CONFIRM_MS);
  }

  function busyActionFor(row: IntegrationRowState): IntegrationBusyAction | null {
    if (busy?.id !== row.def.id) return null;
    if (busy.action === "disconnect") return "disconnect";
    return row.connection ? "reconnect" : "connect";
  }

  async function refresh() {
    if (await load({ quiet: true })) showToast("Refreshed.");
  }

  return (
    <Card
      title="Integrations"
      actions={
        showSkeleton ? null : (
          <Button
            variant="secondary"
            loading={refreshing}
            disabled={busy !== null || refreshing}
            onClick={() => void refresh()}
          >
            Refresh
          </Button>
        )
      }
    >
      <div className="settings-integrations-main">
        {flash?.kind === "error" ? (
          <Banner tone="danger" title={flash.title} onDismiss={clearFlash}>
            {flash.text}
          </Banner>
        ) : null}

        {status && !configured ? (
          <Banner tone="warning" title="Composio isn't set up yet">
            Gmail, Rocketlane and Slack connect through Composio. Add COMPOSIO_API_KEY to .env to connect them.
          </Banner>
        ) : null}

        {showSkeleton ? (
          <ul className="t-integration-list" aria-busy="true">
            <IntegrationRowSkeleton />
            <IntegrationRowSkeleton />
            <IntegrationRowSkeleton />
          </ul>
        ) : (
          GROUP_ORDER.map((group) => (
            <div key={group} className="t-integration-group">
              <h4 className="t-integration-group__label">{GROUP_LABEL[group]}</h4>
              <p className="settings-group-hint">{GROUP_HINT[group]}</p>
              <ul className="t-integration-list">
                {rows
                  .filter((row) => row.def.group === group)
                  .map((row) => (
                    <SettingsIntegrationRow
                      key={row.def.id}
                      row={row}
                      busyAction={busyActionFor(row)}
                      disabled={busy !== null || (row.def.method === "composio" && !configured)}
                      confirming={confirmId === row.def.id}
                      onConnect={() => void connect(row)}
                      onDisconnect={() => disconnectWithConfirm(row)}
                    />
                  ))}
              </ul>
            </div>
          ))
        )}

        {flash?.kind === "toast" ? (
          <div className="t-toast-host">
            <Toast content={flash.text} duration={4200} onDismiss={clearFlash} />
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function SettingsIntegrationRow({
  row,
  busyAction,
  disabled,
  confirming,
  onConnect,
  onDisconnect,
}: {
  row: IntegrationRowState;
  busyAction: IntegrationBusyAction | null;
  disabled: boolean;
  confirming: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  // API-key integrations are configured in .env, so they have no actions here.
  const viaComposio = row.def.method === "composio";
  const canManage = viaComposio && row.connected;
  return (
    <IntegrationRow
      name={row.def.name}
      logoUrl={integrationLogoUrl(row.def.toolkit)}
      connected={row.connected}
      busyAction={busyAction}
      disabled={disabled}
      attention={row.attention}
      onConnect={viaComposio ? onConnect : undefined}
      onReconnect={canManage ? onConnect : undefined}
      onDisconnect={canManage ? onDisconnect : undefined}
      disconnectLabel={confirming ? "Confirm disconnect" : "Disconnect"}
      connectLabel={viaComposio ? "Connect" : "Set in .env"}
      meta={
        <>
          {row.connected ? (
            <Chip tone="ok" size="sm">
              Connected
            </Chip>
          ) : null}
          <Chip tone={row.connected ? "accent" : "muted"} size="sm">
            {METHOD_LABEL[row.def.method]}
          </Chip>
          {row.identity ? (
            <Chip tone="guess" size="sm">
              {row.identity}
            </Chip>
          ) : null}
        </>
      }
      facts={row.def.scope}
    />
  );
}
