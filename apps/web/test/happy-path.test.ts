import { describe, expect, it } from "vitest";
import { checkInbox } from "@/lib/server/inbox";
import type { Deal, Step } from "@/lib/types";
import {
  ENTERPRISE_TEMPLATE,
  GROWTH_TEMPLATE,
  MID_MARKET_TEMPLATE,
  aeConfirms,
  handoffEmail,
  receive,
  rows,
  scriptCalls,
  settle,
  useRealTemplates,
  world,
  type RocketlaneTemplate,
} from "./support/world";

/** Runs one handoff email through the whole system: inbox check → Intake → Communication. */
async function onboard(template: RocketlaneTemplate, customer = "Initech") {
  useRealTemplates();
  scriptCalls(aeConfirms(template));
  receive(handoffEmail({ customer, contact: "Bill Lumbergh", contactEmail: "bill@initech.com" }));

  const result = await checkInbox();
  await settle();

  const [deal] = rows<Deal>("novacrm_deals");
  return { result, deal: deal!, steps: rows<Step>("novacrm_run_steps") };
}

describe("happy path: a new Enterprise deal email", () => {
  it("parses the email, confirms the plan by phone, creates the project and the Slack channel", async () => {
    const { result, deal, steps } = await onboard(ENTERPRISE_TEMPLATE);

    // The watcher picked up the handoff and started one deal.
    expect(result.newDeals).toHaveLength(1);
    expect(deal.status).toBe("done");

    // Intake parsed the email.
    expect(deal).toMatchObject({
      customerName: "Initech",
      contactName: "Bill Lumbergh",
      contactEmail: "bill@initech.com",
      aeName: "Jordan Lee",
      aeEmail: "jordan@novacrm.com",
    });

    // The AE was called once, offered the plans that exist in Rocketlane, and confirmed Enterprise.
    expect(world.sarvam.placed).toHaveLength(1);
    expect(world.sarvam.placed[0]).toMatchObject({
      phone: "+919876543210",
      aeName: "Jordan Lee",
      customerName: "Initech",
      planOptions: "Growth Onboarding · 14 days, Enterprise Onboarding · 30 days or Mid Market Onboarding · 24 days",
      missingDetails: "none",
    });
    expect(deal.planName).toBe(ENTERPRISE_TEMPLATE.name);
    expect(deal.planQuote).toBe(`They're on ${ENTERPRISE_TEMPLATE.name}.`);

    // The project was created in Rocketlane from the template the AE picked, for a new Initech company.
    expect(world.rocketlane.projects).toHaveLength(1);
    const [project] = world.rocketlane.projects;
    expect(project!.templateId).toBe(ENTERPRISE_TEMPLATE.templateId);
    expect(world.rocketlane.companies.map((c) => c.name)).toEqual(["Initech"]);
    expect(deal.rocketlaneProjectId).toBe(String(project!.projectId));
    expect(deal.rocketlaneTemplateName).toBe(ENTERPRISE_TEMPLATE.name);

    // The Slack channel and its topic are personalised from the deal and the real template.
    expect(world.slack.channels).toHaveLength(1);
    const [channel] = world.slack.channels;
    expect(channel!.name).toBe("initech-onboarding");
    expect(channel!.topic).toContain("Initech");
    expect(channel!.topic).toContain(ENTERPRISE_TEMPLATE.name);
    expect(channel!.topic).toContain("21 working days");
    expect(channel!.topic).toContain("dedicated CSM Paul Mathew");

    // The welcome names the contact, the plan, the dedicated CSM, the real phases and the AE.
    const [welcome] = world.slack.messages;
    expect(welcome!.channel).toBe(channel!.id);
    expect(welcome!.text).toContain("Bill");
    expect(welcome!.text).toContain(ENTERPRISE_TEMPLATE.name);
    expect(welcome!.text).toContain("Paul Mathew");
    expect(welcome!.text).toContain("Kickoff & Readiness");
    expect(welcome!.text).toContain("Jordan Lee");

    // The customer was emailed about the channel, with the AE copied. The AE never got an email.
    expect(world.gmail.sent).toEqual([
      expect.objectContaining({ to: "bill@initech.com", cc: ["jordan@novacrm.com"], body: expect.stringContaining("#initech-onboarding") }),
    ]);
    expect(world.gmail.replies).toHaveLength(0);

    // Every tool call was logged with a reason, its input and output, and timestamps.
    const tools = steps.filter((step) => step.kind === "tool").map((step) => step.tool);
    expect(tools).toEqual([
      "read_handoff_email",
      "list_project_templates",
      "call_ae_to_confirm_plan",
      "create_rocketlane_project",
      "get_onboarding_details",
      "create_slack_channel",
      "post_welcome_message",
      "email_customer",
    ]);
    for (const step of steps.filter((s) => s.kind === "tool")) {
      expect(step.status).toBe("done");
      expect(step.why).toBeTruthy();
      expect(step.input).not.toBeNull();
      expect(step.output).not.toBeNull();
      expect(step.startedAt).toBeTruthy();
      expect(step.finishedAt).toBeTruthy();
    }
  });
});

describe("template accuracy: the project uses exactly the template the AE picked", () => {
  it("Enterprise → the 30-day template, with a dedicated CSM", async () => {
    const { deal } = await onboard(ENTERPRISE_TEMPLATE);
    const [project] = world.rocketlane.projects;

    expect(project!.templateId).toBe(ENTERPRISE_TEMPLATE.templateId);
    expect(deal.rocketlaneTemplateName).toBe("Enterprise Onboarding · 30 days");
    expect(workingDaysBetween(project!.startDate, project!.dueDate)).toBe(ENTERPRISE_TEMPLATE.workingDays);
    expect(world.slack.channels[0]!.topic).toContain("dedicated CSM Paul Mathew");
  });

  it("Growth → the 14-day template, with a pooled CSM team", async () => {
    const { deal } = await onboard(GROWTH_TEMPLATE);
    const [project] = world.rocketlane.projects;

    expect(project!.templateId).toBe(GROWTH_TEMPLATE.templateId);
    expect(deal.rocketlaneTemplateName).toBe("Growth Onboarding · 14 days");
    expect(workingDaysBetween(project!.startDate, project!.dueDate)).toBe(GROWTH_TEMPLATE.workingDays);
    expect(world.slack.channels[0]!.topic).toContain("pooled CSM team");
  });

  it("a plan that exists only in Rocketlane (Mid Market) works without any code knowing about it", async () => {
    const { deal } = await onboard(MID_MARKET_TEMPLATE);
    const [project] = world.rocketlane.projects;

    // Same length as Enterprise, so nothing could have guessed it from the timeline.
    expect(project!.templateId).toBe(MID_MARKET_TEMPLATE.templateId);
    expect(deal.planName).toBe("Mid Market Onboarding · 24 days");
    expect(world.slack.channels[0]!.topic).toContain("pooled CSM team");
  });
});

/** Working days from start to due, both included. */
function workingDaysBetween(start: string, due: string): number {
  let count = 0;
  for (let day = new Date(`${start}T12:00:00Z`); day <= new Date(`${due}T12:00:00Z`); day.setUTCDate(day.getUTCDate() + 1)) {
    if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6) count += 1;
  }
  return count;
}
