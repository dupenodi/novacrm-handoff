import "server-only";
import { fetchEmail, fetchRecentEmails } from "../gmail";
import { extractDealFromEmail } from "../intake/extract-deal";
import { getClientByGmail, insertClient, markMailSeen, wasMailSeen } from "../clients-store";
import { isRecord } from "../util";
import type { Client } from "@/lib/clients";

/** The fields we read from Composio's Gmail message shape. */
type GmailMessage = {
  messageId?: string;
  message_id?: string;
  id?: string;
  subject?: string;
  messageText?: string;
  payload?: { headers?: Array<{ name: string; value: string }> };
};

export type IngestItem = {
  messageId: string;
  subject: string;
  status: "created" | "existing" | "ignored";
  clientId?: string;
};

type Ingested = { item: IngestItem; created?: Client };

function messageIdOf(message: GmailMessage): string {
  return (message.messageId ?? message.message_id ?? message.id ?? "").trim();
}

function subjectOf(message: GmailMessage): string {
  const header = message.payload?.headers?.find((h) => h.name.toLowerCase() === "subject");
  return message.subject || header?.value || "(no subject)";
}

function messagesFrom(data: unknown): GmailMessage[] {
  if (!isRecord(data)) return [];
  const list = data.messages ?? data.emails;
  return Array.isArray(list) ? list : [];
}

/** Returns the existing client if this message was already turned into one. */
async function existingItem(messageId: string, subject: string): Promise<IngestItem | null> {
  const client = await getClientByGmail(messageId);
  if (!client && !(await wasMailSeen(messageId))) return null;
  return { messageId, subject, status: "existing", clientId: client?.id };
}

/** Creates a client from a deal email; non-deal emails are marked seen and ignored. */
async function ingest(message: GmailMessage): Promise<Ingested | null> {
  const messageId = messageIdOf(message);
  if (!messageId) return null;
  const subject = subjectOf(message);

  const existing = await existingItem(messageId, subject);
  if (existing) {
    await markMailSeen(messageId);
    return { item: existing };
  }

  const deal = await extractDealFromEmail({ subject, body: message.messageText ?? "" });
  await markMailSeen(messageId);
  if (!deal.isDealNotification) return { item: { messageId, subject, status: "ignored" } };

  const client = await insertClient({
    name: deal.customerName || "Unknown customer",
    contactName: deal.contactName,
    contactEmail: deal.contactEmail,
    aeName: deal.aeName,
    aeEmail: deal.aeEmail,
    aePhone: deal.aePhone,
    opportunityUrl: deal.opportunityUrl,
    gmailMessageId: messageId,
  });
  return { item: { messageId, subject, status: "created", clientId: client.id }, created: client };
}

export async function ingestInbox(opts?: { query?: string; max?: number }): Promise<{
  scanned: number;
  created: Client[];
  items: IngestItem[];
}> {
  const data = await fetchRecentEmails(opts?.query?.trim() || "newer_than:2d", opts?.max ?? 12);
  const items: IngestItem[] = [];
  const created: Client[] = [];
  for (const message of messagesFrom(data)) {
    const result = await ingest(message);
    if (!result) continue;
    items.push(result.item);
    if (result.created) created.push(result.created);
  }
  return { scanned: items.length, created, items };
}

export async function ingestByMessageId(messageId: string): Promise<IngestItem | null> {
  const existing = await existingItem(messageId, "");
  if (existing) return existing;
  const message = (await fetchEmail(messageId)) as GmailMessage;
  const result = await ingest({ ...message, messageId: messageIdOf(message) || messageId });
  return result?.item ?? null;
}
