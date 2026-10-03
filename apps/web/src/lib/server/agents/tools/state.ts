import "server-only";
import type { Client } from "@/lib/clients";
import { getClient, updateClient, type ClientPatch } from "../../clients-store";
import { registerTool } from "../registry";

registerTool({
  name: "state.read_client",
  description: "Read the current client.",
  agents: "*",
  inputSchema: { type: "object", properties: {} },
  async execute(_input, ctx): Promise<Client | null> {
    const client = (await getClient(ctx.clientId)) ?? null;
    ctx.state.client = client;
    return client;
  },
});

registerTool({
  name: "state.write_client",
  description: "Patch client fields (name, phones, project id, slack channel, stage).",
  agents: "*",
  inputSchema: {
    type: "object",
    required: ["patch"],
    properties: { patch: { type: "object" } },
  },
  async execute(input: { patch: ClientPatch }, ctx) {
    const updated = await updateClient(ctx.clientId, input.patch);
    if (!updated) throw new Error(`Client not found: ${ctx.clientId}`);
    ctx.state.client = updated;
    return updated;
  },
});
