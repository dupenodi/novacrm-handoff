import "server-only";
import type { InboxWatch } from "@/lib/types";
import { client, isComposioConfigured, listConnections } from "./composio";
import { COMPOSIO_USER_ID, PUBLIC_APP_URL } from "./config";
import { LAST_CHECKED_KEY } from "./inbox";
import { getSetting, setSetting } from "./store";

/**
 * Live inbox watching: Composio polls Gmail every minute and posts new messages to our webhook.
 * It needs PUBLIC_APP_URL so Composio can reach the app; without it the inbox is checked from the UI.
 */

const TRIGGER = "GMAIL_NEW_GMAIL_MESSAGE";
const SECRET_KEY = "inbox.webhookSecret";

async function gmailConnection() {
  if (!isComposioConfigured()) return null;
  return (await listConnections()).find((c) => c.toolkit === "gmail" && c.status === "ACTIVE") ?? null;
}

async function activeTriggers(connectedAccountId: string) {
  const { items } = await client().triggers.listActive({
    triggerNames: [TRIGGER],
    connectedAccountIds: [connectedAccountId],
  });
  return items;
}

export async function getInboxWatch(): Promise<InboxWatch> {
  const gmail = await gmailConnection();
  const watching = gmail ? (await activeTriggers(gmail.accountId)).length > 0 : false;
  return {
    gmail: { connected: Boolean(gmail), account: gmail?.label ?? null },
    watching,
    canWatch: Boolean(PUBLIC_APP_URL),
    lastCheckedAt: await getSetting<string>(LAST_CHECKED_KEY),
  };
}

function webhookUrl(): string {
  return `${PUBLIC_APP_URL.replace(/\/$/, "")}/api/webhooks/composio`;
}

export async function startWatching(): Promise<void> {
  if (!PUBLIC_APP_URL) throw new Error("Set PUBLIC_APP_URL to this app's public address first.");
  const gmail = await gmailConnection();
  if (!gmail) throw new Error("Connect Gmail first.");

  const subscription = await client().triggers.setWebhookSubscription({ webhookUrl: webhookUrl() });
  if (subscription.secret) await setSetting(SECRET_KEY, subscription.secret);
  if ((await activeTriggers(gmail.accountId)).length === 0) {
    await client().triggers.create(COMPOSIO_USER_ID, TRIGGER, {
      connectedAccountId: gmail.accountId,
      triggerConfig: { userId: "me", labelIds: "INBOX", interval: 1 },
    });
  }
}

export async function stopWatching(): Promise<void> {
  const gmail = await gmailConnection();
  if (!gmail) return;
  for (const trigger of await activeTriggers(gmail.accountId)) await client().triggers.delete(trigger.id);
}

/** The signing secret Composio gave us, used to verify webhook calls. */
export function getWebhookSecret(): Promise<string | null> {
  return getSetting<string>(SECRET_KEY);
}
