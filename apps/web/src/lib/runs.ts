/**
 * View model for onboarding runs. The sample data below stands in for the run store
 * until the agents are wired up; pages read only through the functions at the bottom.
 */

export type PlanTier = "enterprise" | "growth";

export type RunStage =
  | "received"
  | "awaiting_tier"
  | "creating_project"
  | "creating_channel"
  | "completed"
  | "needs_human"
  | "failed";

export type StepState = "queued" | "running" | "done" | "empty" | "failed" | "skipped" | "needs-you";

export type AgentName = "intake" | "communication";

export type RunStep = {
  agent: AgentName;
  human: string;
  state: StepState;
  at: string;
  duration?: string;
  out?: string;
  why?: string;
  raw?: string;
};

export type Escalation = {
  tag: string;
  title: string;
  body: string;
  kept: string;
};

export type OnboardingRun = {
  id: string;
  customer: { name: string; contactName: string; contactEmail: string | null };
  ae: { name: string; email: string; phone: string };
  opportunityUrl: string | null;
  tier: PlanTier | null;
  stage: RunStage;
  receivedAt: string;
  updatedAt: string;
  rocketlaneProjectId: string | null;
  slackChannel: string | null;
  callAttempts: number;
  steps: RunStep[];
  escalation: Escalation | null;
};

export type AuditEntry = {
  id: string;
  at: string;
  runId: string;
  customer: string;
  agent: AgentName;
  action: string;
  input: string;
  output: string;
  rationale: string;
};

export const TIER_POLICY: Record<PlanTier, { label: string; durationDays: number; csm: string; template: string }> = {
  enterprise: { label: "Enterprise", durationDays: 30, csm: "Dedicated CSM", template: "Enterprise Onboarding · 30 days" },
  growth: { label: "Growth", durationDays: 14, csm: "Pooled CSM", template: "Growth Onboarding · 14 days" },
};

export const STAGE_LABEL: Record<RunStage, string> = {
  received: "Received",
  awaiting_tier: "Awaiting tier",
  creating_project: "Creating project",
  creating_channel: "Creating channel",
  completed: "Completed",
  needs_human: "Needs human",
  failed: "Rejected",
};

export const PIPELINE: RunStage[] = ["received", "awaiting_tier", "creating_project", "creating_channel", "completed"];

