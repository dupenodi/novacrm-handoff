import { describe, expect, it } from "vitest";
import { missingFields } from "@/lib/server/agents/intake";
import { checkInbox } from "@/lib/server/inbox";
import type { CallOutput } from "@/lib/step-outputs";
import type { Deal, Step } from "@/lib/types";
import {
  GROWTH_TEMPLATE,
  aeConfirms,
  handoffEmail,
  receive,
  rows,
  scriptCalls,
  settle,
  useRealTemplates,
  world,
  type CallScript,
} from "./support/world";

/** Sends one handoff email through the system, with how the AE answers the call, and returns the deal. */
async function handoff(email: ReturnType<typeof handoffEmail>, call: CallScript = aeConfirms(GROWTH_TEMPLATE)) {
  useRealTemplates();
  scriptCalls(call);
  receive(email);
  await checkInbox();
  await settle();
  return rows<Deal>("novacrm_deals")[0]!;
}

function callStep() {
  return rows<Step>("novacrm_run_steps").find((step) => step.tool === "call_ae_to_confirm_plan") as
    | (Step & { output: CallOutput })
    | undefined;
}

/** Nothing outside the call happened: no project, no channel, no customer email. */
function expectNoOnboarding() {
  expect(world.rocketlane.projects).toHaveLength(0);
  expect(world.slack.channels).toHaveLength(0);
  expect(world.gmail.sent).toHaveLength(0);
}

describe("validation: incomplete or malformed handoff emails", () => {
  it.each([
    {
      what: "customer name",
      email: handoffEmail({ customer: null }),
      asks: "the customer company's name",
      gives: { company_name: "Initech" },
      collected: { customerName: "Initech" },
    },
    {
      what: "contact name",
      email: handoffEmail({ contact: null }),
      asks: "the customer contact's name",
      gives: { contact_name: "Bill Lumbergh" },
      collected: { contactName: "Bill Lumbergh" },
    },
    {
      what: "contact email",
      email: handoffEmail({ contactEmail: null }),
      asks: "the customer contact's email address",
      gives: { contact_email: "bill@initech.com" },
      collected: { contactEmail: "bill@initech.com" },
    },
  ])("missing $what: asked for on the call (never emailed), then onboarding finishes", async ({ email, asks, gives, collected }) => {
    const deal = await handoff(email, aeConfirms(GROWTH_TEMPLATE, gives));

    // One call that asks for exactly what's missing; no email to the AE.
    expect(world.sarvam.placed).toHaveLength(1);
    expect(world.sarvam.placed[0]!.missingDetails).toBe(asks);
    expect(world.gmail.replies).toHaveLength(0);
    expect(callStep()!.output.collected).toEqual(collected);
    expect(callStep()!.output.stillMissing).toEqual([]);
    expect(deal.status).toBe("done");
    expect(world.rocketlane.projects).toHaveLength(1);
  });

  it("an email address spelled on the call is cleaned up (spaces, capitals) before it's saved", async () => {
    const deal = await handoff(
      handoffEmail({ contactEmail: null }),
      aeConfirms(GROWTH_TEMPLATE, { contact_email: "Bill @ Initech.com" }),
    );

    expect(deal.contactEmail).toBe("bill@initech.com");
    expect(deal.status).toBe("done");
  });

  it("the AE doesn't give the missing detail: stops for a person, nothing is created", async () => {
    const deal = await handoff(handoffEmail({ contactEmail: null }), aeConfirms(GROWTH_TEMPLATE));

    expect(callStep()!.output.outcome).toBe("confirmed");
    expect(callStep()!.output.stillMissing).toEqual(["contactEmail"]);
    expect(deal.status).toBe("attention");
    expectNoOnboarding();
  });

  it("a malformed email from the call is rejected, not saved", async () => {
    const deal = await handoff(
      handoffEmail({ contactEmail: null }),
      aeConfirms(GROWTH_TEMPLATE, { contact_email: "bill at initech" }),
    );

    expect(deal.contactEmail).toBeNull();
    expect(deal.status).toBe("attention");
    expectNoOnboarding();
  });

  it("a malformed email in the handoff counts as missing and is asked for on the call", async () => {
    const deal = await handoff(
      handoffEmail({ contactEmail: "bill-at-initech" }),
      aeConfirms(GROWTH_TEMPLATE, { contact_email: "bill@initech.com" }),
    );

    expect(world.sarvam.placed[0]!.missingDetails).toBe("the customer contact's email address");
    expect(deal.contactEmail).toBe("bill@initech.com");
    expect(deal.status).toBe("done");
  });

  it("no phone number for the AE: nobody is called or emailed; a person has to reach them", async () => {
    const deal = await handoff(handoffEmail({ aePhone: null }));

    expect(deal.status).toBe("attention");
    expect(world.sarvam.placed).toHaveLength(0);
    expect(world.gmail.replies).toHaveLength(0);
    expectNoOnboarding();
  });

  it("a non-handoff email is recorded but starts nothing", async () => {
    receive({ ...handoffEmail(), subject: "Lunch on Friday?", body: "Are we still on for lunch?" });
    const result = await checkInbox();
    await settle();

    expect(result.newDeals).toHaveLength(0);
    expect(rows<Deal>("novacrm_deals")).toHaveLength(0);
    expect(rows<{ verdict: string }>("novacrm_emails")[0]!.verdict).toBe("ignored");
    expect(world.sarvam.placed).toHaveLength(0);
  });
});

describe("missingFields", () => {
  const complete = {
    customerName: "Initech",
    contactName: "Bill Lumbergh",
    contactEmail: "bill@initech.com",
    aeName: "Jordan Lee",
    aePhone: "+919876543210",
  } as Deal;

  it("is empty for a complete deal", () => {
    expect(missingFields(complete)).toEqual([]);
  });

  it("treats blank values as missing", () => {
    expect(missingFields({ ...complete, customerName: "  " })).toEqual(["customerName"]);
  });

  it("rejects a malformed contact email", () => {
    expect(missingFields({ ...complete, contactEmail: "bill@" })).toEqual(["contactEmail"]);
  });

  it("needs a number to call the AE on", () => {
    expect(missingFields({ ...complete, aePhone: null })).toEqual(["aePhone"]);
  });
});
