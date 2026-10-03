import { jsonError, jsonOk } from "@/lib/server/http";
import { ingestInbox } from "@/lib/server/mail/ingest";
import { errorMessage } from "@/lib/server/util";

export const dynamic = "force-dynamic";

async function poll() {
  try {
    return jsonOk(await ingestInbox());
  } catch (error) {
    return jsonError(errorMessage(error, "Inbox poll failed"), 502, "upstream");
  }
}

export { poll as GET, poll as POST };
