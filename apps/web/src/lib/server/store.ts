import "server-only";
import type { Deal, DealSummary, DealView, Email, Run, Step } from "@/lib/types";
import { ROCKETLANE_APP_URL } from "./config";
import { findRow, getRow, listRows, updateRow, updateRows, upsertRow } from "./db";

/**
 * A run with no new activity for this long was cut off, e.g. by a server restart. The longest
 * single step is the AE call tool: two calls plus Sarvam's extraction, about 10 minutes without
 * logging a new step.
 */
const STALE_RUN_MS = 12 * 60_000;

export function getDeal(id: string): Promise<Deal | null> {
  return getRow<Deal>("novacrm_deals", id);
}

export function updateDeal(id: string, patch: Partial<Deal>): Promise<Deal> {
  return updateRow<Deal>("novacrm_deals", id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function listDealSummaries(limit = 50): Promise<DealSummary[]> {
  let deals = await listRows<Deal>("novacrm_deals", { orderBy: "createdAt", ascending: false, limit });
  if (deals.length === 0) return [];
  const live = deals.filter((deal) => deal.status === "intake" || deal.status === "comms");
  if (live.length > 0) {
    await Promise.all(live.map((deal) => closeStaleRuns(deal.id)));
    deals = await listRows<Deal>("novacrm_deals", { orderBy: "createdAt", ascending: false, limit });
  }
  const emails = await listRows<Email>("novacrm_emails", { where: { id: deals.map((deal) => deal.emailId) } });
  const subjects = new Map(emails.map((email) => [email.id, email.subject]));
  return deals.map((deal) => ({
    id: deal.id,
    status: deal.status,
    customerName: deal.customerName,
    planName: deal.planName,
    attention: deal.attention,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
    subject: subjects.get(deal.emailId) ?? null,
  }));
}

export async function getDealView(id: string): Promise<DealView | null> {
  await closeStaleRuns(id);
  const deal = await getDeal(id);
  if (!deal) return null;
  const [email, replies, runs, steps] = await Promise.all([
    getRow<Email>("novacrm_emails", deal.emailId),
    listRows<Email>("novacrm_emails", { where: { dealId: id, verdict: ["reply", "duplicate"] }, orderBy: "createdAt" }),
    listRows<Run>("novacrm_runs", { where: { dealId: id }, orderBy: "startedAt" }),
    listRows<Step>("novacrm_run_steps", { where: { dealId: id }, orderBy: "seq" }),
  ]);
  const rocketlaneUrl =
    ROCKETLANE_APP_URL && deal.rocketlaneProjectId ? `${ROCKETLANE_APP_URL}/projects/${deal.rocketlaneProjectId}` : null;
  return { deal, email, replies, runs, steps, rocketlaneUrl };
}

/**
 * The most recent emails about deals (handoffs, AE replies, repeat handoffs), newest first.
 * Everything else the watcher read is kept so it isn't processed again, but never shown.
 */
export async function listRecentEmails(limit = 12): Promise<Email[]> {
  const emails = await listRows<Email>("novacrm_emails", {
    where: { verdict: ["deal", "reply", "duplicate"] },
    orderBy: "createdAt",
    ascending: false,
    limit: limit * 3,
  });
  const at = (email: Email) => email.receivedAt ?? email.createdAt;
  return emails.sort((a, b) => at(b).localeCompare(at(a))).slice(0, limit);
}

/** Marks runs that stopped reporting as needing attention, so the deal can be retried. */
async function closeStaleRuns(dealId: string): Promise<void> {
  const running = await findRow<Run>("novacrm_runs", { dealId, status: "running" });
  if (!running) return;
  const [latest] = await listRows<Step>("novacrm_run_steps", {
    where: { runId: running.id },
    orderBy: "seq",
    ascending: false,
    limit: 1,
  });
  const lastActivity = Math.max(
    Date.parse(running.startedAt),
    Date.parse(latest?.finishedAt ?? latest?.startedAt ?? running.startedAt),
  );
  if (Date.now() - lastActivity < STALE_RUN_MS) return;
  const now = new Date().toISOString();
  const summary = "This run was interrupted before it finished. Retry to pick up where it stopped.";
  await updateRows<Step>("novacrm_run_steps", { runId: running.id, status: "running" }, {
    status: "failed",
    error: "Interrupted",
    finishedAt: now,
  });
  await updateRow<Run>("novacrm_runs", running.id, { status: "attention", summary, finishedAt: now });
  await updateDeal(dealId, { status: "attention", attention: summary });
}

// —— Settings ————————————————————————————————————————————————————————————

type KvRow = { key: string; value: unknown; updatedAt: string };

export async function getSetting<T>(key: string): Promise<T | null> {
  const row = await findRow<KvRow>("novacrm_kv", { key });
  return (row?.value as T | undefined) ?? null;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await upsertRow<KvRow>("novacrm_kv", { key, value, updatedAt: new Date().toISOString() }, "key");
}
