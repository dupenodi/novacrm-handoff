/**
 * Stand-in for `src/lib/server/composio.ts`: answers the Composio tools the app uses (Gmail,
 * Rocketlane, Slack) from the shared world, in the shapes the real tools return.
 */
import { world } from "./world";

type Args = Record<string, unknown>;

export function isComposioConfigured(): boolean {
  return true;
}

export async function getActiveAccountId(toolkit: string): Promise<string> {
  return `ca_${toolkit}`;
}

export async function runComposioTool(_toolkit: string, slug: string, args: Args = {}): Promise<unknown> {
  const failures = world.failures.get(slug) ?? 0;
  if (failures > 0) {
    world.failures.set(slug, failures - 1);
    throw new Error(`${slug} failed. Status code: 500. Response: {"errors":[{"errorCode":"INTERNAL_SERVER_ERROR"}]}`);
  }
  const handler = TOOLS[slug];
  if (!handler) throw new Error(`The test fake has no Composio tool ${slug}`);
  return handler(args);
}

export async function proxyComposio(
  _toolkit: string,
  request: { endpoint: string; method: string; body?: unknown },
): Promise<unknown> {
  if (request.method === "POST" && request.endpoint === "/1.0/companies") {
    const body = request.body as { companyName: string; accountOwner?: { emailId?: string } };
    if (!body.accountOwner?.emailId) throw new Error("accountOwner is required when creating a company");
    const company = { id: 6000 + world.rocketlane.companies.length, name: body.companyName };
    world.rocketlane.companies.push(company);
    return { companyId: company.id, companyName: company.name };
  }
  throw new Error(`The test fake has no proxy route ${request.method} ${request.endpoint}`);
}

const mailRow = (mail: (typeof world.gmail.inbox)[number]) => ({
  messageId: mail.id,
  threadId: mail.threadId,
  sender: mail.sender,
  subject: mail.subject,
  messageText: mail.body,
  messageTimestamp: mail.receivedAt,
});

const TOOLS: Record<string, (args: Args) => unknown> = {
  // —— Gmail ——
  GMAIL_FETCH_EMAILS: (args) => ({
    messages: [...world.gmail.inbox]
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
      .slice(0, Number(args.max_results ?? 15))
      .map(mailRow),
  }),
  GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID: (args) => {
    const mail = world.gmail.inbox.find((m) => m.id === args.message_id);
    return mail ? mailRow(mail) : null;
  },
  GMAIL_FETCH_MESSAGE_BY_THREAD_ID: (args) => ({
    messages: world.gmail.inbox.filter((m) => m.threadId === args.thread_id).map(mailRow),
  }),
  GMAIL_REPLY_TO_THREAD: (args) => {
    world.gmail.replies.push({
      threadId: String(args.thread_id),
      to: String(args.recipient_email),
      subject: args.subject as string | undefined,
      body: String(args.message_body),
    });
    return { id: "reply" };
  },
  GMAIL_SEND_EMAIL: (args) => {
    world.gmail.sent.push({
      to: String(args.recipient_email),
      cc: (args.cc as string[]) ?? [],
      subject: String(args.subject),
      body: String(args.body),
    });
    return { id: "sent" };
  },

  // —— Rocketlane ——
  ROCKETLANE_LIST_TEMPLATES: (args) => {
    if (args.object_type !== "PROJECT") throw new Error("object_type is required");
    return { templates: world.rocketlane.templates.map((t) => ({ template_id: t.templateId, name: t.name })) };
  },
  ROCKETLANE_GET_TEMPLATE_BY_ID: (args) => {
    const template = world.rocketlane.templates.find((t) => String(t.templateId) === String(args.template_id));
    if (!template) throw new Error(`Template with ID '${args.template_id}' not found`);
    return {
      templateId: template.templateId,
      templateName: template.name,
      templateContent: {
        duration: template.workingDays,
        projectPhases: template.phases.map((phase) => ({
          projectPhaseName: phase.name,
          tasks: Array.from({ length: phase.tasks }, (_, i) => ({
            taskId: i,
            assignee: {
              teams: [{ teamName: "Customer success" }],
              users: template.csm && i % 2 === 0 ? [template.csm] : [],
            },
          })),
        })),
      },
    };
  },
  ROCKETLANE_LIST_COMPANIES: () => ({ companies: world.rocketlane.companies.map((c) => ({ id: String(c.id), name: c.name })) }),
  ROCKETLANE_LIST_PROJECTS: () => ({
    data: world.rocketlane.projects.map((p) => ({
      projectId: p.projectId,
      projectName: p.projectName,
      archived: p.archived,
      customer: {
        companyId: p.companyId,
        companyName: world.rocketlane.companies.find((c) => c.id === p.companyId)?.name,
      },
    })),
  }),
  ROCKETLANE_CREATE_PROJECT: (args) => {
    const customer = args.customer as { companyId?: number };
    if (!world.rocketlane.companies.some((c) => c.id === customer.companyId)) {
      throw new Error("Bad Request: No customer company found for provided value");
    }
    const sources = args.sources as Array<{ templateId: number }>;
    const project = {
      projectId: 7000 + world.rocketlane.projects.length,
      projectName: String(args.projectName),
      companyId: customer.companyId!,
      templateId: sources?.[0]?.templateId ?? null,
      startDate: String(args.startDate),
      dueDate: String(args.dueDate),
      archived: false,
    };
    world.rocketlane.projects.push(project);
    return { projectId: project.projectId };
  },

  // —— Slack ——
  SLACK_CREATE_CHANNEL: (args) => {
    const name = String(args.name);
    if (world.slack.channels.some((c) => c.name === name)) throw new Error("name_taken");
    const channel = { id: `C${world.slack.channels.length + 1}`, name, topic: "" };
    world.slack.channels.push(channel);
    return { channel: { id: channel.id, name: channel.name } };
  },
  SLACK_SET_THE_TOPIC_OF_A_CONVERSATION: (args) => {
    const channel = world.slack.channels.find((c) => c.id === args.channel);
    if (!channel) throw new Error("channel_not_found");
    channel.topic = String(args.topic);
    return { ok: true };
  },
  SLACK_CHAT_POST_MESSAGE: (args) => {
    world.slack.messages.push({ channel: String(args.channel), text: String(args.markdown_text ?? args.text) });
    return { ok: true };
  },
};
