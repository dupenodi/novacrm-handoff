import "server-only";
import { updateClient } from "../../clients-store";
import { runComposioTool } from "../../composio";
import { withSlackFallback } from "../../slack-mode";
import { registerTool } from "../registry";

/** Slack channel names: lowercase letters, digits, hyphens and underscores, max 80 chars. */
function toChannelName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

registerTool({
  name: "slack.create_channel",
  description:
    "Create a Slack onboarding channel (lowercase, hyphens). Uses real Composio Slack when connected; falls back to mock if unavailable (unless SLACK_MODE=real_strict).",
  agents: ["comms"],
  composioSlug: "SLACK_CREATE_CHANNEL",
  inputSchema: {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string", description: "Channel name without # (e.g. acme-logistics-onboarding)" },
      is_private: { type: "boolean" },
    },
  },
  async execute(input: { name: string; is_private?: boolean }, ctx) {
    const name = toChannelName(input.name);
    const result = await withSlackFallback(
      () => runComposioTool("slack", "SLACK_CREATE_CHANNEL", { name, is_private: input.is_private ?? false }),
      { channel: { id: `C_MOCK_${name}`, name } },
    );
    await updateClient(ctx.clientId, { slackChannel: `#${name}`, stage: "comms" });
    return result;
  },
});

registerTool({
  name: "slack.post_message",
  description:
    "Post a welcome message to a Slack channel. Real Composio when connected; mock fallback otherwise.",
  agents: ["comms"],
  composioSlug: "SLACK_CHAT_POST_MESSAGE",
  inputSchema: {
    type: "object",
    required: ["channel", "text"],
    properties: {
      channel: { type: "string", description: "Channel id (C…) or #name" },
      text: { type: "string" },
    },
  },
  execute: (input: { channel: string; text: string }) =>
    withSlackFallback(
      () =>
        runComposioTool("slack", "SLACK_CHAT_POST_MESSAGE", {
          channel: input.channel.replace(/^#/, ""),
          markdown_text: input.text,
          text: input.text,
        }),
      { channel: input.channel, text: input.text },
    ),
});