const RUNS: OnboardingRun[] = [
  {
    id: "run_acme",
    customer: { name: "Acme Logistics", contactName: "Jordan Lee", contactEmail: "jordan.lee@acmelogistics.com" },
    ae: { name: "Dana Reyes", email: "dana.reyes@novacrm.com", phone: "+1 415 555 0142" },
    opportunityUrl: "https://novacrm.my.salesforce.com/006Hs00001AcmeQ",
    tier: "enterprise",
    stage: "completed",
    receivedAt: "Oct 2, 09:12",
    updatedAt: "Oct 2, 09:19",
    rocketlaneProjectId: "RL-48213",
    slackChannel: "#acme-logistics-onboarding",
    callAttempts: 1,
    escalation: null,
    steps: [
      { agent: "intake", human: "Picked up the deal email from Dana", state: "done", at: "09:12:04", duration: "0.4s", out: "Subject: Closed-won — Acme Logistics", raw: 'gmail.trigger("GMAIL_NEW_GMAIL_MESSAGE")' },
      { agent: "intake", human: "Read the customer, contact and AE from the email", state: "done", at: "09:12:06", duration: "1.8s", out: "Acme Logistics · Jordan Lee <jordan.lee@acmelogistics.com> · AE Dana Reyes", raw: "llm.extract(DealNotification)" },
      { agent: "intake", human: "Checked every required field is present", state: "done", at: "09:12:06", duration: "2ms", out: "5 of 5 required fields present", why: "Guardrail: never guess missing fields." },
      { agent: "intake", human: "Called Dana to confirm the plan tier", state: "done", at: "09:12:41", duration: "48s", out: "“Yeah, they signed Enterprise — the annual deal.” → Enterprise", why: "The email never states the tier, so the AE must confirm it verbally.", raw: "sarvam.outbounds.create({ user_phone_number: '+1 415 555 0142' })" },
      { agent: "intake", human: "Checked Acme has no onboarding project already", state: "done", at: "09:13:31", duration: "0.6s", out: "No existing project", raw: 'ROCKETLANE_LIST_PROJECTS({ customer: "Acme Logistics" })' },
      { agent: "intake", human: "Created the Rocketlane project from the Enterprise template", state: "done", at: "09:13:34", duration: "2.9s", out: "RL-48213 · 30 days · dedicated CSM · 4 phases, 15 tasks", why: "Enterprise → 30-day template with a dedicated CSM.", raw: "ROCKETLANE_CREATE_PROJECT({ templateId: ENTERPRISE })" },
      { agent: "communication", human: "Opened a shared Slack channel and posted the welcome", state: "done", at: "09:13:40", duration: "1.2s", out: "#acme-logistics-onboarding · topic: Enterprise onboarding · 30 days", raw: "slack.createChannel (mock)" },
    ],
  },
  {
    id: "run_brightline",
    customer: { name: "Brightline Health", contactName: "Sam Okafor", contactEmail: "sam@brightlinehealth.io" },
    ae: { name: "Marcus Chen", email: "marcus.chen@novacrm.com", phone: "+1 646 555 0198" },
    opportunityUrl: "https://novacrm.my.salesforce.com/006Hs00001BrtlN",
    tier: null,
    stage: "awaiting_tier",
    receivedAt: "Oct 2, 10:03",
    updatedAt: "Oct 2, 10:06",
    rocketlaneProjectId: null,
    slackChannel: null,
    callAttempts: 1,
    escalation: null,
    steps: [
      { agent: "intake", human: "Picked up the deal email from Marcus", state: "done", at: "10:03:11", duration: "0.3s" },
      { agent: "intake", human: "Read the customer, contact and AE from the email", state: "done", at: "10:03:13", duration: "1.6s", out: "Brightline Health · Sam Okafor <sam@brightlinehealth.io> · AE Marcus Chen" },
      { agent: "intake", human: "Checked every required field is present", state: "done", at: "10:03:13", duration: "2ms", out: "5 of 5 required fields present" },
      { agent: "intake", human: "Called Marcus to confirm the plan tier", state: "empty", at: "10:04:02", duration: "30s", out: "No answer · voicemail not left", why: "No answer is not a tier. Retrying instead of assuming." },
      { agent: "intake", human: "Retry call 2 of 3", state: "queued", at: "10:06:02", out: "Scheduled in 2 min" },
    ],
  },
  {
    id: "run_corvid",
    customer: { name: "Corvid Analytics", contactName: "Priya Nair", contactEmail: "priya@corvid.ai" },
    ae: { name: "Dana Reyes", email: "dana.reyes@novacrm.com", phone: "+1 415 555 0142" },
    opportunityUrl: "https://novacrm.my.salesforce.com/006Hs00001CrvdA",
    tier: null,
    stage: "needs_human",
    receivedAt: "Oct 1, 16:40",
    updatedAt: "Oct 1, 16:52",
    rocketlaneProjectId: null,
    slackChannel: null,
    callAttempts: 3,
    escalation: {
      tag: "tier unclear",
      title: "Dana couldn't confirm Corvid's plan tier",
      body: "Three calls, no clear answer. Last reply: “I think it's the bigger one? Let me check the order form.”",
      kept: "Parsed deal details are kept. No project or channel was created.",
    },
    steps: [
      { agent: "intake", human: "Picked up the deal email from Dana", state: "done", at: "16:40:02", duration: "0.4s" },
      { agent: "intake", human: "Read the customer, contact and AE from the email", state: "done", at: "16:40:04", duration: "1.7s" },
      { agent: "intake", human: "Checked every required field is present", state: "done", at: "16:40:04", duration: "2ms" },
      { agent: "intake", human: "Call 1: asked Dana for the plan tier", state: "empty", at: "16:40:39", duration: "41s", out: "“Uh, one of the paid ones.” → ambiguous" },
      { agent: "intake", human: "Call 2: asked Dana for the plan tier", state: "empty", at: "16:46:12", duration: "37s", out: "“Could be Growth, could be more.” → ambiguous" },
      { agent: "intake", human: "Call 3: asked Dana for the plan tier", state: "empty", at: "16:51:20", duration: "52s", out: "“I think it's the bigger one?” → ambiguous" },
      { agent: "intake", human: "Escalated to the CS lead", state: "needs-you", at: "16:52:13", why: "Guardrail: never assume a tier. Retries exhausted, so a human decides." },
    ],
  },
  {
    id: "run_delta",
    customer: { name: "Delta Freight", contactName: "—", contactEmail: null },
    ae: { name: "Ines Alvarez", email: "ines.alvarez@novacrm.com", phone: "+1 312 555 0117" },
    opportunityUrl: null,
    tier: null,
    stage: "failed",
    receivedAt: "Oct 2, 08:27",
    updatedAt: "Oct 2, 08:27",
    rocketlaneProjectId: null,
    slackChannel: null,
    callAttempts: 0,
    escalation: {
      tag: "missing fields",
      title: "Delta Freight's email is missing required details",
      body: "No customer contact email and no Salesforce link. Asked Ines to resend with both.",
      kept: "Nothing was created. The run restarts when Ines replies.",
    },
    steps: [
      { agent: "intake", human: "Picked up the deal email from Ines", state: "done", at: "08:27:40", duration: "0.3s" },
      { agent: "intake", human: "Read the customer, contact and AE from the email", state: "done", at: "08:27:42", duration: "1.5s", out: "Delta Freight · contact: — · AE Ines Alvarez" },
      { agent: "intake", human: "Checked every required field is present", state: "failed", at: "08:27:42", duration: "2ms", out: "Missing: customer contact email, opportunity link", why: "Guardrail: ask, don't guess." },
      { agent: "intake", human: "Emailed Ines asking for the missing details", state: "done", at: "08:27:44", duration: "0.9s", raw: "GMAIL_REPLY_TO_THREAD" },
      { agent: "intake", human: "Plan-tier call", state: "skipped", at: "08:27:44", why: "Not attempted until the email is complete." },
    ],
  },
  {
    id: "run_evergreen",
    customer: { name: "Evergreen Retail", contactName: "Hana Sato", contactEmail: "hana.sato@evergreenretail.com" },
    ae: { name: "Marcus Chen", email: "marcus.chen@novacrm.com", phone: "+1 646 555 0198" },
    opportunityUrl: "https://novacrm.my.salesforce.com/006Hs00001EvgrR",
    tier: "growth",
    stage: "creating_project",
    receivedAt: "Oct 2, 10:21",
    updatedAt: "Oct 2, 10:24",
    rocketlaneProjectId: null,
    slackChannel: null,
    callAttempts: 1,
    escalation: null,
    steps: [
      { agent: "intake", human: "Picked up the deal email from Marcus", state: "done", at: "10:21:09", duration: "0.3s" },
      { agent: "intake", human: "Read the customer, contact and AE from the email", state: "done", at: "10:21:11", duration: "1.9s" },
      { agent: "intake", human: "Checked every required field is present", state: "done", at: "10:21:11", duration: "2ms" },
      { agent: "intake", human: "Called Marcus to confirm the plan tier", state: "done", at: "10:22:02", duration: "34s", out: "“Growth plan, fourteen-day onboarding.” → Growth" },
      { agent: "intake", human: "Created the Rocketlane project from the Growth template", state: "failed", at: "10:22:40", duration: "15s", out: "Rocketlane returned 503 Service Unavailable", why: "Retrying with backoff. The confirmed tier is kept, so no second call is needed." },
      { agent: "intake", human: "Retry project creation (2 of 3)", state: "running", at: "10:24:10" },
    ],
  },
  {
    id: "run_fjord",
    customer: { name: "Fjord Studio", contactName: "Elin Berg", contactEmail: "elin@fjord.studio" },
    ae: { name: "Ines Alvarez", email: "ines.alvarez@novacrm.com", phone: "+1 312 555 0117" },
    opportunityUrl: "https://novacrm.my.salesforce.com/006Hs00001FjrdS",
    tier: "growth",
    stage: "completed",
    receivedAt: "Sep 30, 14:55",
    updatedAt: "Sep 30, 15:01",
    rocketlaneProjectId: "RL-48177",
    slackChannel: "#fjord-studio-onboarding",
    callAttempts: 2,
    escalation: null,
    steps: [
      { agent: "intake", human: "Picked up the deal email from Ines", state: "done", at: "14:55:20", duration: "0.4s" },
      { agent: "intake", human: "Read the customer, contact and AE from the email", state: "done", at: "14:55:22", duration: "1.6s" },
      { agent: "intake", human: "Checked every required field is present", state: "done", at: "14:55:22", duration: "2ms" },
      { agent: "intake", human: "Call 1: asked Ines for the plan tier", state: "empty", at: "14:56:01", duration: "30s", out: "No answer" },
      { agent: "intake", human: "Call 2: asked Ines for the plan tier", state: "done", at: "14:58:40", duration: "29s", out: "“It's Growth.” → Growth" },
      { agent: "intake", human: "Created the Rocketlane project from the Growth template", state: "done", at: "14:59:15", duration: "2.4s", out: "RL-48177 · 14 days · pooled CSM" },
      { agent: "communication", human: "Opened a shared Slack channel and posted the welcome", state: "done", at: "14:59:21", duration: "1.1s", out: "#fjord-studio-onboarding" },
    ],
  },
];

