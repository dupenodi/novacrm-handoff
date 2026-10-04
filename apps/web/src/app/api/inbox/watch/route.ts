import { jsonError, jsonOk } from "@/lib/server/http";
import { errorMessage } from "@/lib/server/util";
import { getInboxWatch, startWatching, stopWatching } from "@/lib/server/watch";

export const dynamic = "force-dynamic";

/** Turns on the Gmail trigger that pushes new mail to the webhook. */
export async function POST() {
  try {
    await startWatching();
    return jsonOk(await getInboxWatch());
  } catch (error) {
    return jsonError(errorMessage(error, "Couldn't start watching the inbox"), 502, "upstream");
  }
}

export async function DELETE() {
  try {
    await stopWatching();
    return jsonOk(await getInboxWatch());
  } catch (error) {
    return jsonError(errorMessage(error, "Couldn't stop watching the inbox"), 502, "upstream");
  }
}
