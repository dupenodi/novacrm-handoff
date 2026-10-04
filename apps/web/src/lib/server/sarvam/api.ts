import "server-only";
import {
  PUBLIC_APP_URL,
  SARVAM_AGENT_PHONE_NUMBER,
  SARVAM_API_KEY,
  SARVAM_APP_ID,
  SARVAM_APP_VERSION,
  SARVAM_CONNECTION_ID,
  SARVAM_ORG_ID,
  SARVAM_WEBHOOK_SECRET,
  SARVAM_WORKSPACE_ID,
} from "../config";

const SARVAM_BASE = "https://apps.sarvam.ai/api";

/**
 * What Sarvam posts to our webhook once an outbound call attempt is over, whether or not it
 * connected. Everything is null unless the call connected.
 * https://docs.sarvam.ai/api-reference/instant-outbound/webhook-payload
 */
export type CallWebhook = {
  attempt_id: string;
  status: "connected" | "no_answer" | "busy" | "failed";
  duration?: number | null;
  interaction_id?: string | null;
  failure_reason?: string | null;
  /** The agent's output variables: plan, confidence, ae_quote, call_outcome, and so on. */
  final_agent_variables?: Record<string, unknown> | null;
  interaction_transcript?: Array<{ role: string; en_text: string }> | null;
};

const REQUIRED_ENV: Array<[string, string]> = [
  ["SARVAM_API_KEY", SARVAM_API_KEY],
  ["SARVAM_ORG_ID", SARVAM_ORG_ID],
  ["SARVAM_WORKSPACE_ID", SARVAM_WORKSPACE_ID],
  ["SARVAM_APP_ID", SARVAM_APP_ID],
  ["SARVAM_CONNECTION_ID", SARVAM_CONNECTION_ID],
  ["SARVAM_AGENT_PHONE_NUMBER", SARVAM_AGENT_PHONE_NUMBER],
  ["SARVAM_WEBHOOK_SECRET", SARVAM_WEBHOOK_SECRET],
  ["PUBLIC_APP_URL (Sarvam reports the call result to it)", PUBLIC_APP_URL],
];

/** Throws why Sarvam can't be used right now, if it isn't fully configured. */
export function assertSarvamConfigured(): void {
  const missing = REQUIRED_ENV.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new Error(`Voice calling isn't set up. Set ${missing.join(", ")} in .env.`);
  if (!Number.isInteger(SARVAM_APP_VERSION)) {
    throw new Error("SARVAM_APP_VERSION must be the published agent version number");
  }
}

/** Where Sarvam posts the call result. */
function webhookUrl(): string {
  const base = PUBLIC_APP_URL.replace(/\/$/, "");
  return `${base}/api/webhooks/sarvam?secret=${encodeURIComponent(SARVAM_WEBHOOK_SECRET)}`;
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
 * Starts an instant outbound call from the rented number and returns its attempt id straight away,
 * while the phone is still ringing. The script and the extraction live in the Sarvam agent; we pass
 * the per-call input variables: who to ask for, which plans to offer (the Rocketlane templates) and
 * which details to collect. The result arrives later at our webhook.
 */
export async function startOutboundCall(input: {
  phone: string;
  aeName: string;
  customerName: string;
  planOptions: string;
  missingDetails: string;
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
            plan_options: input.planOptions,
            missing_details: input.missingDetails,
          },
        },
        user_config: { user_phone_number: input.phone },
        webhook_config: { url: webhookUrl() },
      }),
    },
  );
  if (!attempt_id) throw new Error("Sarvam create outbound returned no attempt_id");
  return attempt_id;
}
