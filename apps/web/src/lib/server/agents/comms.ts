import "server-only";
import { z } from "zod";
import type { ChannelOutput, CustomerEmailOutput, OnboardingDetailsOutput, WelcomeOutput } from "@/lib/step-outputs";
import type { Deal, Step } from "@/lib/types";
import { runComposioTool } from "../composio";
import { sendEmail } from "../gmail";
import { getProjectTemplate } from "../rocketlane";
import { withSlackFallback } from "../slack-mode";
import { errorMessage, firstName, isEmail, isRecord, str } from "../util";
import { defineTool, type Agent } from "./framework";

/** Slack channel names: lowercase letters, digits, hyphens and underscores, at most 80 characters. */
function toChannelName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function requireProject(deal: Deal): asserts deal is Deal & { planName: string } {
  if (!deal.rocketlaneProjectId || !deal.planName) {
    throw new Error("Intake hasn't created the Rocketlane project yet, so there's nothing to announce.");
  }
}

/** Creates the channel, adding -2, -3… if the name is taken. Returns its id and final name. */
async function createChannel(name: string): Promise<{ id: string; name: string }> {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const candidate = attempt === 1 ? name : `${name.slice(0, 76)}-${attempt}`;
    try {
      const data = await runComposioTool("slack", "SLACK_CREATE_CHANNEL", { name: candidate, is_private: false });
      const channel = isRecord(data) && isRecord(data.channel) ? data.channel : null;
      const id = str(channel?.id);
      if (!id) throw new Error("Slack didn't return a channel id");
      return { id, name: str(channel?.name) || candidate };
    } catch (error) {
      if (!/name_taken/i.test(errorMessage(error, ""))) throw error;
    }
  }
  throw new Error(`Every variant of #${name} is taken in Slack.`);
}

function hasDetails(steps: Step[]): boolean {
  return steps.some((step) => step.tool === "get_onboarding_details" && step.status === "done");
}

const getOnboardingDetails = defineTool({
  description:
    "Get everything needed to welcome the customer: the contact, the AE, the confirmed plan, and the Rocketlane project " +
    "with its template's phases, timeline and staffing (a dedicated CSM by name, or a pooled CSM team). Always the first step.",
  input: z.object({}),
  available: ({ steps }) => !hasDetails(steps),
  title: () => "Reading the onboarding plan",
  doneTitle: (output: OnboardingDetailsOutput) => `Read the ${output.template.name} plan`,
  async execute(_input, ctx): Promise<OnboardingDetailsOutput> {
    const { deal } = ctx;
    requireProject(deal);
    if (!deal.rocketlaneTemplateId) throw new Error("The project's template wasn't recorded, so its plan can't be read.");
    const template = await getProjectTemplate(deal.rocketlaneTemplateId);
    return {
      customerName: deal.customerName!,
      contactName: deal.contactName!,
      contactEmail: deal.contactEmail!,
      aeName: deal.aeName!,
      plan: deal.planName,
      projectName: deal.rocketlaneProjectName ?? template.name,
      startDate: deal.projectStartDate,
      dueDate: deal.projectDueDate,
      template,
    };
  },
});

const createSlackChannel = defineTool({
  description:
    "Create the customer's onboarding channel in Slack and set its topic. Slack names are lowercase letters, digits, " +
    "hyphens and underscores, up to 80 characters; anything else is converted. If the name is taken, a number is added.",
  input: z.object({
    name: z.string().describe("The channel name you chose for this customer's onboarding"),
    topic: z.string().max(250).describe("A one-line channel topic, based on the onboarding details"),
  }),
  available: ({ deal, steps }) => hasDetails(steps) && !deal.slackChannelId,
  title: ({ name }) => `Creating #${toChannelName(name)} in Slack`,
  doneTitle: (output: ChannelOutput) => `Created #${output.name}`,
  async execute({ name, topic }, ctx): Promise<ChannelOutput> {
    requireProject(ctx.deal);
    const channelName = toChannelName(name);
    if (!channelName) throw new Error("That channel name has no usable characters.");

    const result = await withSlackFallback(
      async () => {
        const channel = await createChannel(channelName);
        await runComposioTool("slack", "SLACK_SET_THE_TOPIC_OF_A_CONVERSATION", { channel: channel.id, topic });
        return channel;
      },
      { id: `C_SIMULATED_${channelName}`, name: channelName },
    );
    const channel = result.mock ? { id: result.id, name: result.name } : (result.data as { id: string; name: string });

    await ctx.updateDeal({ slackChannelId: channel.id, slackChannelName: channel.name, slackSimulated: result.mock });
    return { channelId: channel.id, name: channel.name, topic, simulated: result.mock };
  },
});

