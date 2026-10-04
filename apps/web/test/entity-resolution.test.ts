import { describe, expect, it } from "vitest";
import { checkInbox } from "@/lib/server/inbox";
import { customerKey } from "@/lib/server/util";
import type { Deal, Email } from "@/lib/types";
import { GROWTH_TEMPLATE, aeConfirms, handoffEmail, receive, rows, scriptCalls, settle, useRealTemplates, world } from "./support/world";

describe("customerKey", () => {
  it.each([
    ["Acme Logistics", "acme logistics"],
    ["ACME   logistics", "acme logistics"],
    ["Acme Logistics, Inc.", "acme logistics"],
    ["Acme Logistics Pvt. Ltd.", "acme logistics"],
    ["Ben & Jerry's", "ben and jerry s"],
  ])("%s → %s", (name, key) => {
    expect(customerKey(name)).toBe(key);
  });

  it("never merges different names", () => {
    expect(customerKey("Acme")).not.toBe(customerKey("Acme Logistics"));
    expect(customerKey("Acme Retail")).not.toBe(customerKey("Acme Logistics"));
  });

  it("keeps a name that is only a suffix word", () => {
    expect(customerKey("Company")).toBe("company");
  });

  it("is null for an empty name", () => {
    expect(customerKey("  ")).toBeNull();
    expect(customerKey(null)).toBeNull();
  });
});

describe("one onboarding per customer", () => {
  it("a second handoff for the same customer joins the first deal instead of starting another", async () => {
    useRealTemplates();
    scriptCalls(aeConfirms(GROWTH_TEMPLATE));
    receive(handoffEmail({ customer: "Initech" }), handoffEmail({ customer: "Initech, Inc.", subject: "Initech signed!" }));

    const result = await checkInbox();
    await settle();

    expect(result.newDeals).toHaveLength(1);
    expect(rows<Deal>("novacrm_deals")).toHaveLength(1);
    const emails = rows<Email>("novacrm_emails");
    expect(emails.map((email) => email.verdict).sort()).toEqual(["deal", "duplicate"]);
    expect(new Set(emails.map((email) => email.dealId)).size).toBe(1);
    // Only one call, one project, one channel.
    expect(world.sarvam.placed).toHaveLength(1);
    expect(world.rocketlane.projects).toHaveLength(1);
    expect(world.slack.channels).toHaveLength(1);
  });

  it("a later handoff for a customer that's already onboarded starts nothing new", async () => {
    useRealTemplates();
    scriptCalls(aeConfirms(GROWTH_TEMPLATE));
    receive(handoffEmail({ customer: "Initech" }));
    await checkInbox();
    await settle();
    expect(rows<Deal>("novacrm_deals")[0]!.status).toBe("done");

    receive(handoffEmail({ customer: "INITECH" }));
    await checkInbox();
    await settle();

    expect(rows<Deal>("novacrm_deals")).toHaveLength(1);
    expect(world.sarvam.placed).toHaveLength(1);
    expect(world.rocketlane.projects).toHaveLength(1);
  });

  it("the same contact email under a different spelling of the name is the same customer", async () => {
    useRealTemplates();
    scriptCalls(aeConfirms(GROWTH_TEMPLATE));
    receive(
      handoffEmail({ customer: "Initech", contactEmail: "bill@initech.com" }),
      handoffEmail({ customer: "Initech Corp of America", contactEmail: "BILL@initech.com" }),
    );
    await checkInbox();
    await settle();

    expect(rows<Deal>("novacrm_deals")).toHaveLength(1);
  });

  it("different customers get separate onboardings", async () => {
    useRealTemplates();
    scriptCalls(aeConfirms(GROWTH_TEMPLATE));
    receive(
      handoffEmail({ customer: "Initech", contactEmail: "bill@initech.com" }),
      handoffEmail({ customer: "Initrode", contactEmail: "peter@initrode.com" }),
    );
    const result = await checkInbox();
    await settle();

    expect(result.newDeals).toHaveLength(2);
    expect(world.rocketlane.projects).toHaveLength(2);
  });

  it("the same message seen twice (webhook and inbox check) is processed once", async () => {
    useRealTemplates();
    scriptCalls(aeConfirms(GROWTH_TEMPLATE));
    receive(handoffEmail({ customer: "Initech" }));

    await Promise.all([checkInbox(), checkInbox()]);
    await settle();

    expect(rows<Email>("novacrm_emails")).toHaveLength(1);
    expect(rows<Deal>("novacrm_deals")).toHaveLength(1);
    expect(world.sarvam.placed).toHaveLength(1);
  });
});
