import { canRunAgent, isAgentName } from "@/lib/clients";
import { jsonError, sseResponse } from "@/lib/server/http";
import { getClient } from "@/lib/server/clients-store";
import { streamAgent } from "@/lib/server/agents";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string; agent: string }> };

/** Starts the intake or comms agent for a client and streams its progress. */
export async function POST(_request: Request, { params }: Params) {
  const { id, agent } = await params;
  if (!isAgentName(agent)) return jsonError(`Unknown agent: ${agent}`, 404, "not_found");

  const client = await getClient(id);
  if (!client) return jsonError(`Client not found: ${id}`, 404, "not_found");
  if (!canRunAgent(agent, client.stage)) {
    return jsonError(`The ${agent} agent can't run while the client is at "${client.stage}"`, 409, "conflict");
  }

  return sseResponse(await streamAgent({ client, agent }));
}
