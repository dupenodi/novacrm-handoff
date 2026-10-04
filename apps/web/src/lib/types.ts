/** Records shared by the server and the browser. Field names are the camelCase form of the columns. */

export type AgentName = "intake" | "comms";

/** One line of an AE call transcript. */
export type VoiceTurn = {
  speaker: "nova" | "ae" | "other";
  text: string;
  at?: string;
};

/** `intake` / `comms`: that agent is working. `attention`: stopped and waiting for a person. */
export type DealStatus = "new" | "intake" | "comms" | "attention" | "done";

export type Email = {
  id: string;
  threadId: string | null;
  sender: string | null;
  subject: string | null;
  body: string | null;
  receivedAt: string | null;
  /** `duplicate`: another handoff for a customer that already has an onboarding; it joins that deal. */
  verdict: "deal" | "reply" | "duplicate" | "ignored";
  reason: string | null;
  dealId: string | null;
  createdAt: string;
};

export type Deal = {
  id: string;
  status: DealStatus;
  attention: string | null;
  emailId: string;
  customerName: string | null;
  /** The customer name normalized for matching (see `customerKey`). Unique across deals. */
  customerKey: string | null;
  contactName: string | null;
  contactEmail: string | null;
  aeName: string | null;
  aeEmail: string | null;
  aePhone: string | null;
  opportunityUrl: string | null;
  /** The plan the AE picked on the call: the name of a Rocketlane project template. */
  planName: string | null;
  planQuote: string | null;
  planConfirmedAt: string | null;
  rocketlaneProjectId: string | null;
  rocketlaneProjectName: string | null;
  rocketlaneTemplateId: string | null;
  rocketlaneTemplateName: string | null;
  projectStartDate: string | null;
  projectDueDate: string | null;
  slackChannelId: string | null;
  slackChannelName: string | null;
  slackSimulated: boolean;
  slackWelcomeAt: string | null;
  /** When the customer contact was emailed about their onboarding channel. */
  customerEmailedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RunStatus = "running" | "done" | "attention";

export type Run = {
  id: string;
  dealId: string;
  agent: AgentName;
  status: RunStatus;
  summary: string | null;
  startedAt: string;
  finishedAt: string | null;
};

type StepStatus = "running" | "done" | "failed";

export type Step = {
  id: string;
  seq: number;
  runId: string;
  dealId: string;
  kind: "tool" | "note";
  tool: string | null;
  title: string;
  why: string | null;
  status: StepStatus;
  input: unknown;
  output: unknown;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
};

/** Everything the deal page renders. */
export type DealView = {
  deal: Deal;
  email: Email | null;
  /** Later emails for this deal: replies on its thread and other handoffs for the same customer. */
  replies: Email[];
  runs: Run[];
  steps: Step[];
  /** Deep link to the Rocketlane project, when ROCKETLANE_APP_URL is set. */
  rocketlaneUrl: string | null;
};

/** A deal as the sidebar lists it. */
export type DealSummary = Pick<
  Deal,
  "id" | "status" | "customerName" | "planName" | "attention" | "createdAt" | "updatedAt"
> & { subject: string | null };

export type InboxWatch = {
  gmail: { connected: boolean; account: string | null };
  /** A Composio new-mail trigger is active and pointed at this app. */
  watching: boolean;
  /** Turning on the trigger needs a public URL for Composio to call. */
  canWatch: boolean;
  lastCheckedAt: string | null;
};

export type InboxCheckResult = {
  checked: number;
  newDeals: Array<{ id: string; customerName: string | null }>;
  ignored: number;
};

export const AGENT_LABEL: Record<AgentName, string> = {
  intake: "Intake agent",
  comms: "Communication agent",
};

/** Details read from the handoff email. */
export type DealField =
  | "customerName"
  | "contactName"
  | "contactEmail"
  | "aeName"
  | "aeEmail"
  | "aePhone"
  | "opportunityUrl";

export const FIELD_LABEL: Record<DealField, string> = {
  customerName: "Customer",
  contactName: "Customer contact",
  contactEmail: "Contact email",
  aeName: "Account executive",
  aeEmail: "AE email",
  aePhone: "AE phone",
  opportunityUrl: "Salesforce opportunity",
};

/** What a voice call to the AE came back with. */
export type CallOutcome =
  | "confirmed"
  | "ambiguous"
  | "callback_requested"
  | "wrong_person"
  | "deal_not_closed"
  | "declined"
  | "no_answer"
  /** The AE picked up, but the call ended before the plan came up (often Nova couldn't hear them). */
  | "cut_off"
  | "busy"
  | "failed";
