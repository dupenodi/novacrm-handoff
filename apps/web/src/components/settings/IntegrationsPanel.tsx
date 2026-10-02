"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type ComposioConnection,
  GROUP_ORDER,
  INTEGRATIONS,
  type IntegrationDef,
  type IntegrationGroup,
  type IntegrationsStatus,
  METHOD_LABEL,
  integrationGroupLabel,
  integrationLogoUrl,
} from "@/lib/integrations";

const ACTIVE = "ACTIVE";

type IntegrationRuntime = {
  def: IntegrationDef;
  connected: boolean;
  identity: string | null;
  attention: string | null;
  connection: ComposioConnection | null;
};

type Flash =
  | { kind: "toast"; text: string }
  | { kind: "error"; title: string; text: string }
  | null;

const GROUP_HINT: Record<IntegrationGroup, string> = {
  core: "Needed to pick up new deals and set up their onboarding projects.",
  communication: "Optional. Until Slack is connected, customer channels are only simulated.",
  voice: "Used to call account executives and read deal emails. These keys live on the server.",
};

function integrationName(toolkit: string): string {
  return INTEGRATIONS.find((integration) => integration.toolkit === toolkit)?.name ?? toolkit;
}

function friendlyError(raw: string): string {
  const message = raw.trim();
  if (!message) return "Something went wrong.";
  if (/failed to fetch|networkerror|load failed/i.test(message)) return "Can't reach the app server. Is it running?";
  if (/api key|unauthorized|401|invalid key/i.test(message)) {
    return "Composio didn't accept the API key. Check it in the Composio dashboard.";
  }
  try {
    return decodeURIComponent(message.replace(/\+/g, " "));
  } catch {
    return message;
  }
}

function connectionAttention(connection: ComposioConnection): string | null {
  const status = connection.status.toUpperCase();
  if (status === ACTIVE) return null;
  if (status.includes("EXPIR") || status.includes("REVOK")) {
    return `Connection ${connection.status.toLowerCase()} — reconnect to keep tools working.`;
  }
  if (status.includes("INIT") || status.includes("PENDING")) {
    return "Authorization didn't finish — connect again to complete it.";
  }
  return `Account status: ${connection.status}. Reconnect if tools start failing.`;
}

function resolveIntegration(def: IntegrationDef, status: IntegrationsStatus | null): IntegrationRuntime {
  if (def.method === "api-key") {
    return {
      def,
      connected: Boolean(status?.apiKeysSet[def.id]),
      identity: null,
      attention: status && !status.apiKeysSet[def.id] ? `Add ${def.envVar} to .env to turn this on.` : null,
      connection: null,
    };
  }
  const connection = status?.connections.find((c) => c.toolkit === def.toolkit) ?? null;
  const slackMock = def.id === "slack" && status?.slackMode === "mock";
  return {
    def,
    connected: connection?.status === ACTIVE,
    identity: connection?.label ?? null,
    attention: connection
      ? connectionAttention(connection)
      : slackMock
        ? "Simulated for now — nothing is posted to Slack yet."
        : null,
    connection,
  };
}

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
  return body;
}

