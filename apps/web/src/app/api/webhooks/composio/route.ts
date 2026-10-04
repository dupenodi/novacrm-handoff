import { client } from "@/lib/server/composio";
import { jsonError, jsonOk } from "@/lib/server/http";
import { ingestMessageById } from "@/lib/server/inbox";
import { isRecord, str } from "@/lib/server/util";
import { getWebhookSecret } from "@/lib/server/watch";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Composio's Gmail trigger posts here for each new inbox message. */
export async function POST(request: Request) {
  const secret = await getWebhookSecret();
  let payload: Record<string, unknown> | undefined;
  try {
    const parsed = await client().triggers.parse(request, secret ? { verifySecret: secret } : undefined);
    payload = parsed.payload.payload;
  } catch {
    return jsonError("Invalid webhook", 401, "unauthorized");
  }

  const messageId = isRecord(payload) ? str(payload.messageId) || str(payload.message_id) || str(payload.id) : "";
  if (!messageId) return jsonOk({ ok: true, skipped: "No message id in payload" });
  await ingestMessageById(messageId);
  return jsonOk({ ok: true });
}
