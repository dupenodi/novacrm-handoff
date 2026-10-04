import { describe, expect, it } from "vitest";
import { checkInbox } from "@/lib/server/inbox";
import type { CallOutput } from "@/lib/step-outputs";
import type { Deal, Step } from "@/lib/types";
import { advanceDeal } from "@/lib/server/workflow";
import { behavior } from "./support/scripted-model";
import {
  AE_NO_ANSWER,
  AE_UNSURE,
  CALL_CUT_OFF,
  ENTERPRISE_TEMPLATE,
  GROWTH_TEMPLATE,
  MID_MARKET_TEMPLATE,
  aeConfirms,
  failNext,
  handoffEmail,
  receive,
  rows,
  scriptCalls,
  settle,
  useRealTemplates,
  world,
} from "./support/world";

async function handoff() {
  useRealTemplates();
  receive(handoffEmail({ customer: "Initech" }));
  await checkInbox();
  await settle();
  return rows<Deal>("novacrm_deals")[0]!;
}

function callStep(): Step & { output: CallOutput } {
  return rows<Step>("novacrm_run_steps").find((step) => step.tool === "call_ae_to_confirm_plan") as Step & { output: CallOutput };
}

describe("the AE doesn't answer, or isn't clear", () => {
  it("no answer: redials once by itself, then stops for a person without assuming a plan", async () => {
    scriptCalls(AE_NO_ANSWER);
    const deal = await handoff();

    expect(world.sarvam.placed).toHaveLength(2);
    expect(callStep().output).toMatchObject({ outcome: "no_answer", attempt: 2 });
    expect(callStep().output.earlier).toEqual([expect.objectContaining({ attempt: 1, outcome: "no_answer" })]);
    expect(deal).toMatchObject({ status: "attention", planName: null, planConfirmedAt: null });
    expect(world.rocketlane.projects).toHaveLength(0);
    expect(world.slack.channels).toHaveLength(0);
  });

  it("ambiguous answer: doesn't call again and doesn't guess the plan", async () => {
    scriptCalls(AE_UNSURE);
    const deal = await handoff();

    expect(world.sarvam.placed).toHaveLength(1);
    expect(callStep().output.outcome).toBe("ambiguous");
    expect(deal).toMatchObject({ status: "attention", planName: null });
    expect(deal.attention).toContain("ambiguous");
    expect(world.rocketlane.projects).toHaveLength(0);
  });

  it("a named plan said with low confidence still counts as unclear", async () => {
    scriptCalls({ vars: { plan: GROWTH_TEMPLATE.name, confidence: "ambiguous", ae_quote: "I think Growth?" } });
    const deal = await handoff();

    expect(callStep().output.outcome).toBe("ambiguous");
    expect(deal.planName).toBeNull();
    expect(world.rocketlane.projects).toHaveLength(0);
  });

  it("the AE picks up but the call drops: labelled 'cut off', redialled, and the second call confirms", async () => {
    scriptCalls(CALL_CUT_OFF, aeConfirms(GROWTH_TEMPLATE));
    const deal = await handoff();

    expect(world.sarvam.placed).toHaveLength(2);
    expect(callStep().output.earlier[0]!.outcome).toBe("cut_off");
    expect(callStep().output.outcome).toBe("confirmed");
    expect(deal.status).toBe("done");
    expect(world.rocketlane.projects[0]!.templateId).toBe(GROWTH_TEMPLATE.templateId);
  });

  it("a busy line is redialled", async () => {
    scriptCalls({ connectivity: "busy" }, aeConfirms(ENTERPRISE_TEMPLATE));
    const deal = await handoff();

    expect(world.sarvam.placed).toHaveLength(2);
    expect(deal.planName).toBe(ENTERPRISE_TEMPLATE.name);
  });
});

describe("Rocketlane is down", () => {
  it("one failure is retried automatically and onboarding finishes", async () => {
    scriptCalls(aeConfirms(ENTERPRISE_TEMPLATE));
    failNext("ROCKETLANE_CREATE_PROJECT", 1);
    const deal = await handoff();

    expect(deal.status).toBe("done");
    expect(world.rocketlane.projects).toHaveLength(1);
  });

  it("if it stays down, the deal stops for a person with the reason, and the confirmed plan is kept", async () => {
    scriptCalls(aeConfirms(ENTERPRISE_TEMPLATE));
    failNext("ROCKETLANE_CREATE_PROJECT", 10);
    const deal = await handoff();

    expect(deal.status).toBe("attention");
    expect(deal.attention).toContain("500");
    expect(deal.planName).toBe(ENTERPRISE_TEMPLATE.name);
    expect(world.rocketlane.projects).toHaveLength(0);
    // Communication never starts without a project.
    expect(world.slack.channels).toHaveLength(0);
  });

  it("a retry after Rocketlane recovers skips the call and finishes", async () => {
    scriptCalls(aeConfirms(ENTERPRISE_TEMPLATE));
    failNext("ROCKETLANE_CREATE_PROJECT", 10);
    const stuck = await handoff();
    expect(stuck.status).toBe("attention");

    world.failures.clear();
    await advanceDeal(stuck.id);

    const deal = rows<Deal>("novacrm_deals")[0]!;
    expect(deal.status).toBe("done");
    expect(world.sarvam.placed).toHaveLength(1);
    expect(world.rocketlane.projects).toHaveLength(1);
  });

  it("if templates can't be read, nothing is created", async () => {
    scriptCalls(aeConfirms(GROWTH_TEMPLATE));
    failNext("ROCKETLANE_LIST_TEMPLATES", 10);
    const deal = await handoff();

    expect(deal.status).toBe("attention");
    expect(world.rocketlane.projects).toHaveLength(0);
  });
});