export function IntegrationsPanel() {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const loadSeq = useRef(0);
  const confirmTimer = useRef<number | null>(null);

  const showToast = useCallback((text: string) => setFlash({ kind: "toast", text }), []);
  const showError = useCallback(
    (title: string, text: string) => setFlash({ kind: "error", title, text: friendlyError(text) }),
    [],
  );
  const clearFlash = useCallback(() => setFlash(null), []);

  const load = useCallback(
    async (opts?: { quiet?: boolean; announceError?: boolean }): Promise<boolean> => {
      const seq = ++loadSeq.current;
      const announceError = opts?.announceError !== false;
      if (opts?.quiet) setRefreshing(true);
      else setLoading(true);
      try {
        const next = await requestJson<IntegrationsStatus>("/api/integrations");
        if (seq !== loadSeq.current) return false;
        setStatus(next);
        if (announceError && next.composio.error) {
          showError("Couldn't load integrations", next.composio.error);
          return false;
        }
        return true;
      } catch (error) {
        if (seq !== loadSeq.current) return false;
        if (announceError) showError("Couldn't load integrations", error instanceof Error ? error.message : "Failed to load");
        return false;
      } finally {
        if (seq === loadSeq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [showError],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");
    if (connected) setFlash({ kind: "toast", text: `${integrationName(connected)} is connected.` });
    if (error) setFlash({ kind: "error", title: "Connection didn't finish", text: friendlyError(error) });
    if (connected || error) window.history.replaceState({}, "", "/settings#integrations");
    void load({ announceError: !connected && !error });
  }, [load]);

  useEffect(() => {
    return () => {
      if (confirmTimer.current != null) window.clearTimeout(confirmTimer.current);
    };
  }, []);

  const rows = useMemo(() => INTEGRATIONS.map((def) => resolveIntegration(def, status)), [status]);
  const byGroup = useMemo(
    () =>
      GROUP_ORDER.map((group) => ({
        group,
        label: integrationGroupLabel(group),
        rows: rows.filter((row) => row.def.group === group),
      })),
    [rows],
  );

  const configured = Boolean(status?.composio.configured);
  const showSkeleton = loading && status === null;
  const anyBusy = busy != null;

  async function connect(row: IntegrationRuntime) {
    if (busy) return;
    if (!configured) {
      showError("Composio isn't set up", "Add COMPOSIO_API_KEY to .env, then try again.");
      return;
    }
    setBusy(`connect:${row.def.id}`);
    clearFlash();
    try {
      const { redirectUrl } = await requestJson<{ redirectUrl: string }>("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolkit: row.def.toolkit }),
      });
      window.location.href = redirectUrl;
    } catch (error) {
      showError(`Couldn't connect ${row.def.name}`, error instanceof Error ? error.message : "Connect failed");
      setBusy(null);
    }
  }

  async function disconnect(row: IntegrationRuntime) {
    if (busy || !row.connection) return;
    setBusy(`disconnect:${row.def.id}`);
    setConfirmId(null);
    clearFlash();
    try {
      await requestJson(`/api/integrations/accounts/${encodeURIComponent(row.connection.accountId)}`, {
        method: "DELETE",
      });
      showToast(`${row.def.name} is disconnected.`);
      await load({ quiet: true, announceError: false });
    } catch (error) {
      showError(`Couldn't disconnect ${row.def.name}`, error instanceof Error ? error.message : "Disconnect failed");
    } finally {
      setBusy(null);
    }
  }

  function requestConfirm(id: string, action: () => void) {
    if (confirmId === id) {
      action();
      return;
    }
    setConfirmId(id);
    if (confirmTimer.current != null) window.clearTimeout(confirmTimer.current);
    confirmTimer.current = window.setTimeout(() => setConfirmId(null), 4000);
  }

  function busyActionFor(row: IntegrationRuntime): IntegrationBusyAction | null {
    if (busy === `disconnect:${row.def.id}`) return "disconnect";
    if (busy === `connect:${row.def.id}`) return row.connection ? "reconnect" : "connect";
    return null;
  }

  return (
    <Card
      title="Integrations"
      actions={
        !showSkeleton ? (
          <Button
            variant="secondary"
            loading={refreshing}
            disabled={anyBusy || refreshing}
            onClick={() => void load({ quiet: true }).then((ok) => ok && showToast("Refreshed."))}
          >
            Refresh
          </Button>
        ) : null
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
          byGroup.map(({ group, label, rows: groupRows }) => (
            <div key={group} className="t-integration-group">
              <h4 className="t-integration-group__label">{label}</h4>
              <p className="settings-group-hint">{GROUP_HINT[group]}</p>
              <ul className="t-integration-list">
                {groupRows.map((row) => {
                  const viaComposio = row.def.method === "composio";
                  const confirmKey = `disc:${row.def.id}`;
                  return (
                    <IntegrationRow
                      key={row.def.id}
                      name={row.def.name}
                      logoUrl={integrationLogoUrl(row.def.toolkit)}
                      connected={row.connected}
                      busyAction={busyActionFor(row)}
                      disabled={anyBusy || (viaComposio && !configured)}
                      attention={row.attention}
                      onConnect={viaComposio ? () => void connect(row) : undefined}
                      onReconnect={viaComposio && row.connected ? () => void connect(row) : undefined}
                      onDisconnect={
                        viaComposio && row.connected
                          ? () => requestConfirm(confirmKey, () => void disconnect(row))
                          : undefined
                      }
                      disconnectLabel={confirmId === confirmKey ? "Confirm disconnect" : "Disconnect"}
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
                })}
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
