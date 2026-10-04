import { jsonError, jsonOk } from "@/lib/server/http";
import { listRecentEmails } from "@/lib/server/store";
import { errorMessage } from "@/lib/server/util";
import { getInboxWatch } from "@/lib/server/watch";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [watch, recent] = await Promise.all([getInboxWatch(), listRecentEmails()]);
    return jsonOk({ watch, recent });
  } catch (error) {
    return jsonError(errorMessage(error, "Couldn't load the inbox"), 500);
  }
}
