import "server-only";
import { fetchEmail, fetchRecentEmails, replyToThread } from "../../gmail";
import { registerTool } from "../registry";

registerTool({
  name: "gmail.fetch_recent",
  description:
    "Fetch recent Gmail inbox messages via Composio. Optional Gmail search query (e.g. newer_than:7d).",
  agents: ["intake"],
  composioSlug: "GMAIL_FETCH_EMAILS",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Gmail search query. Default: newer_than:7d" },
      max_results: { type: "integer", description: "Max messages (default 20)" },
    },
  },
  execute: (input: { query?: string; max_results?: number }) =>
    fetchRecentEmails(input.query?.trim() || undefined, input.max_results),
});

registerTool({
  name: "gmail.get_message",
  description: "Hydrate one Gmail message by message id (full body).",
  agents: ["intake"],
  composioSlug: "GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID",
  inputSchema: {
    type: "object",
    required: ["message_id"],
    properties: {
      message_id: { type: "string" },
      format: { type: "string", enum: ["full", "metadata", "minimal", "raw"] },
    },
  },
  execute: (input: { message_id: string; format?: string }) => fetchEmail(input.message_id, input.format),
});

registerTool({
  name: "gmail.reply",
  description: "Reply on a Gmail thread asking the AE for missing handoff fields.",
  agents: ["intake"],
  composioSlug: "GMAIL_REPLY_TO_THREAD",
  inputSchema: {
    type: "object",
    required: ["thread_id", "message_body", "recipient_email"],
    properties: {
      thread_id: { type: "string" },
      message_body: { type: "string" },
      recipient_email: { type: "string" },
      subject: { type: "string" },
    },
  },
  execute: (input: { thread_id: string; message_body: string; recipient_email: string; subject?: string }) =>
    replyToThread({
      threadId: input.thread_id,
      body: input.message_body,
      recipientEmail: input.recipient_email,
      subject: input.subject,
    }),
});
