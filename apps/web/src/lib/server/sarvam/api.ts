import "server-only";
import {
  SARVAM_AGENT_PHONE_NUMBER,
  SARVAM_API_KEY,
  SARVAM_APP_ID,
  SARVAM_APP_VERSION,
  SARVAM_CONNECTION_ID,
  SARVAM_ORG_ID,
  SARVAM_WORKSPACE_ID,
} from "../config";

const SARVAM_BASE = "https://apps.sarvam.ai/api";
const ANALYTICS = `/analytics/v1/${SARVAM_ORG_ID}/${SARVAM_WORKSPACE_ID}/${SARVAM_APP_ID}`;

/**
 * One row from the analytics attempts API. `agent_variables` holds the agent's
 * output variables (tier, confidence, ae_quote, call_outcome, callback_time, notes)
 * once post-call extraction runs.
 */
export type SarvamAttempt = {
  attempt_id?: string | null;
  interaction_id?: string | null;
  connectivity_status?: string | null;
  failure_reason?: string | null;
  end_datetime?: string | null;
  agent_variables?: Record<string, unknown> | null;
};

const REQUIRED_ENV: Array<[string, string]> = [
  ["SARVAM_API_KEY", SARVAM_API_KEY],
  ["SARVAM_ORG_ID", SARVAM_ORG_ID],
  ["SARVAM_WORKSPACE_ID", SARVAM_WORKSPACE_ID],
  ["SARVAM_APP_ID", SARVAM_APP_ID],
  ["SARVAM_CONNECTION_ID", SARVAM_CONNECTION_ID],
  ["SARVAM_AGENT_PHONE_NUMBER", SARVAM_AGENT_PHONE_NUMBER],
];

/** Why Sarvam can't be used right now, or null when it's fully configured. */
function configProblem(): string | null {
  const missing = REQUIRED_ENV.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) return `Sarvam is not configured: set ${missing.join(", ")}`;
  if (!Number.isInteger(SARVAM_APP_VERSION)) {
    return "SARVAM_APP_VERSION must be the published agent version number";
  }
  return null;
}

export function isSarvamConfigured(): boolean {
  return configProblem() === null;
}

export function assertSarvamConfigured(): void {
  const problem = configProblem();
  if (problem) throw new Error(problem);
}

async function sarvamFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${SARVAM_BASE}${path}`, {
    ...init,
    headers: { "X-API-Key": SARVAM_API_KEY, "Content-Type": "application/json", ...init?.headers },
  });
  const text = await response.text();
  const body = parseJson(text);
  if (!response.ok) {
    const detail = body && typeof body === "object" && "detail" in body ? JSON.stringify(body.detail) : text;
    throw new Error(
      `Sarvam ${init?.method ?? "GET"} ${path} failed (${response.status}): ${detail || response.statusText}`,
    );
  }
  return body as T;
}

function parseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Normalize to E.164-ish: strip spaces/dashes; keep leading +. */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

/**
 * Starts an instant outbound call from the rented number. The prompt and the
 * tier/confidence/ae_quote extraction live in the Sarvam agent; we only pass
 * the per-call input variables.
 */
export async function startOutboundCall(input: {
  phone: string;
  aeName: string;
  customerName: string;
}): Promise<string> {
  const { attempt_id } = await sarvamFetch<{ attempt_id?: string }>(
    `/outbounds/v1/orgs/${SARVAM_ORG_ID}/workspaces/${SARVAM_WORKSPACE_ID}/outbounds`,
    {
      method: "POST",
      body: JSON.stringify({
        app_config: {
          app_id: SARVAM_APP_ID,
          app_version: SARVAM_APP_VERSION,
          connection_config: {
            connection_id: SARVAM_CONNECTION_ID,
            agent_phone_number: SARVAM_AGENT_PHONE_NUMBER,
          },
          agent_variables: {
            ae_name: input.aeName.trim() || "there",
            customer_name: input.customerName.trim() || "the customer",
          },
        },
        user_config: { user_phone_number: input.phone },
      }),
    },
  );
  if (!attempt_id) throw new Error("Sarvam create outbound returned no attempt_id");
  return attempt_id;
}

/** Looks up one attempt started after `since`; null until Sarvam has recorded it. */
export async function findAttempt(attemptId: string, since: Date): Promise<SarvamAttempt | null> {
  const params = new URLSearchParams({
    start_datetime: new Date(since.getTime() - 60_000).toISOString(),
    end_datetime: new Date(Date.now() + 60_000).toISOString(),
    limit: "1",
    filter_conditions: JSON.stringify([{ id: "1", field: "attempt_id", operator: "equals", value: attemptId }]),
  });
  const page = await sarvamFetch<{ items: SarvamAttempt[] }>(`${ANALYTICS}/attempts?${params}`);
  return page.items[0] ?? null;
}

export function fetchTranscript(interactionId: string): Promise<unknown> {
  return sarvamFetch<unknown>(`${ANALYTICS}/transcripts/${encodeURIComponent(interactionId)}`);
}
