import { COMPOSIO_TOOLKITS } from "@/lib/integrations";
import { jsonError, jsonOk } from "@/lib/server/http";
import { startConnection } from "@/lib/server/composio";
import { errorMessage } from "@/lib/server/util";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { toolkit?: unknown };
  const toolkit = typeof body.toolkit === "string" ? body.toolkit.trim().toLowerCase() : "";
  if (!COMPOSIO_TOOLKITS.has(toolkit)) {
    const allowed = [...COMPOSIO_TOOLKITS].join(", ");
    return jsonError(`“${toolkit || "(none)"}” isn't connectable here. Allowed: ${allowed}.`, 400, "validation");
  }

  const callbackUrl = new URL(`/api/integrations/callback?toolkit=${encodeURIComponent(toolkit)}`, request.url);
  try {
    return jsonOk({ redirectUrl: await startConnection(toolkit, callbackUrl.toString()) });
  } catch (error) {
    return jsonError(errorMessage(error, "Connect failed"), 502, "upstream");
  }
}
