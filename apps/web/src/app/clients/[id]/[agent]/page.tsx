import { notFound } from "next/navigation";
import { isAgentName } from "@/lib/clients";
import { getClient } from "@/lib/server/clients-store";
import { listToolsForClient } from "@/lib/server/agents";
import { AgentLive } from "@/components/desk/AgentLive";
import "@/components/desk/desk.css";

export default async function AgentPage({ params }: { params: Promise<{ id: string; agent: string }> }) {
  const { id, agent } = await params;
  if (!isAgentName(agent)) notFound();
  const client = await getClient(id);
  if (!client) notFound();
  return <AgentLive client={client} agent={agent} initial={await listToolsForClient(id, agent)} />;
}
