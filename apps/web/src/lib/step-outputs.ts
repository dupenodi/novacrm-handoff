import type { CallOutcome, DealField, VoiceTurn } from "./types";

/** What each agent tool returns. The server writes these to a step's `output`; the UI renders them. */

export type ReadEmailOutput = {
  fields: Record<DealField, string | null>;
  /** Required details the email doesn't give, or gives in a form we can't use. */
  missing: DealField[];
};

/** One call to the AE. */
export type CallAttempt = {
  attempt: number;
  outcome: CallOutcome;
  notes: string | null;
  transcript: VoiceTurn[];
};

/** The last call placed, plus any earlier calls in the same step (the tool redials on its own). */
export type CallOutput = {
  outcome: CallOutcome;
  /** The plans offered on the call: the names of Rocketlane templates. */
  options: string[];
  /** The option the AE picked, exactly as offered, when the plan was confirmed. */
  plan: string | null;
  /** Details that were missing from the email and the AE gave on the call. */
  collected: Partial<Record<DealField, string>>;
  /** Details still missing after the call. */
  stillMissing: DealField[];
  quote: string | null;
  callbackTime: string | null;
  notes: string | null;
  /** Masked, e.g. "•••• 3210". */
  phone: string;
  attempt: number;
  transcript: VoiceTurn[];
  failureReason: string | null;
  earlier: CallAttempt[];
};

/** Written to a call step while it's still running, so the UI can tell a live call from "waiting to call again". */
export type CallProgress = {
  phase: "calling" | "retrying";
  attempt: number;
  earlier: CallAttempt[];
};

/**
 * Who works the customer's onboarding, read from the template's task assignments: a named person
 * means a dedicated CSM; teams only means a pooled CSM team.
 */
export type Staffing = { model: "dedicated"; csm: string } | { model: "pooled" };

/** A Rocketlane project template, as read from Rocketlane. */
export type TemplateSummary = {
  templateId: string;
  name: string;
  staffing: Staffing;
  /** Rocketlane plans templates in working days. */
  workingDays: number;
  /** The same timeline on the calendar, weekends included. */
  calendarDays: number;
  phases: Array<{ name: string; taskCount: number }>;
  taskCount: number;
};

export type TemplatesOutput = {
  templates: TemplateSummary[];
};

export type ProjectOutput = {
  projectId: string;
  projectName: string;
  plan: string;
  startDate: string;
  dueDate: string;
  template: TemplateSummary;
};

/** What the Communication agent works from: the deal plus the live project template. */
export type OnboardingDetailsOutput = {
  customerName: string;
  contactName: string;
  contactEmail: string;
  aeName: string;
  plan: string;
  projectName: string;
  startDate: string | null;
  dueDate: string | null;
  template: TemplateSummary;
};

export type CustomerEmailOutput = {
  to: string;
  cc: string[];
  subject: string;
  body: string;
};

export type ChannelOutput = {
  channelId: string;
  name: string;
  topic: string;
  simulated: boolean;
};

export type WelcomeOutput = {
  channelName: string;
  text: string;
  simulated: boolean;
};

export type ToolOutputs = {
  read_handoff_email: ReadEmailOutput;
  call_ae_to_confirm_plan: CallOutput;
  list_project_templates: TemplatesOutput;
  create_rocketlane_project: ProjectOutput;
  get_onboarding_details: OnboardingDetailsOutput;
  create_slack_channel: ChannelOutput;
  post_welcome_message: WelcomeOutput;
  email_customer: CustomerEmailOutput;
};

export type ToolName = keyof ToolOutputs;
