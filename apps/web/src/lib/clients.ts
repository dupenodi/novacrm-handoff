export type PlanTier = "growth" | "enterprise";

export type ClientStage = "received" | "project" | "comms";

export type AgentName = "intake" | "comms";

export type VoiceTurn = {
  speaker: "nova" | "ae" | "other";
  text: string;
  at?: string;
};

export type Client = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  aeName: string | null;
  aeEmail: string | null;
  aePhone: string | null;
  opportunityUrl: string | null;
  gmailMessageId: string | null;
  stage: ClientStage;
  rocketlaneProjectId: string | null;
  slackChannel: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ToolTrace = {
  id: string;
  clientId: string;
  agent: AgentName;
  tool: string;
  status: string;
  input: unknown;
  output: unknown;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
};

export const STAGES: { id: ClientStage; label: string }[] = [
  { id: "received", label: "Received" },
  { id: "project", label: "Project created" },
  { id: "comms", label: "Comms setup" },
];

/** The stage a client must be in for each agent to run. */
export const AGENT_START_STAGE: Record<AgentName, ClientStage> = {
  intake: "received",
  comms: "project",
};

export const AGENT_NAMES = Object.keys(AGENT_START_STAGE) as AgentName[];

export function isAgentName(value: string): value is AgentName {
  return value in AGENT_START_STAGE;
}

export function canRunAgent(agent: AgentName, stage: ClientStage): boolean {
  return AGENT_START_STAGE[agent] === stage;
}

/** The next agent to kick off for a client, if any. */
export function ctaFor(stage: ClientStage): { href: AgentName; label: string } | null {
  if (stage === "received") return { href: "intake", label: "Kick off intake" };
  if (stage === "project") return { href: "comms", label: "Kick off comms" };
  return null;
}
