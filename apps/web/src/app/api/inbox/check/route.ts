import { jsonError, jsonOk } from "@/lib/server/http";
import { checkInbox } from "@/lib/server/inbox";
import { errorMessage } from "@/lib/server/util";

export const dynamic = "force-dynamic";
// New deals start their agents after the response, within this route's time budget.
export const maxDuration = 300;

export async function POST() {
  try {
    return jsonOk(await checkInbox());
  } catch (error) {
    return jsonError(errorMessage(error, "Couldn't check the inbox"), 502, "upstream");
  }
}
