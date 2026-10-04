import "server-only";
import { z } from "zod";
import type {
  CallAttempt,
  CallOutput,
  CallProgress,
  ProjectOutput,
  ReadEmailOutput,
  TemplatesOutput,
} from "@/lib/step-outputs";
import { FIELD_LABEL, type CallOutcome, type Deal, type DealField, type Email, type Step } from "@/lib/types";
import { DEMO_AE_PHONE } from "../config";
import { findRow, getRow, listRows } from "../db";
import { fetchThread, type MailMessage } from "../gmail";
import { extract } from "../llm";
import {
  createCompany,
  createProject as createRocketlaneProject,
  findCompany,
  getProjectTemplate,
  listCompanyProjects,
  listProjectTemplates,
} from "../rocketlane";
import { confirmPlan } from "../sarvam";
import { customerKey, firstName, isEmail, maskPhone, parseSender } from "../util";
import { defineTool, type Agent, type ToolContext } from "./framework";

const MAX_CALL_ATTEMPTS = 2;

/** Details the CS team can't start onboarding without. */
const REQUIRED: DealField[] = ["customerName", "contactName", "contactEmail", "aeName"];

/** Demos ring DEMO_AE_PHONE (your own handset); otherwise the number from the email. */
function aeDialNumber(deal: Deal): string | null {
  return DEMO_AE_PHONE || deal.aePhone?.trim() || null;
}

export function missingFields(deal: Deal): DealField[] {
  const missing = REQUIRED.filter((field) => !deal[field]?.trim());
  if (deal.contactEmail && !isEmail(deal.contactEmail)) missing.push("contactEmail");
  if (!aeDialNumber(deal)) missing.push("aePhone");
  return [...new Set(missing)];
}

/** How many times this run has called `tool`, optionally only with a given result. */
function timesRun(steps: Step[], tool: string, status?: Step["status"]): number {
  return steps.filter((step) => step.tool === tool && (!status || step.status === status)).length;
}

function hasRead(steps: Step[]): boolean {
  return timesRun(steps, "read_handoff_email", "done") > 0;
}

function ae(deal: Deal): string {
  return firstName(deal.aeName) ?? "the AE";
}

