import "server-only";
import { Composio } from "@composio/core";
import type { ComposioConnection } from "@/lib/integrations";
import { COMPOSIO_API_KEY, COMPOSIO_USER_ID } from "./config";

const ACTIVE = "ACTIVE";

export function isComposioConfigured(): boolean {
  return COMPOSIO_API_KEY.trim().length > 0;
}

function client(): Composio {
  if (!isComposioConfigured()) throw new Error("COMPOSIO_API_KEY is not set");
  return new Composio({ apiKey: COMPOSIO_API_KEY.trim(), allowTracking: false });
}

/** One row per toolkit: the active account if there is one, otherwise the most recent attempt. */
export async function listConnections(): Promise<ComposioConnection[]> {
  const { items } = await client().connectedAccounts.list({ userIds: [COMPOSIO_USER_ID], limit: 100 });
  const newestFirst = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const byToolkit = new Map<string, (typeof items)[number]>();
  for (const account of newestFirst) {
    const slug = account.toolkit.slug.toLowerCase();
    const current = byToolkit.get(slug);
    if (!current || (current.status !== ACTIVE && account.status === ACTIVE)) byToolkit.set(slug, account);
  }
  return [...byToolkit.entries()].map(([toolkit, account]) => ({
    toolkit,
    accountId: account.id,
    status: account.status,
    label: accountLabel(account as unknown as Record<string, unknown>),
  }));
}

/** Composio-hosted link that handles OAuth (Gmail, Slack) or API-key entry (Rocketlane). */
export async function startConnection(toolkit: string, callbackUrl: string): Promise<string> {
  const composio = client();
  const authConfigId = await findOrCreateAuthConfig(composio, toolkit);
  const request = await composio.connectedAccounts.link(COMPOSIO_USER_ID, authConfigId, { callbackUrl });
  if (!request.redirectUrl) throw new Error("Composio did not return a redirect URL");
  return request.redirectUrl;
}

/** Deletes an account only if it belongs to this install's Composio user. */
export async function disconnect(accountId: string): Promise<void> {
  const composio = client();
  const { items } = await composio.connectedAccounts.list({ userIds: [COMPOSIO_USER_ID], limit: 100 });
  if (!items.some((account) => account.id === accountId)) {
    throw new Error("Account belongs to a different Composio user");
  }
  await composio.connectedAccounts.delete(accountId);
}

async function findOrCreateAuthConfig(composio: Composio, toolkit: string): Promise<string> {
  const { items } = await composio.authConfigs.list({ toolkit });
  const enabled = items.find((config) => config.status === "ENABLED");
  if (enabled) return enabled.id;
  const created = await composio.authConfigs.create(toolkit, { type: "use_composio_managed_auth" });
  return created.id;
}

const LABEL_FIELDS = ["email", "user_email", "account_email", "username", "login", "name", "display_name"];

/** Best-effort human label (an email or handle) from the account's connection data. */
function accountLabel(account: Record<string, unknown>): string | null {
  const bags = ["state", "data", "params"]
    .map((key) => account[key])
    .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object");
  for (const bag of [...bags, ...bags.map((b) => b.val).filter(isRecord)]) {
    for (const field of LABEL_FIELDS) {
      const value = bag[field];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
