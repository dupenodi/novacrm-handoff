import { notFound } from "next/navigation";
import type { Client, ToolTrace } from "@/lib/clients";
import { AgentFrame } from "@/components/desk/AgentFrame";
import { ClientCard } from "@/components/desk/ClientCard";
import { Kanban } from "@/components/desk/Kanban";
import { TraceList } from "@/components/desk/TraceList";
import "@/components/desk/desk.css";

const now = "2026-10-02T14:30:00.000Z";

const samples: Client[] = [
  {
    id: "cli_acme",
    name: "Acme Logistics",
    contactName: "Jordan Lee",
    contactEmail: "jordan@acme.co",
    aeName: "Dana Reyes",
    aeEmail: "dana@novacrm.com",
    aePhone: "+919110316645",
    opportunityUrl: null,
    gmailMessageId: "m1",
    stage: "received",
    rocketlaneProjectId: null,
    slackChannel: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "cli_fjord",
    name: "Fjord Studio",
    contactName: "Ines",
    contactEmail: "ines@fjord.co",
    aeName: "Marcus",
    aeEmail: "marcus@novacrm.com",
    aePhone: null,
    opportunityUrl: null,
    gmailMessageId: "m2",
    stage: "project",
    rocketlaneProjectId: "5000000226116",
    slackChannel: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "cli_delta",
    name: "Delta Freight",
    contactName: "Priya",
    contactEmail: "priya@delta.co",
    aeName: "Dana Reyes",
    aeEmail: "dana@novacrm.com",
    aePhone: null,
    opportunityUrl: null,
    gmailMessageId: "m3",
    stage: "comms",
    rocketlaneProjectId: "5000000226001",
    slackChannel: "#delta-freight-onboarding",
    createdAt: now,
    updatedAt: now,
  },
];

const traces: ToolTrace[] = [
  {
    id: "t1",
    clientId: "cli_acme",
    agent: "intake",
    tool: "state.read_client",
    status: "done",
    input: {},
    output: { name: "Acme Logistics" },
    error: null,
    createdAt: now,
    finishedAt: now,
  },
  {
    id: "t2",
    clientId: "cli_acme",
    agent: "intake",
    tool: "voice.call_ae",
    status: "running",
    input: { purpose: "confirm_tier" },
    output: null,
    error: null,
    createdAt: now,
    finishedAt: null,
  },
];

export default function ComponentsPage() {
  if (process.env.VERCEL) notFound();
  return (
    <div className="catalog desk">
      <div className="desk__head">
        <div>
          <h1>Components</h1>
          <p>Kanban, card, agent frame, tool trace.</p>
        </div>
      </div>

      <section>
        <h2>Client card</h2>
        <div style={{ maxWidth: 280 }}>
          <ClientCard client={samples[0]!} />
        </div>
      </section>

      <section>
        <h2>Kanban</h2>
        <Kanban clients={samples} />
      </section>

      <section>
        <h2>Agent frame + trace</h2>
        <AgentFrame name="Acme Logistics" agent="intake">
          <TraceList rows={traces} text="Calling Dana to confirm Enterprise or Growth." />
        </AgentFrame>
      </section>
    </div>
  );
}
