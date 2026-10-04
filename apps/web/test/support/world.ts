/**
 * Everything the fakes share: the database rows and the state of each outside service. Tests set
 * it up through the helpers below and read it back to check what the agents did. Reset before each test.
 */

export type MailFixture = {
  id: string;
  threadId: string;
  sender: string;
  subject: string;
  body: string;
  receivedAt: string;
};

/** What the fake Sarvam call returns for one call: the agent's extracted variables and a transcript. */
export type CallScript = {
  connectivity?: "connected" | "no_answer" | "busy" | "failed";
  vars?: {
    plan?: string;
    confidence?: string;
    ae_quote?: string;
    call_outcome?: string;
    callback_time?: string;
    notes?: string;
    company_name?: string;
    contact_name?: string;
    contact_email?: string;
  };
  transcript?: Array<{ role: "agent" | "user"; text: string }>;
};

export type RocketlaneTemplate = {
  templateId: number;
  name: string;
  workingDays: number;
  phases: Array<{ name: string; tasks: number }>;
  /** A named person the customer-success tasks are assigned to (a dedicated CSM); otherwise teams only. */
  csm?: { userId: number; firstName: string; lastName: string; emailId: string };
};

function freshWorld() {
  return {
    tables: new Map<string, Map<string, Record<string, unknown>>>(),
    gmail: {
      inbox: [] as MailFixture[],
      replies: [] as Array<{ threadId: string; to: string; subject?: string; body: string }>,
      sent: [] as Array<{ to: string; cc: string[]; subject: string; body: string }>,
    },
    rocketlane: {
      templates: [] as RocketlaneTemplate[],
      companies: [] as Array<{ id: number; name: string }>,
      projects: [] as Array<{
        projectId: number;
        projectName: string;
        companyId: number;
        templateId: number | null;
        startDate: string;
        dueDate: string;
        archived: boolean;
      }>,
    },
    slack: {
      channels: [] as Array<{ id: string; name: string; topic: string }>,
      messages: [] as Array<{ channel: string; text: string }>,
    },
    sarvam: {
      /** Calls answer in order; the last script repeats if there are more calls than scripts. */
      scripts: [] as CallScript[],
      placed: [] as Array<{
        attemptId: string;
        phone: string;
        aeName: string;
        customerName: string;
        planOptions: string;
        missingDetails: string;
      }>,
    },
    /** Composio tool slug → how many upcoming calls fail with a 500. */
    failures: new Map<string, number>(),
    /** Work scheduled with Next's `after()`. */
    background: [] as Array<Promise<unknown>>,
    nextId: 1,
  };
}

export let world = freshWorld();

export function resetWorld(): void {
  world = freshWorld();
}

export function table(name: string): Map<string, Record<string, unknown>> {
  let rows = world.tables.get(name);
  if (!rows) {
    rows = new Map();
    world.tables.set(name, rows);
  }
  return rows;
}

export function rows<T = Record<string, unknown>>(name: string): T[] {
  return [...table(name).values()] as T[];
}

/** Waits until every background agent run (and anything it scheduled) has finished. */
export async function settle(): Promise<void> {
  while (world.background.length) {
    const pending = world.background.splice(0);
    await Promise.all(pending);
  }
}

// —— Fixtures ——————————————————————————————————————————————————————————————

/** The templates the real Rocketlane workspace has. Enterprise assigns its CSM work to a named person. */
export const GROWTH_TEMPLATE: RocketlaneTemplate = {
  templateId: 5000000098069,
  name: "Growth Onboarding · 14 days",
  workingDays: 10,
  phases: [
    { name: "Kickoff &amp; Readiness", tasks: 5 },
    { name: "Solutioning &amp; Planning", tasks: 4 },
    { name: "Implementation", tasks: 6 },
    { name: "Go-live &amp; Value Delivery", tasks: 8 },
  ],
};