describe("the customer already has an onboarding project", () => {
  it("stops for a person instead of creating a duplicate", async () => {
    world.rocketlane.companies.push({ id: 500, name: "Initech, Inc." });
    world.rocketlane.projects.push({
      projectId: 900,
      projectName: "Initech — Growth Onboarding · 14 days",
      companyId: 500,
      templateId: GROWTH_TEMPLATE.templateId,
      startDate: "2026-09-01",
      dueDate: "2026-09-14",
      archived: false,
    });
    scriptCalls(aeConfirms(ENTERPRISE_TEMPLATE));
    const deal = await handoff();

    expect(deal.status).toBe("attention");
    expect(deal.attention).toContain("already has an open project");
    expect(world.rocketlane.projects).toHaveLength(1);
    expect(world.slack.channels).toHaveLength(0);
  });

  it("an archived project doesn't block a new one, and the existing company is reused", async () => {
    world.rocketlane.companies.push({ id: 500, name: "Initech" });
    world.rocketlane.projects.push({
      projectId: 900,
      projectName: "Initech — old",
      companyId: 500,
      templateId: null,
      startDate: "2025-01-01",
      dueDate: "2025-01-14",
      archived: true,
    });
    scriptCalls(aeConfirms(ENTERPRISE_TEMPLATE));
    const deal = await handoff();

    expect(deal.status).toBe("done");
    expect(world.rocketlane.companies).toHaveLength(1);
    expect(world.rocketlane.projects.at(-1)!.companyId).toBe(500);
  });

  it("a company with a merely similar name is a different customer", async () => {
    world.rocketlane.companies.push({ id: 501, name: "Initech Labs" });
    scriptCalls(aeConfirms(GROWTH_TEMPLATE));
    const deal = await handoff();

    expect(deal.status).toBe("done");
    expect(world.rocketlane.companies.map((c) => c.name)).toEqual(["Initech Labs", "Initech"]);
    expect(world.rocketlane.projects[0]!.companyId).not.toBe(501);
  });
});

describe("the plan comes from Rocketlane, not from code", () => {
  it("the AE names a plan that wasn't offered: unclear, nothing created", async () => {
    scriptCalls({ vars: { plan: "Platinum", confidence: "explicit", ae_quote: "They're on Platinum." } });
    const deal = await handoff();

    expect(callStep().output.outcome).toBe("ambiguous");
    expect(deal.planName).toBeNull();
    expect(world.rocketlane.projects).toHaveLength(0);
  });

  it("the AE's answer matches an offered plan regardless of case and punctuation", async () => {
    scriptCalls({ vars: { plan: "mid market onboarding - 24 days", confidence: "explicit", call_outcome: "plan_confirmed" } });
    const deal = await handoff();

    expect(deal.planName).toBe(MID_MARKET_TEMPLATE.name);
    expect(world.rocketlane.projects[0]!.templateId).toBe(MID_MARKET_TEMPLATE.templateId);
  });

  it("only the templates the agent offers are choices; one it didn't offer isn't accepted", async () => {
    behavior.offerTemplates = () => [String(GROWTH_TEMPLATE.templateId), String(ENTERPRISE_TEMPLATE.templateId)];
    scriptCalls(aeConfirms(MID_MARKET_TEMPLATE));
    const deal = await handoff();

    expect(world.sarvam.placed[0]!.planOptions).toBe("Growth Onboarding · 14 days or Enterprise Onboarding · 30 days");
    expect(callStep().output.outcome).toBe("ambiguous");
    expect(deal.planName).toBeNull();
  });

  it("a made-up template id can't be offered", async () => {
    behavior.offerTemplates = () => ["123"];
    scriptCalls(aeConfirms(GROWTH_TEMPLATE));
    const deal = await handoff();

    expect(world.sarvam.placed).toHaveLength(0);
    expect(deal.status).toBe("attention");
  });
});

describe("Slack", () => {
  it("a taken channel name gets a number instead of failing", async () => {
    world.slack.channels.push({ id: "C0", name: "initech-onboarding", topic: "" });
    scriptCalls(aeConfirms(GROWTH_TEMPLATE));
    const deal = await handoff();

    expect(deal.slackChannelName).toBe("initech-onboarding-2");
    expect(world.gmail.sent[0]!.body).toContain("#initech-onboarding-2");
  });
});
