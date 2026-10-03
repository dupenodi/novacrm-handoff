import type { AgentName, Client } from "@/lib/clients";

export type { AgentName };

export type ToolName =
  | "gmail.fetch_recent"
  | "gmail.get_message"
  | "gmail.reply"
  | "llm.extract_deal"
  | "salesforce.get_opportunity"
  | "salesforce.search_account"
  | "voice.call_ae"
  | "rocketlane.list_projects"
  | "rocketlane.create_project"
  | "slack.create_channel"
  | "slack.post_message"
  | "state.read_client"
  | "state.write_client";

export type JsonSchema = Record<string, unknown>;

export type ToolContext = {
  clientId: string;
  sessionId: string;
  agent: AgentName;
  /** Session scratchpad, saved after every tool call. */
  state: Record<string, unknown>;
};

export type ToolDefinition<TInput = unknown, TOutput = unknown> = {
  name: ToolName;
  description: string;
  agents: AgentName[] | "*";
  inputSchema: JsonSchema;
  composioSlug?: string;
  execute(input: TInput, ctx: ToolContext): Promise<TOutput>;
};

export type AgentDefinition = {
  name: AgentName;
  displayName: string;
  systemPrompt: string;
  tools: ToolName[];
  model?: string;
  /** Kickoff message built from the client record. */
  prompt(client: Client): string;
};

export type SessionStatus = "active" | "completed" | "failed";

export type AgentSession = {
  id: string;
  clientId: string;
  agent: AgentName;
  status: SessionStatus;
  state: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
