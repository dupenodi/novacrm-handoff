import "server-only";
import { jsonSchema, tool, type Tool } from "ai";
import { errorMessage } from "../util";
import { toolsForAgent } from "./registry";
import { getSession, recordToolFinish, recordToolStart, saveSessionState } from "./sessions";
import type { AgentSession, ToolDefinition, ToolName } from "./types";

/** Model-facing tool names can't contain dots. */
export function toAiToolName(name: ToolName): string {
  return name.replace(/\./g, "_");
}

/** Wraps the agent's tools for the AI SDK, keyed by their model-facing name. */
export function buildAiSdkTools(session: AgentSession): Record<string, Tool> {
  return Object.fromEntries(
    toolsForAgent(session.agent).map((def) => [
      toAiToolName(def.name),
      tool({
        description: def.description,
        inputSchema: jsonSchema(def.inputSchema as Parameters<typeof jsonSchema>[0]),
        execute: (input) => runTool(def, session.id, input),
      }),
    ]),
  );
}

/** Runs one tool call against fresh session state, logging it and saving the state afterwards. */
async function runTool(def: ToolDefinition, sessionId: string, input: unknown): Promise<unknown> {
  const session = await getSession(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  const ctx = { clientId: session.clientId, sessionId, agent: session.agent, state: session.state };
  const invocationId = await recordToolStart({
    sessionId,
    clientId: session.clientId,
    agent: session.agent,
    tool: def.name,
    args: input,
  });

  try {
    const output = await def.execute(input, ctx);
    await saveSessionState(sessionId, ctx.state);
    await recordToolFinish(invocationId, { output, status: "done" });
    return output;
  } catch (error) {
    await recordToolFinish(invocationId, { error: errorMessage(error, String(error)), status: "failed" });
    throw error;
  }
}
