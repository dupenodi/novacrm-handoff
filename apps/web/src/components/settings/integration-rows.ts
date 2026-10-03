import { INTEGRATIONS, type ComposioConnection, type IntegrationDef, type IntegrationsStatus } from "@/lib/integrations";

const ACTIVE = "ACTIVE";

/** One integration as the Settings panel shows it. */
export type IntegrationRowState = {
  def: IntegrationDef;
  connected: boolean;
  /** Who it's connected as, e.g. an email. */
  identity: string | null;
  /** A problem or next step worth showing under the row. */
  attention: string | null;
  connection: ComposioConnection | null;
};

export function integrationName(toolkit: string): string {
  return INTEGRATIONS.find((integration) => integration.toolkit === toolkit)?.name ?? toolkit;
}

/** Turns raw fetch / Composio errors into something a person can act on. */
export function friendlyError(raw: string): string {
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

export function toRowState(def: IntegrationDef, status: IntegrationsStatus | null): IntegrationRowState {
  return def.method === "api-key" ? apiKeyRow(def, status) : composioRow(def, status);
}

function apiKeyRow(def: IntegrationDef, status: IntegrationsStatus | null): IntegrationRowState {
  const connected = Boolean(status?.apiKeysSet[def.id]);
  return {
    def,
    connected,
    identity: null,
    attention: status && !connected ? `Add ${def.envVar} to .env to turn this on.` : null,
    connection: null,
  };
}

function composioRow(def: IntegrationDef, status: IntegrationsStatus | null): IntegrationRowState {
  const connection = status?.connections.find((c) => c.toolkit === def.toolkit) ?? null;
  return {
    def,
    connected: connection?.status === ACTIVE,
    identity: connection?.label ?? null,
    attention: connection ? connectionAttention(connection) : slackMockNotice(def, status),
    connection,
  };
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

/** Slack without a connection runs in mock mode; say so. */
function slackMockNotice(def: IntegrationDef, status: IntegrationsStatus | null): string | null {
  if (def.id !== "slack") return null;
  if (status?.slackMode === "mock") return "SLACK_MODE=mock — nothing is posted to Slack.";
  if (status?.slackEffective === "mock") return "Connect Slack to go live. Mock is the backup until then.";
  return null;
}
