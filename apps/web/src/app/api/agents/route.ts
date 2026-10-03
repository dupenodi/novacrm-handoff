import { jsonOk } from "@/lib/server/http";
import { listAgents, toolsForAgent } from "@/lib/server/agents";
import "@/lib/server/agents/tools/register";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonOk({
    agents: listAgents().map((a) => ({
      name: a.name,
      displayName: a.displayName,
      systemPrompt: a.systemPrompt,
      tools: toolsForAgent(a.name).map((t) => ({
        name: t.name,
        description: t.description,
        composioSlug: t.composioSlug ?? null,
      })),
    })),
  });
}
