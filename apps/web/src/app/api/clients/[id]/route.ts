import { jsonError, jsonOk } from "@/lib/server/http";
import { getClient } from "@/lib/server/clients-store";
import { listToolsForClient } from "@/lib/server/agents";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) return jsonError(`Client not found: ${id}`, 404, "not_found");
  const [intake, comms] = await Promise.all([listToolsForClient(id, "intake"), listToolsForClient(id, "comms")]);
  return jsonOk({ client, intake, comms });
}
