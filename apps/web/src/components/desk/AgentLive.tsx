"use client";

import { useEffect, useRef, useState } from "react";
import { readAgentEvents, type AgentEvent } from "@/lib/agent-events";
import { canRunAgent, type AgentName, type Client, type ToolTrace } from "@/lib/clients";
import { errorText, requestJson } from "@/lib/request-json";
import { AgentFrame } from "./AgentFrame";
import { TraceList } from "./TraceList";

type ToolEvent = Extract<AgentEvent, { type: "tool" }>;

/** Adds a row when a tool starts; marks the latest running row for that tool done when it finishes. */
function applyToolEvent(rows: ToolTrace[], event: ToolEvent, client: Client, agent: AgentName): ToolTrace[] {
  const now = new Date().toISOString();
  if (event.status === "done") {
    const running = rows.findLast((row) => row.tool === event.tool && row.status === "running");
    if (running) {
      return rows.map((row) =>
        row.id === running.id ? { ...row, status: "done", output: event.output ?? null, finishedAt: now } : row,
      );
    }
  }
  return [
    ...rows,
    {
      id: `live_${rows.length}_${Date.now()}`,
      clientId: client.id,
      agent,
      tool: event.tool,
      status: event.status,
      input: event.input,
      output: event.output ?? null,
      error: null,
      createdAt: now,
      finishedAt: event.status === "done" ? now : null,
    },
  ];
}

async function startAgent(clientId: string, agent: AgentName): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`/api/clients/${clientId}/${agent}`, { method: "POST" });
  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Agent failed to start");
  }
  return response.body;
}

/** Runs the agent once when the client is at its start stage, streaming tool calls into the trace. */
export function AgentLive({ client, agent, initial }: { client: Client; agent: AgentName; initial: ToolTrace[] }) {
  const [rows, setRows] = useState<ToolTrace[]>(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // Strict mode runs effects twice; the agent must only start once.
    if (started.current || !canRunAgent(agent, client.stage)) return;
    started.current = true;

    async function run() {
      for await (const event of readAgentEvents(await startAgent(client.id, agent))) {
        if (event.type === "text") setText((prev) => prev + event.text);
        if (event.type === "tool") setRows((prev) => applyToolEvent(prev, event, client, agent));
        if (event.type === "error") setError(event.error);
      }
      // Swap the live rows for the persisted trace, which has inputs and errors.
      const saved = await requestJson<Record<AgentName, ToolTrace[]>>(`/api/clients/${client.id}`, {
        cache: "no-store",
      });
      setRows(saved[agent] ?? []);
    }

    run().catch((err: unknown) => setError(errorText(err, "Agent failed")));
  }, [agent, client]);

  return (
    <AgentFrame name={client.name} agent={agent}>
      {error ? <p className="g-err">{error}</p> : null}
      <TraceList rows={rows} text={text} />
    </AgentFrame>
  );
}