const AUDIT: AuditEntry[] = [
  { id: "a1", at: "Oct 2, 10:24:10", runId: "run_evergreen", customer: "Evergreen Retail", agent: "intake", action: "rocketlane.create_project.retry", input: "templateId=GROWTH, attempt=2", output: "in flight", rationale: "Previous attempt got a 503. Backoff 30s elapsed." },
  { id: "a2", at: "Oct 2, 10:22:40", runId: "run_evergreen", customer: "Evergreen Retail", agent: "intake", action: "rocketlane.create_project", input: "templateId=GROWTH, owner=cs-ops@novacrm.com", output: "503 Service Unavailable", rationale: "Tier confirmed as Growth on call 1." },
  { id: "a3", at: "Oct 2, 10:22:02", runId: "run_evergreen", customer: "Evergreen Retail", agent: "intake", action: "sarvam.call.result", input: "attempt_8f2a…", output: "tier=growth (confidence: explicit)", rationale: "AE said “Growth plan” with no hedging." },
  { id: "a4", at: "Oct 2, 10:04:02", runId: "run_brightline", customer: "Brightline Health", agent: "intake", action: "sarvam.call.result", input: "attempt_71c0…", output: "no-answer", rationale: "Scheduling retry 2 of 3 in 2 min. Tier stays unknown." },
  { id: "a5", at: "Oct 2, 09:13:40", runId: "run_acme", customer: "Acme Logistics", agent: "communication", action: "slack.create_channel", input: "name=acme-logistics-onboarding, tier=enterprise", output: "#acme-logistics-onboarding", rationale: "Enterprise welcome copy names the dedicated CSM." },
  { id: "a6", at: "Oct 2, 09:13:34", runId: "run_acme", customer: "Acme Logistics", agent: "intake", action: "rocketlane.create_project", input: "templateId=ENTERPRISE, durationDays=30", output: "RL-48213", rationale: "Tier confirmed as Enterprise. No existing project for Acme." },
  { id: "a7", at: "Oct 2, 08:27:44", runId: "run_delta", customer: "Delta Freight", agent: "intake", action: "gmail.reply", input: "thread=18c2…", output: "sent", rationale: "Missing contact email and opportunity link. Asked rather than guessed." },
  { id: "a8", at: "Oct 1, 16:52:13", runId: "run_corvid", customer: "Corvid Analytics", agent: "intake", action: "escalate", input: "attempts=3", output: "notified cs-lead@novacrm.com", rationale: "Three ambiguous answers. Never assume a tier." },
];

export function listRuns(): OnboardingRun[] {
  return RUNS;
}

export function findRun(id: string): OnboardingRun | undefined {
  return RUNS.find((run) => run.id === id);
}

export function listAudit(): AuditEntry[] {
  return AUDIT;
}

export function needsHuman(run: OnboardingRun): boolean {
  return run.stage === "needs_human" || run.stage === "failed";
}

export function inFlight(run: OnboardingRun): boolean {
  return !needsHuman(run) && run.stage !== "completed";
}
