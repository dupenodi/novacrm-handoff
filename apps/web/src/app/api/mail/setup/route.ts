import { jsonError, jsonOk } from "@/lib/server/http";
import { COMPOSIO_API_KEY, COMPOSIO_USER_ID, PUBLIC_APP_URL } from "@/lib/server/config";
import { getActiveAccountId } from "@/lib/server/composio";

export const dynamic = "force-dynamic";

const TRIGGERS_URL = "https://backend.composio.dev/api/v3/trigger_instances";

/** Subscribes the connected Gmail inbox to Composio's new-message trigger, pointed at our webhook. */
export async function POST() {
  if (!COMPOSIO_API_KEY) return jsonError("COMPOSIO_API_KEY is not set", 503, "not_configured");
  if (!PUBLIC_APP_URL) return jsonError("Set PUBLIC_APP_URL to the public origin of this app", 400, "validation");

  let connectedAccountId: string;
  try {
    connectedAccountId = await getActiveAccountId("gmail");
  } catch {
    return jsonError("Gmail is not connected", 409, "conflict");
  }

  const webhookUrl = `${PUBLIC_APP_URL.replace(/\/$/, "")}/api/webhooks/composio`;
  const res = await fetch(TRIGGERS_URL, {
    method: "POST",
    headers: { "x-api-key": COMPOSIO_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      user_id: COMPOSIO_USER_ID,
      connected_account_id: connectedAccountId,
      trigger_name: "GMAIL_NEW_GMAIL_MESSAGE",
      trigger_config: { userId: "me", interval: 1 },
      webhook_url: webhookUrl,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { message?: unknown };
  if (!res.ok) {
    const message = typeof data.message === "string" ? data.message : `Composio trigger failed (${res.status})`;
    return jsonError(message, 502, "upstream");
  }
  return jsonOk({ ok: true, webhookUrl, data });
}
