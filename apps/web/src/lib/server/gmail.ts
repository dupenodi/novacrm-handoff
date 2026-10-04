import "server-only";
import { runComposioTool } from "./composio";
import { isRecord, str } from "./util";

/** Gmail calls go through Composio on the connected inbox. */
const ME = "me";

/** A Gmail message, reduced to what the app uses. */
export type MailMessage = {
  id: string;
  threadId: string | null;
  sender: string | null;
  subject: string | null;
  body: string;
  receivedAt: string | null;
};

/** Longest body we keep or send to the model. */
const MAX_BODY = 8000;

export async function fetchRecentMessages(query: string, maxResults: number): Promise<MailMessage[]> {
  const data = await runComposioTool("gmail", "GMAIL_FETCH_EMAILS", {
    query,
    max_results: maxResults,
    user_id: ME,
    include_payload: true,
  });
  return messagesIn(data);
}

export async function fetchMessage(messageId: string): Promise<MailMessage | null> {
  const data = await runComposioTool("gmail", "GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID", {
    message_id: messageId,
    format: "full",
    user_id: ME,
  });
  return toMessage(data);
}

/** Every message in a thread, oldest first. */
export async function fetchThread(threadId: string): Promise<MailMessage[]> {
  const data = await runComposioTool("gmail", "GMAIL_FETCH_MESSAGE_BY_THREAD_ID", { thread_id: threadId, user_id: ME });
  return messagesIn(data).sort((a, b) => (a.receivedAt ?? "").localeCompare(b.receivedAt ?? ""));
}

/** Sends a new email (not a reply) from the connected inbox. */
export function sendEmail(input: { to: string; cc?: string[]; subject: string; body: string }): Promise<unknown> {
  return runComposioTool("gmail", "GMAIL_SEND_EMAIL", {
    recipient_email: input.to,
    cc: input.cc ?? [],
    subject: input.subject,
    body: input.body,
    is_html: false,
    user_id: ME,
  });
}

function messagesIn(data: unknown): MailMessage[] {
  const list = isRecord(data) ? (data.messages ?? data.emails) : null;
  return Array.isArray(list) ? list.map(toMessage).filter((message): message is MailMessage => message !== null) : [];
}

function toMessage(raw: unknown): MailMessage | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.messageId) || str(raw.message_id) || str(raw.id);
  if (!id) return null;
  return {
    id,
    threadId: str(raw.threadId) || str(raw.thread_id) || null,
    sender: str(raw.sender) || header(raw, "from") || null,
    subject: str(raw.subject) || header(raw, "subject") || null,
    body: bodyOf(raw).slice(0, MAX_BODY),
    receivedAt: timestampOf(raw),
  };
}

function header(raw: Record<string, unknown>, name: string): string {
  const payload = isRecord(raw.payload) ? raw.payload : null;
  const headers = Array.isArray(payload?.headers) ? payload.headers : [];
  const match = headers.find((h) => isRecord(h) && str(h.name).toLowerCase() === name);
  return isRecord(match) ? str(match.value) : "";
}

/** Plain text when Gmail has it; HTML-only mail falls back to the preview text. */
function bodyOf(raw: Record<string, unknown>): string {
  const text = str(raw.messageText);
  if (text && text !== "Please Enable HTML") return text;
  const preview = isRecord(raw.preview) ? str(raw.preview.body) : "";
  return preview || text;
}

function timestampOf(raw: Record<string, unknown>): string | null {
  const value = str(raw.messageTimestamp) || str(raw.internalDate);
  if (!value) return null;
  const date = /^\d+$/.test(value) ? new Date(Number(value)) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