const postWelcomeMessage = defineTool({
  description: "Post the welcome message in the customer's onboarding channel.",
  input: z.object({
    text: z.string().describe("The welcome message, in Slack markdown"),
  }),
  available: ({ deal }) => Boolean(deal.slackChannelId) && !deal.slackWelcomeAt,
  title: (_input, deal) => `Posting the welcome message in #${deal.slackChannelName ?? "the channel"}`,
  doneTitle: (_output, _input, deal) => `Posted the welcome message in #${deal.slackChannelName}`,
  async execute({ text }, ctx): Promise<WelcomeOutput> {
    const { slackChannelId, slackChannelName, slackSimulated } = ctx.deal;
    if (!slackChannelId || !slackChannelName) throw new Error("Create the Slack channel first.");

    const result = slackSimulated
      ? { mock: true }
      : await withSlackFallback(
          () =>
            runComposioTool("slack", "SLACK_CHAT_POST_MESSAGE", {
              channel: slackChannelId,
              markdown_text: text,
              text,
            }),
          {},
        );
    await ctx.updateDeal({ slackWelcomeAt: new Date().toISOString() });
    return { channelName: slackChannelName, text, simulated: result.mock };
  },
});

const emailCustomer = defineTool({
  description:
    "Email the customer contact (copying the AE) to welcome them and invite them to the onboarding Slack channel. " +
    "The body must name the channel. Plain text.",
  input: z.object({
    subject: z.string().min(3).describe("Email subject"),
    body: z.string().min(20).describe("Plain-text email body, signed as NovaCRM Customer Success"),
  }),
  available: ({ deal }) => Boolean(deal.slackWelcomeAt) && !deal.customerEmailedAt,
  title: (_input, deal) => `Emailing ${firstName(deal.contactName) ?? "the customer"} about the channel`,
  doneTitle: (output: CustomerEmailOutput) => `Emailed ${output.to}`,
  async execute({ subject, body }, ctx): Promise<CustomerEmailOutput> {
    const { contactEmail, aeEmail, slackChannelName } = ctx.deal;
    if (!contactEmail || !isEmail(contactEmail)) throw new Error("There's no valid contact email to write to.");
    if (!slackChannelName) throw new Error("Create the Slack channel first.");
    if (!body.includes(slackChannelName)) {
      throw new Error(`The email has to name the channel, #${slackChannelName}, so the customer knows where to join.`);
    }
    const cc = aeEmail && isEmail(aeEmail) && aeEmail !== contactEmail ? [aeEmail] : [];
    await sendEmail({ to: contactEmail, cc, subject, body });
    await ctx.updateDeal({ customerEmailedAt: new Date().toISOString() });
    return { to: contactEmail, cc, subject, body };
  },
});

export const commsAgent: Agent = {
  name: "comms",
  instructions: `You are NovaCRM's Communication agent. Intake has confirmed the customer's plan and created their
Rocketlane onboarding project. Give the customer a place to talk to the onboarding team, and tell them about it.

1. get_onboarding_details.
2. create_slack_channel. Choose a short, clear channel name for this customer's onboarding, and a one-line topic
   from the details (customer, plan, timeline, who their CSM is).
3. post_welcome_message, written for the customer contact by name. Make it specific to their plan, the project's real
   phases and timeline, and its staffing: introduce a dedicated CSM by name, or explain a pooled CSM team. Mention
   their AE by name. Use Slack markdown (*bold*, bullet lines),
   keep it warm and brief.
4. email_customer: invite the contact to the channel by name, say what happens next in their onboarding, and copy the AE.
5. finish with "done".
Use only facts from the tools. Never promise anything the details don't support.`,
  tools: {
    get_onboarding_details: getOnboardingDetails,
    create_slack_channel: createSlackChannel,
    post_welcome_message: postWelcomeMessage,
    email_customer: emailCustomer,
  },
  prompt: (deal) =>
    `Intake finished for ${deal.customerName ?? "a customer"} on ${deal.planName ?? "their confirmed plan"} ` +
    `(deal ${deal.id}). Set up their onboarding communication.`,
  verify(deal) {
    if (!deal.slackChannelId) return "The Slack channel wasn't created.";
    if (!deal.slackWelcomeAt) return "The welcome message wasn't posted.";
    if (!deal.customerEmailedAt) return "The customer wasn't emailed about the channel.";
    return null;
  },
};
