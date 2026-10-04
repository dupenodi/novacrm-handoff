import "server-only";
import { z } from "zod";
import type { Deal, Email, InboxCheckResult } from "@/lib/types";
import { findRow, insertRowIfAbsent, listRows, newId, updateRow } from "./db";
import { fetchMessage, fetchRecentMessages, type MailMessage } from "./gmail";
import { extract } from "./llm";
import { setSetting } from "./store";
import { customerKey, isEmail } from "./util";
import { advanceInBackground } from "./workflow";

/** Recent primary-inbox mail; promotions and newsletters never carry a deal handoff. */
const INBOX_QUERY = "in:inbox newer_than:3d -category:promotions -category:social -category:updates -category:forums";
const MAX_PER_CHECK = 15;

export const LAST_CHECKED_KEY = "inbox.lastCheckedAt";

const verdictSchema = z.object({
  isDealHandoff: z
    .boolean()
    .describe("True if a salesperson is telling customer success that a customer deal has closed or been signed"),
  customerName: z.string().nullable().describe("The customer company, if the email names one"),
  contactEmail: z.string().nullable().describe("The customer contact's email address, if the email gives one"),
  reason: z.string().describe("One short sentence explaining the verdict"),
});

/** Looks at recent inbox mail and starts onboarding for every new deal handoff. */
export async function checkInbox(): Promise<InboxCheckResult> {
  const messages = await fetchRecentMessages(INBOX_QUERY, MAX_PER_CHECK);
  const known = messages.length
    ? await listRows<Email>("novacrm_emails", { where: { id: messages.map((m) => m.id) } })
    : [];
  const knownIds = new Set(known.map((email) => email.id));
  const fresh = messages.filter((message) => !knownIds.has(message.id));

  // One at a time, oldest first, so two copies of the same handoff can't both start an onboarding.
  const results = [];
  for (const message of fresh.reverse()) results.push(await ingest(message));
  await setSetting(LAST_CHECKED_KEY, new Date().toISOString());

  const newDeals = results.flatMap((r) => (r?.deal ? [{ id: r.deal.id, customerName: r.deal.customerName }] : []));
  return {
    checked: messages.length,
    newDeals,
    ignored: results.filter((r) => r?.email.verdict === "ignored").length,
  };
}

/** Handles one message pushed by the Gmail trigger. */
export async function ingestMessageById(messageId: string): Promise<void> {
  if (await findRow<Email>("novacrm_emails", { id: messageId })) return;
  const message = await fetchMessage(messageId);
  if (message) await ingest(message);
  await setSetting(LAST_CHECKED_KEY, new Date().toISOString());
}

/**
 * Records the email once and decides what it is: a reply on a deal's thread resumes that deal;
 * a new deal handoff creates a deal and starts the agents; anything else is noted and ignored.
 */
async function ingest(message: MailMessage): Promise<{ email: Email; deal?: Deal } | null> {
  const base = {
    id: message.id,
    threadId: message.threadId,
    sender: message.sender,
    subject: message.subject,
    body: message.body,
    receivedAt: message.receivedAt,
  };

  const threadDeal = message.threadId ? await dealForThread(message.threadId) : null;
  if (threadDeal) {
    const email = await insertRowIfAbsent<Email>(
      "novacrm_emails",
      { ...base, verdict: "reply", reason: "A reply on this deal's email thread.", dealId: threadDeal.id },
      "id",
    );
    if (email && threadDeal.status === "attention") advanceInBackground(threadDeal.id);
    return email ? { email } : null;
  }

  const verdict = await extract({
    schema: verdictSchema,
    system: `You sort a customer success team's inbox. A deal handoff is an email from a salesperson (an AE)
saying a customer has signed or a deal is closed-won, so customer success should start onboarding.
It still counts if details are missing. Newsletters, notifications, receipts and personal mail don't count.`,
    prompt: `From: ${message.sender ?? "unknown"}\nSubject: ${message.subject ?? ""}\n\n${message.body.slice(0, 3000)}`,
  });

  if (!verdict.isDealHandoff) {
    const email = await insertRowIfAbsent<Email>("novacrm_emails", { ...base, verdict: "ignored", reason: verdict.reason }, "id");
    return email ? { email } : null;
  }

  // One onboarding per customer: another handoff for a customer we already have joins that deal.
  const identity = { customerName: verdict.customerName, contactEmail: verdict.contactEmail };
  const existing = await findCustomerDeal(identity);
  if (existing) return attachToDeal(base, existing);

  const email = await insertRowIfAbsent<Email>("novacrm_emails", { ...base, verdict: "deal", reason: verdict.reason }, "id");
  // Another check got to this message first.
  if (!email) return null;

  const contactEmail = isEmail(verdict.contactEmail) ? verdict.contactEmail!.trim().toLowerCase() : null;
  const deal = await insertRowIfAbsent<Deal>(
    "novacrm_deals",
    {
      id: newId("deal"),
      emailId: email.id,
      customerName: verdict.customerName?.trim() || null,
      customerKey: customerKey(verdict.customerName),
      contactEmail,
      status: "new",
    },
    "customerKey",
  );
  if (!deal) {
    // A handoff for the same customer was stored a moment ago (e.g. by the Gmail trigger).
    const winner = await findCustomerDeal(identity);
    if (!winner) throw new Error(`Couldn't store the deal for ${verdict.customerName ?? "this handoff"}.`);
    const reason = `Another handoff for ${winner.customerName ?? "this customer"}, added to its onboarding.`;
    const updated = await updateRow<Email>("novacrm_emails", email.id, { verdict: "duplicate", reason, dealId: winner.id });
    return { email: updated };
  }
  await updateRow<Email>("novacrm_emails", email.id, { dealId: deal.id });
  advanceInBackground(deal.id);
  return { email: { ...email, dealId: deal.id }, deal };
}

/**
 * The deal for this customer, if we have one: the same customer key (normalized name), or else the
 * same contact email. Both are exact matches; a near miss is a different customer.
 */
async function findCustomerDeal(identity: { customerName: string | null; contactEmail: string | null }): Promise<Deal | null> {
  const key = customerKey(identity.customerName);
  if (key) {
    const byName = await findRow<Deal>("novacrm_deals", { customerKey: key });
    if (byName) return byName;
  }
  if (isEmail(identity.contactEmail)) {
    return findRow<Deal>("novacrm_deals", { contactEmail: identity.contactEmail!.trim().toLowerCase() });
  }
  return null;
}

/** Stores a second handoff for a known customer on its deal, and resumes the deal if it was waiting. */
async function attachToDeal(base: Omit<Email, "verdict" | "reason" | "dealId" | "createdAt">, deal: Deal) {
  const reason = `Another handoff for ${deal.customerName ?? "this customer"}, added to its onboarding.`;
  const email = await insertRowIfAbsent<Email>("novacrm_emails", { ...base, verdict: "duplicate", reason, dealId: deal.id }, "id");
  if (!email) return null;
  // New details may be what the deal was waiting for.
  if (deal.status === "attention") advanceInBackground(deal.id);
  return { email };
}

async function dealForThread(threadId: string): Promise<Deal | null> {
  const original = await findRow<Email>("novacrm_emails", { threadId, verdict: "deal" });
  return original?.dealId ? findRow<Deal>("novacrm_deals", { id: original.dealId }) : null;
}
