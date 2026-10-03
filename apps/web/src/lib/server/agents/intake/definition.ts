import "server-only";
import type { AgentDefinition } from "../types";

export const intakeAgent: AgentDefinition = {
  name: "intake",
  displayName: "Intake",
  model: "openai/gpt-4o-mini",
  tools: [
    "state.read_client",
    "state.write_client",
    "gmail.get_message",
    "salesforce.get_opportunity",
    "salesforce.search_account",
    "voice.call_ae",
    "rocketlane.list_projects",
    "rocketlane.create_project",
  ],
  systemPrompt: `You are NovaCRM Intake.

Turn a closed-won AE handoff into a confirmed Growth or Enterprise plan and a Rocketlane project.

Do this in order:
1. Read the client from state.
2. Enrich from Salesforce if an opportunity URL or account name exists. Missing URL is fine.
3. If plan tier is unknown, call voice.call_ae. Never guess Growth vs Enterprise.
4. Create the Rocketlane project from the matching template.
5. Write rocketlane project id and stop.

Never invent emails, phones, names, or tiers.`,
  prompt: (client) =>
    [
      `Process ${client.name}.`,
      `Contact ${client.contactName ?? "unknown"} ${client.contactEmail ?? ""}.`,
      `AE ${client.aeName ?? "unknown"} ${client.aePhone ?? ""} ${client.aeEmail ?? ""}.`,
      `Opportunity ${client.opportunityUrl ?? "none"}.`,
      `Gmail ${client.gmailMessageId ?? "none"}.`,
      "Confirm tier by voice if needed, then create the Rocketlane project.",
    ].join(" "),
};
