import Link from "next/link";
import type { ReactNode } from "react";
import type { AgentName } from "@/lib/clients";

const AGENT_LABEL: Record<AgentName, string> = {
  intake: "Intake agent",
  comms: "Comms agent",
};

export function AgentFrame({ name, agent, children }: { name: string; agent: AgentName; children: ReactNode }) {
  return (
    <div className="agent-frame">
      <Link href="/" className="agent-frame__back">
        ← Clients
      </Link>
      <div>
        <h1>{name}</h1>
        <p>{AGENT_LABEL[agent]}</p>
      </div>
      {children}
    </div>
  );
}
