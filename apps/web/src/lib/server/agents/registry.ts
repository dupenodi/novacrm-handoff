import "server-only";
import type { AgentDefinition, AgentName, ToolDefinition, ToolName } from "./types";
import { intakeAgent } from "./intake/definition";
import { commsAgent } from "./comms/definition";

const AGENTS: Record<AgentName, AgentDefinition> = {
  intake: intakeAgent,
  comms: commsAgent,
};

const tools = new Map<ToolName, ToolDefinition>();

export function registerTool<TInput, TOutput>(tool: ToolDefinition<TInput, TOutput>): void {
  tools.set(tool.name, tool as ToolDefinition);
}

export function listTools(): ToolDefinition[] {
  return [...tools.values()];
}

export function getAgent(name: AgentName): AgentDefinition {
  const agent = AGENTS[name];
  if (!agent) throw new Error(`Unknown agent: ${name}`);
  return agent;
}

export function listAgents(): AgentDefinition[] {
  return Object.values(AGENTS);
}

/** The agent's declared tools that are registered and allowed for it. */
export function toolsForAgent(name: AgentName): ToolDefinition[] {
  return getAgent(name)
    .tools.map((toolName) => tools.get(toolName))
    .filter((tool): tool is ToolDefinition => tool !== undefined)
    .filter((tool) => tool.agents === "*" || tool.agents.includes(name));
}
