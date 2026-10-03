import "server-only";
import { runComposioTool } from "./composio";

/** Gmail calls go through Composio on the connected inbox. */
const ME = "me";

export function fetchRecentEmails(query = "newer_than:7d", maxResults = 20): Promise<unknown> {
  return runComposioTool("gmail", "GMAIL_FETCH_EMAILS", {
    query,
    max_results: maxResults,
    user_id: ME,
  });
}

export function fetchEmail(messageId: string, format = "full"): Promise<unknown> {
  return runComposioTool("gmail", "GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID", {
    message_id: messageId,
    format,
    user_id: ME,
  });
}

export function replyToThread(input: {
  threadId: string;
  body: string;
  recipientEmail: string;
  subject?: string;
}): Promise<unknown> {
  return runComposioTool("gmail", "GMAIL_REPLY_TO_THREAD", {
    thread_id: input.threadId,
    message_body: input.body,
    recipient_email: input.recipientEmail,
    ...(input.subject ? { subject: input.subject } : {}),
    user_id: ME,
  });
}
