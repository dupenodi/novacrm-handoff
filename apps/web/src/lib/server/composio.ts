import "server-only";
import { Composio } from "@composio/core";
import type { ComposioConnection } from "@/lib/integrations";
import { COMPOSIO_API_KEY, COMPOSIO_USER_ID } from "./config";
import { isRecord } from "./util";

const ACTIVE = "ACTIVE";

export function isComposioConfigured(): boolean {
  return COMPOSIO_API_KEY.length > 0;
}

export function client(): Composio {
  if (!isComposioConfigured()) throw new Error("COMPOSIO_API_KEY is not set");
  return new Composio({ apiKey: COMPOSIO_API_KEY, allowTracking: false });
}

async function listAccounts() {
  const { items } = await client().connectedAccounts.list({ userIds: [COMPOSIO_USER_ID], limit: 100 });
  return items;
}

// —— Connections ——————————————————————————————————————————————————————————

/** One row per toolkit: the active account if there is one, otherwise the most recent attempt. */
export async function listConnections(): Promise<ComposioConnection[]> {
  const newestFirst = (await listAccounts()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const byToolkit = new Map<string, (typeof newestFirst)[number]>();
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

/** Active connected-account id for a toolkit (gmail, rocketlane, slack). */
export async function getActiveAccountId(toolkit: string): Promise<string> {
  const connection = (await listConnections()).find(
    (c) => c.toolkit === toolkit.toLowerCase() && c.status === ACTIVE,
  );
  if (!connection) {
    throw new Error(`No ACTIVE Composio connection for “${toolkit}”. Connect it in Settings → Integrations.`);
  }
  return connection.accountId;
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
  const accounts = await listAccounts();
  if (!accounts.some((account) => account.id === accountId)) {
    throw new Error("Account belongs to a different Composio user");
  }
  await client().connectedAccounts.delete(accountId);
}

async function findOrCreateAuthConfig(composio: Composio, toolkit: string): Promise<string> {
  const { items } = await composio.authConfigs.list({ toolkit });
  const enabled = items.find((config) => config.status === "ENABLED");
  if (enabled) return enabled.id;
  const created = await composio.authConfigs.create(toolkit, { type: "use_composio_managed_auth" });
  return created.id;
}

const LABEL_FIELDS = ["email", "displayName", "user_email", "account_email", "username", "login", "name", "display_name"];

/** Best-effort human label (an email or handle) from the account's connection data. */
function accountLabel(account: Record<string, unknown>): string | null {
  const bags = ["state", "data", "params"].map((key) => account[key]).filter(isRecord);
  const nested = bags.map((bag) => bag.val).filter(isRecord);
  for (const bag of [...bags, ...nested]) {
    for (const field of LABEL_FIELDS) {
      const value = bag[field];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return null;
}

// —— Tool execution ———————————————————————————————————————————————————————

/**
 * Runs a Composio action on the toolkit's active account and returns its data.
 * Throws when the action reports a failure.
 */
export async function runComposioTool(
  toolkit: string,
  slug: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  const connectedAccountId = await getActiveAccountId(toolkit);
  const response = (await client().tools.execute(slug, {
    userId: COMPOSIO_USER_ID,
    connectedAccountId,
    arguments: args,
    // Pinned toolkit versions shouldn't block the demo.
    dangerouslySkipVersionCheck: true,
  })) as { successful?: boolean; error?: unknown; data?: unknown };

  if (response.successful === false || response.error) {
    const { error } = response;
    throw new Error(typeof error === "string" ? error : error ? JSON.stringify(error) : `${slug} failed`);
  }
  return response.data ?? response;
}

/** Calls a toolkit's REST API directly through Composio, for endpoints its tools don't cover well. */
export async function proxyComposio(
  toolkit: string,
  request: { endpoint: string; method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown },
): Promise<unknown> {
  const connectedAccountId = await getActiveAccountId(toolkit);
  const response = await client().tools.proxyExecute({ ...request, connectedAccountId });
  if (response.status >= 400) {
    throw new Error(`${toolkit} ${request.method} ${request.endpoint} failed (${response.status}): ${JSON.stringify(response.data)}`);
  }
  return response.data;
}
