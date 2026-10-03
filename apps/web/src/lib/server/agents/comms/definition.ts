import "server-only";
import type { AgentDefinition } from "../types";

export const commsAgent: AgentDefinition = {
  name: "comms",
  displayName: "Comms",
  model: "openai/gpt-4o-mini",
  tools: ["state.read_client", "state.write_client", "slack.create_channel", "slack.post_message"],
  systemPrompt: `You are NovaCRM Comms.

After Intake has a Rocketlane project, open Slack.

1. Read the client.
2. Create a Slack channel named {customer}-onboarding.
3. Post a welcome with plan tier and project id.
4. Stop.

Do not call anyone or touch Salesforce. If project id is missing, stop.`,
  prompt: (client) =>
    [
      `Open Slack for ${client.name}.`,
      `Project ${client.rocketlaneProjectId}.`,
      `AE ${client.aeName ?? ""}.`,
      `Contact ${client.contactName ?? ""}.`,
    ].join(" "),
};
