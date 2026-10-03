import "server-only";
import { stepCountIs, streamText } from "ai";
import type { Client } from "@/lib/clients";
import { encodeAgentEvent, type AgentEvent } from "@/lib/agent-events";
import { errorMessage } from "../util";
import { buildAiSdkTools, toAiToolName } from "./ai-tools";
import { getLanguageModel } from "./model";
import { getAgent, toolsForAgent } from "./registry";
import { createSession, latestSession, setSessionStatus } from "./sessions";
import type { AgentName, AgentSession } from "./types";
import "./tools/register";

/** Reuses the client's active session for this agent, or starts a new one. */
async function activeSession(clientId: string, agent: AgentName): Promise<AgentSession> {
  const latest = await latestSession(clientId, agent);
  if (latest?.status === "active") return latest;
  return createSession(clientId, agent, { clientId });
}

/** Runs the agent for a client and streams its text and tool activity as SSE. */
export async function streamAgent(opts: {
  client: Client;
  agent: AgentName;
  maxSteps?: number;
}): Promise<ReadableStream<Uint8Array>> {
  const definition = getAgent(opts.agent);
  const session = await activeSession(opts.client.id, opts.agent);
  const toolNames = new Map(toolsForAgent(opts.agent).map((def) => [toAiToolName(def.name), def.name]));

  const result = streamText({
    model: getLanguageModel(definition.model),
    system: definition.systemPrompt,
    prompt: definition.prompt(opts.client),
    tools: buildAiSdkTools(session),
    stopWhen: stepCountIs(opts.maxSteps ?? 12),
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const send = (event: AgentEvent) => controller.enqueue(encoder.encode(encodeAgentEvent(event)));
      try {
        for await (const chunk of result.fullStream) {
          if (chunk.type === "text-delta") {
            send({ type: "text", text: chunk.text });
          } else if (chunk.type === "tool-call" || chunk.type === "tool-result") {
            send({
              type: "tool",
              tool: toolNames.get(chunk.toolName) ?? chunk.toolName,
              status: chunk.type === "tool-call" ? "running" : "done",
              input: chunk.input,
              output: chunk.type === "tool-result" ? chunk.output : undefined,
            });
          }
        }
        await setSessionStatus(session.id, "completed");
        send({ type: "done" });
      } catch (error) {
        await setSessionStatus(session.id, "failed");
        send({ type: "error", error: errorMessage(error, "Agent failed") });
      } finally {
        controller.close();
      }
    },
  });
}