export const ENTERPRISE_TEMPLATE: RocketlaneTemplate = {
  templateId: 5000000098075,
  name: "Enterprise Onboarding · 30 days",
  workingDays: 21,
  phases: GROWTH_TEMPLATE.phases,
  csm: { userId: 5000000167049, firstName: "Paul", lastName: "Mathew", emailId: "sampleuser2@rocketlane.com" },
};

/** Same working days as Enterprise, so the plan can't be worked out from length. */
export const MID_MARKET_TEMPLATE: RocketlaneTemplate = {
  templateId: 5000000098538,
  name: "Mid Market Onboarding · 24 days",
  workingDays: 21,
  phases: GROWTH_TEMPLATE.phases,
};

export function useRealTemplates(): void {
  world.rocketlane.templates = [GROWTH_TEMPLATE, ENTERPRISE_TEMPLATE, MID_MARKET_TEMPLATE];
}

let mailCounter = 0;

/** A deal handoff email from an AE, in the format AEs actually send. Override any line. */
export function handoffEmail(
  overrides: Partial<{
    customer: string | null;
    contact: string | null;
    contactEmail: string | null;
    aePhone: string | null;
    subject: string;
    threadId: string;
    sender: string;
  }> = {},
): MailFixture {
  mailCounter += 1;
  const field = (label: string, value: string | null | undefined, fallback: string) =>
    value === null ? null : `${label}: ${value ?? fallback}`;
  const lines = [
    "CS handoff — deal is closed-won.",
    "",
    field("Customer", overrides.customer, "Initech"),
    field("Contact", overrides.contact, "Bill Lumbergh"),
    field("Contact email", overrides.contactEmail, "bill@initech.com"),
    "",
    "Please start onboarding for this customer.",
    "",
    "Best,",
    "Jordan Lee",
    overrides.aePhone === null ? null : (overrides.aePhone ?? "+919876543210"),
  ].filter((line): line is string => line !== null);
  return {
    id: `msg${mailCounter}`,
    threadId: overrides.threadId ?? `thread${mailCounter}`,
    sender: overrides.sender ?? "Jordan Lee <jordan@novacrm.com>",
    subject: overrides.subject ?? `Closed-won — ${overrides.customer ?? "Initech"}`,
    body: lines.join("\n"),
    receivedAt: new Date(Date.UTC(2026, 9, 5, 9, mailCounter)).toISOString(),
  };
}

export function receive(...emails: MailFixture[]): void {
  world.gmail.inbox.push(...emails);
}

/** The AE clearly picks one of the plans offered, and gives any details they were asked for. */
export function aeConfirms(template: RocketlaneTemplate, details: CallScript["vars"] = {}): CallScript {
  return {
    vars: { plan: template.name, confidence: "explicit", ae_quote: `They're on ${template.name}.`, call_outcome: "plan_confirmed", ...details },
    transcript: [
      { role: "agent", text: "Which plan did they sign?" },
      { role: "user", text: `They're on ${template.name}.` },
    ],
  };
}

export const AE_NO_ANSWER: CallScript = { connectivity: "no_answer" };

export const AE_UNSURE: CallScript = {
  vars: { plan: "unknown", confidence: "ambiguous", ae_quote: "Maybe Growth? I'd have to check.", call_outcome: "ae_unsure" },
  transcript: [
    { role: "agent", text: "Which plan did they sign, Growth or Enterprise?" },
    { role: "user", text: "Maybe Growth? I'd have to check." },
  ],
};

/** The AE picks up, but Nova can't hear the rest. */
export const CALL_CUT_OFF: CallScript = {
  vars: { plan: "unknown", confidence: "none", call_outcome: "no_conversation", notes: "No meaningful conversation." },
  transcript: [
    { role: "agent", text: "Hi, am I speaking with Jordan?" },
    { role: "user", text: "Yes, who is this?" },
    { role: "agent", text: "Are you still there?" },
  ],
};

export function scriptCalls(...scripts: CallScript[]): void {
  world.sarvam.scripts = scripts;
}

export function failNext(slug: string, times = 1): void {
  world.failures.set(slug, times);
}
