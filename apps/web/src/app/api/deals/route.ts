import { jsonError, jsonOk } from "@/lib/server/http";
import { listDealSummaries } from "@/lib/server/store";
import { errorMessage } from "@/lib/server/util";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return jsonOk({ deals: await listDealSummaries() });
  } catch (error) {
    return jsonError(errorMessage(error, "Couldn't load deals"), 500);
  }
}
