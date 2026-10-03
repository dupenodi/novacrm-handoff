import { jsonOk } from "@/lib/server/http";
import { ingestByMessageId, ingestInbox } from "@/lib/server/mail/ingest";
import { isRecord } from "@/lib/server/util";

export const dynamic = "force-dynamic";

const ID_KEYS = ["messageId", "message_id", "id"];
const NESTED_KEYS = ["data", "payload", "new_data", "message"];

/** Finds the Gmail message id in the trigger payload, which may be nested a few levels deep. */
function findMessageId(value: unknown, depth = 0): string | null {
  if (!isRecord(value) || depth > 4) return null;
  for (const key of ID_KEYS) {
    const id = value[key];
    if (typeof id === "string" && id.trim()) return id.trim();
  }
  for (const key of NESTED_KEYS) {
    const found = findMessageId(value[key], depth + 1);
    if (found) return found;
  }
  return null;
}

/** Gmail trigger: ingest the new message, or rescan the inbox if the payload has no id. */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const messageId = findMessageId(body);
  if (messageId) {
    return jsonOk({ ok: true, item: await ingestByMessageId(messageId) });
  }
  return jsonOk({ ok: true, ...(await ingestInbox({ max: 8 })) });
}
