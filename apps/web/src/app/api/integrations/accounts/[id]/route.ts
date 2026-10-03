import { jsonError, jsonOk } from "@/lib/server/http";
import { disconnect } from "@/lib/server/composio";
import { errorMessage } from "@/lib/server/util";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await disconnect(id);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(errorMessage(error, "Disconnect failed"), 502, "upstream");
  }
}