function listOf(fields: DealField[]): string {
  const labels = fields.map((field) => FIELD_LABEL[field].toLowerCase());
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

// —— Read the email ————————————————————————————————————————————————————————

const extractedFields = z.object({
  customerName: z.string().nullable().describe("The customer company that signed"),
  contactName: z.string().nullable().describe("The person at the customer to onboard with"),
  contactEmail: z.string().nullable().describe("That person's email address"),
  aeName: z.string().nullable().describe("The account executive who closed the deal"),
  aeEmail: z.string().nullable(),
  aePhone: z.string().nullable().describe("The AE's phone number exactly as written"),
  opportunityUrl: z.string().nullable().describe("Salesforce opportunity link or id"),
});

const readHandoffEmail = defineTool({
  description:
    "Read the deal's handoff emails, including AE replies and any other handoff for the same customer, and pull out the customer and AE details. Always the first step.",
  input: z.object({}),
  available: ({ steps }) => !hasRead(steps),
  title: () => "Reading the handoff email",
  doneTitle: (output: ReadEmailOutput) =>
    output.missing.length ? `The email is missing the ${listOf(output.missing)}` : "Read the handoff email",
  async execute(_input, ctx): Promise<ReadEmailOutput> {
    const email = await getRow<Email>("novacrm_emails", ctx.deal.emailId);
    if (!email) throw new Error("The handoff email is no longer stored.");
    const sender = parseSender(email.sender);
    const thread = await readDealMail(email, ctx.deal.id);

    const found = await extract({
      schema: extractedFields,
      system: `You read deal handoff email threads sent by account executives (AEs) to a customer success inbox.
Copy each detail exactly as written. Use null when a detail isn't clearly in the thread — never guess or infer.
Later replies from the AE, or another handoff email for the same customer, can add or correct details. Ignore messages signed "NovaCRM Customer Success"; those are ours.
The first sender is usually the AE, so their name and address can come from that From line.`,
      prompt: thread.map(formatMessage).join("\n\n---\n\n"),
    });

    // What the email says wins; a detail it leaves out keeps what we already have (e.g. from a call).
    const prior = ctx.deal;
    const clean = (value: string | null) => value?.trim() || null;
    const customerName = clean(found.customerName) ?? prior.customerName;
    if (customerName) await assertNewCustomer(customerName, prior.id);
    const deal = await ctx.updateDeal({
      customerName,
      customerKey: customerKey(customerName),
      contactName: clean(found.contactName) ?? prior.contactName,
      contactEmail: clean(found.contactEmail)?.toLowerCase() ?? prior.contactEmail,
      aeName: clean(found.aeName) ?? prior.aeName ?? sender.name,
      aeEmail: clean(found.aeEmail) ?? prior.aeEmail ?? sender.address,
      aePhone: clean(found.aePhone) ?? prior.aePhone,
      opportunityUrl: clean(found.opportunityUrl) ?? prior.opportunityUrl,
    });

    return {
      fields: {
        customerName: deal.customerName,
        contactName: deal.contactName,
        contactEmail: deal.contactEmail,
        aeName: deal.aeName,
        aeEmail: deal.aeEmail,
        aePhone: deal.aePhone,
        opportunityUrl: deal.opportunityUrl,
      },
      missing: missingFields(deal),
    };
  },
});

/** Refuses a customer that already has a different onboarding: one deal per customer. */
async function assertNewCustomer(customerName: string, dealId: string): Promise<void> {
  const key = customerKey(customerName);
  if (!key) return;
  const other = await findRow<Deal>("novacrm_deals", { customerKey: key });
  if (other && other.id !== dealId) {
    throw new Error(
      `${other.customerName ?? customerName} already has an onboarding (deal ${other.id}). ` +
        "A person needs to merge this handoff into it or close one of them.",
    );
  }
}

/**
 * Every message about this deal, oldest first: the handoff's whole thread (so AE replies with missing
 * details are read) and the threads of other handoffs for the same customer.
 */
async function readDealMail(handoff: Email, dealId: string): Promise<MailMessage[]> {
  const duplicates = await listRows<Email>("novacrm_emails", { where: { dealId, verdict: "duplicate" }, orderBy: "receivedAt" });
  const emails = [handoff, ...duplicates];
  const threads = await Promise.all(
    emails.map(async (email) => {
      const stored = toMailMessage(email);
      if (!email.threadId) return [stored];
      const thread = await fetchThread(email.threadId);
      return thread.length ? thread : [stored];
    }),
  );
  const byId = new Map(threads.flat().map((message) => [message.id, message]));
  return [...byId.values()].sort((a, b) => (a.receivedAt ?? "").localeCompare(b.receivedAt ?? ""));
}

function toMailMessage(email: Email): MailMessage {
  return {
    id: email.id,
    threadId: email.threadId,
    sender: email.sender,
    subject: email.subject,
    body: email.body ?? "",
    receivedAt: email.receivedAt,
  };
}

function formatMessage(message: MailMessage): string {
  return `From: ${message.sender ?? "unknown"}\nDate: ${message.receivedAt ?? "unknown"}\nSubject: ${message.subject ?? ""}\n\n${message.body}`;
}

// —— Choose the plans to offer ————————————————————————————————————————————————

const listTemplates = defineTool({
  description:
    "List the project templates in Rocketlane, with their phases, timeline and staffing. These are the plans the customer " +
    "could be on; offer the onboarding ones to the AE on the call.",
  input: z.object({}),
  available: ({ deal, steps }) =>
    hasRead(steps) && !deal.rocketlaneProjectId && timesRun(steps, "list_project_templates", "done") === 0,
  title: () => "Looking up onboarding templates in Rocketlane",
  doneTitle: (output: TemplatesOutput) =>
    `Found ${output.templates.length} project template${output.templates.length === 1 ? "" : "s"} in Rocketlane`,
  async execute(): Promise<TemplatesOutput> {
    const templates = await listProjectTemplates();
    if (!templates.length) throw new Error("Rocketlane has no published project templates. A person needs to add one.");
    return { templates };
  },
});

// —— Confirm the plan (and anything missing) on a call ——————————————————————————

/** Details Nova can collect on the call, by the Sarvam output variable that carries them. */
const ON_CALL: Partial<Record<DealField, { variable: string; label: string }>> = {
  customerName: { variable: "company_name", label: "the customer company's name" },
  contactName: { variable: "contact_name", label: "the customer contact's name" },
  contactEmail: { variable: "contact_email", label: "the customer contact's email address" },
};

/** Outcomes worth calling again for: nobody heard anybody. Anything else needs a person. */
const REDIAL_OUTCOMES: CallOutcome[] = ["no_answer", "cut_off", "busy", "failed"];
const REDIAL_DELAY_MS = 20_000;

const CALL_TITLE: Record<CallOutcome, (name: string, output: CallOutput) => string> = {
  confirmed: (name, output) =>
    output.stillMissing.length
      ? `${name} confirmed ${output.plan}, but the ${listOf(output.stillMissing)} is still missing`
      : `${name} confirmed ${output.plan}`,
  ambiguous: (name) => `${name}'s answer about the plan was unclear`,
  callback_requested: (name) => `${name} asked for a call back`,
  wrong_person: (name) => `Someone other than ${name} answered`,
  deal_not_closed: (name) => `${name} said the deal hasn't closed`,
  declined: (name) => `${name} declined the call`,
  no_answer: (name) => `${name} didn't pick up`,
  cut_off: (name) => `The call with ${name} ended before the plan came up`,
  busy: (name) => `${name}'s line was busy`,
  failed: (name) => `The call to ${name} didn't go through`,
};

const callToConfirmPlan = defineTool({
  description:
    "Phone the AE to confirm which plan the customer signed, choosing among the templates you offer, and to collect any " +
    "details missing from the email. The only way to learn the plan. Redials on its own if nobody could be heard.",
  input: z.object({
    templateIds: z
      .array(z.string())
      .min(1)
      .describe("template_id of every template that is a customer onboarding plan, to offer as the choices"),
  }),
  available: ({ deal, steps }) =>
    hasRead(steps) &&
    Boolean(aeDialNumber(deal)) &&
    timesRun(steps, "list_project_templates", "done") > 0 &&
    (!deal.planConfirmedAt || collectable(deal).length > 0) &&
    timesRun(steps, "call_ae_to_confirm_plan") === 0,
  title: (_input, deal) =>
    collectable(deal).length ? `Calling ${ae(deal)} to confirm the plan and the missing details` : `Calling ${ae(deal)} to confirm the plan`,
  doneTitle: (output: CallOutput, _input, deal) => CALL_TITLE[output.outcome](ae(deal), output),
  async execute({ templateIds }, ctx): Promise<CallOutput> {
    const phone = aeDialNumber(ctx.deal);
    if (!phone) throw new Error("There's no number to call the AE on.");

    const templates = await Promise.all([...new Set(templateIds)].map(getProjectTemplate));
    const options = templates.map((template) => template.name);
    const asking = collectable(ctx.deal);
    const missing = asking.map((field) => ON_CALL[field]!);
    const name = ae(ctx.deal);
    const earlier: CallAttempt[] = [];

    for (let attempt = 1; ; attempt++) {
      const call = await confirmPlan({
        aePhone: phone,
        aeName: ctx.deal.aeName ?? "there",
        customerName: ctx.deal.customerName ?? "your new customer",
        options,
        missing,
      });

      const redial = REDIAL_OUTCOMES.includes(call.outcome) && attempt < MAX_CALL_ATTEMPTS;
      if (!redial) {
        const collected = await saveCollected(ctx, asking, call.collected);
        if (call.outcome === "confirmed" && call.plan) {
          const template = templates.find((t) => t.name === call.plan)!;
          await ctx.updateDeal({
            planName: template.name,
            planQuote: call.aeQuote,
            planConfirmedAt: new Date().toISOString(),
            rocketlaneTemplateId: template.templateId,
            rocketlaneTemplateName: template.name,
          });
        }
        const deal = (await getRow<Deal>("novacrm_deals", ctx.deal.id)) ?? ctx.deal;
        return {
          outcome: call.outcome,
          options,
          plan: call.outcome === "confirmed" ? call.plan : null,
          collected,
          stillMissing: missingFields(deal),
          quote: call.aeQuote,
          callbackTime: call.callbackTime,
          notes: call.notes,
          phone: maskPhone(phone),
          attempt,
          transcript: call.transcript,
          failureReason: call.failureReason,
          earlier,
        };
      }

      earlier.push({ attempt, outcome: call.outcome, notes: call.notes, transcript: call.transcript });
      await ctx.progress({
        title: `${CALL_TITLE[call.outcome](name, {} as CallOutput)}. Calling again shortly`,
        output: { phase: "retrying", attempt, earlier } satisfies CallProgress,
      });
      await sleep(REDIAL_DELAY_MS);
      await ctx.progress({
        title: `Calling ${name} again (call ${attempt + 1} of ${MAX_CALL_ATTEMPTS})`,
        output: { phase: "calling", attempt: attempt + 1, earlier } satisfies CallProgress,
      });
    }
  },
});

/** Missing details Nova can ask for on the call. A missing AE phone can't be: there'd be no call. */
function collectable(deal: Deal): DealField[] {
  return missingFields(deal).filter((field) => field in ON_CALL);
}

/** Stores the details the AE gave on the call, after the same checks as details from the email. */
async function saveCollected(
  ctx: ToolContext,
  asked: DealField[],
  said: Record<string, string>,
): Promise<Partial<Record<DealField, string>>> {
  const collected: Partial<Record<DealField, string>> = {};
  for (const field of asked) {
    const value = said[ON_CALL[field]!.variable]?.trim();
    if (!value) continue;
    if (field === "contactEmail") {
      const email = value.replace(/\s+/g, "").toLowerCase();
      if (isEmail(email)) collected.contactEmail = email;
    } else {
      collected[field] = value;
    }
  }
  if (collected.customerName) await assertNewCustomer(collected.customerName, ctx.deal.id);
  if (Object.keys(collected).length) {
    await ctx.updateDeal({
      ...collected,
      ...(collected.customerName ? { customerKey: customerKey(collected.customerName) } : {}),
    });
  }
  return collected;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// —— Create the Rocketlane project ————————————————————————————————————————

/** Rocketlane hiccups (5xx, timeouts) get one more try; the agent never decides that. */
async function withOneRetry<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch {
    await sleep(2_000);
    return work();
  }
}

const createProject = defineTool({
  description:
    "Create the customer's onboarding project in Rocketlane from the template the AE picked on the call. " +
    "Won't duplicate a project the customer already has.",
  input: z.object({
    projectName: z.string().min(3).describe("The project's name in Rocketlane: the customer and what the project is"),
  }),
  available: ({ deal, steps }) =>
    Boolean(deal.planConfirmedAt && deal.rocketlaneTemplateId) &&
    missingFields(deal).length === 0 &&
    !deal.rocketlaneProjectId &&
    timesRun(steps, "create_rocketlane_project") < 2,
  title: ({ projectName }) => `Creating "${projectName}" in Rocketlane`,
  doneTitle: (output: ProjectOutput) => `Created the ${output.plan} project`,
  async execute({ projectName }, ctx): Promise<ProjectOutput> {
    const { deal } = ctx;
    const missing = missingFields(deal);
    if (missing.length) throw new Error(`Can't create the project: the ${listOf(missing)} ${missing.length > 1 ? "are" : "is"} missing.`);
    if (!deal.planConfirmedAt || !deal.rocketlaneTemplateId || !deal.planName) {
      throw new Error("The AE hasn't confirmed the plan on a call, so the project can't be created yet.");
    }

    // The template is the one the AE picked; the agent can't choose another.
    const template = await getProjectTemplate(deal.rocketlaneTemplateId);
    const customer = deal.customerName!;
    const company = (await findCompany(customer)) ?? (await createCompany(customer));
    const open = await listCompanyProjects(company.id);
    if (open.length) {
      const names = open.map((project) => `"${project.projectName}"`).join(", ");
      throw new Error(
        `${company.name} already has an open project in Rocketlane (${names}). ` +
          "A person needs to decide whether onboarding should use it, or archive it so a new one can be made.",
      );
    }

    const project = await withOneRetry(() => createRocketlaneProject({ projectName: projectName.trim(), companyId: company.id, template }));
    await ctx.updateDeal({
      rocketlaneProjectId: project.projectId,
      rocketlaneProjectName: project.projectName,
      projectStartDate: project.startDate,
      projectDueDate: project.dueDate,
    });
    return { ...project, plan: deal.planName, template };
  },
});

// —— Agent ————————————————————————————————————————————————————————————————

export const intakeAgent: Agent = {
  name: "intake",
  instructions: `You are NovaCRM's Intake agent. A deal handoff email has arrived from an account executive (AE).
Your job: confirm the customer's plan with the AE by phone, get any details the email is missing, and create their
onboarding project in Rocketlane from the template for that plan.

1. read_handoff_email.
2. If there's no phone number to call the AE on, finish with "attention": a person has to reach them.
   Never email the AE, and never fill in a missing detail yourself.
3. list_project_templates. The project templates are the plans a customer can be on.
4. call_ae_to_confirm_plan, offering every template that is a customer onboarding plan. The AE picks one, and the
   call also collects whatever the email is missing. Only the AE's answer on the call counts. The tool redials by
   itself when it should. If it doesn't come back "confirmed", or details are still missing, finish with "attention"
   and say what happened on the call.
5. create_rocketlane_project with a clear project name for the customer. It uses the template the AE picked.
6. finish with "done".
If a tool says a person needs to decide something, finish with "attention" and pass that on.`,
  tools: {
    read_handoff_email: readHandoffEmail,
    list_project_templates: listTemplates,
    call_ae_to_confirm_plan: callToConfirmPlan,
    create_rocketlane_project: createProject,
  },
  prompt: (deal) => {
    const lines = [`A deal handoff email is waiting (deal ${deal.id}). Start the intake.`];
    if (deal.planName && deal.planConfirmedAt && collectable(deal).length === 0) {
      lines.push(`An earlier call already confirmed the plan (${deal.planName}), so skip the call.`);
    }
    return lines.join("\n");
  },
  verify(deal) {
    if (missingFields(deal).length) return "Intake can't finish while required details are missing.";
    if (!deal.planConfirmedAt) return "Intake finished without the AE confirming the plan.";
    if (!deal.rocketlaneProjectId) return "Intake finished before the Rocketlane project was created.";
    return null;
  },
};
