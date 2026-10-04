/**
 * A deterministic stand-in for the LLM that drives the agents. Each turn it sees what a real model
 * would — the system prompt, the tools currently offered, and every tool result so far — and makes
 * the call a careful model following the instructions would make.
 *
 * Tests exercise the code around the model: which tools are offered when, what the tools check,
 * how runs end. Tests can change one decision through `behavior` (e.g. pick the wrong template).
 */
import { MockLanguageModelV4 } from "ai/test";
import type { CallOutput, OnboardingDetailsOutput, ReadEmailOutput, TemplatesOutput } from "@/lib/step-outputs";

type ToolResult = { tool: string; output: unknown; error: string | null };

type Turn = { system: string; prompt: string; tools: string[]; results: ToolResult[] };

type Call = { tool: string; input: Record<string, unknown> };

export const behavior: {
  /** Which templates the model offers on the call. Defaults to all of them. */
  offerTemplates?: (templates: TemplatesOutput["templates"]) => string[];
} = {};

export function resetBehavior(): void {
  delete behavior.offerTemplates;
}

export function scriptedModel() {
  let calls = 0;
  return new MockLanguageModelV4({
    doGenerate: async (options) => {
      const turn = readTurn(options as unknown as RawOptions);
      const next = turn.system.includes("Intake agent") ? intake(turn) : comms(turn);
      calls += 1;
      return {
        content: [
          {
            type: "tool-call",
            toolCallId: `call_${calls}`,
            toolName: next.tool,
            input: JSON.stringify(next.tool === "finish" ? next.input : { ...next.input, why: "This is the next step." }),
          },
        ],
        finishReason: { unified: "tool-calls", raw: undefined },
        usage: {
          inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 0, text: 0, reasoning: 0 },
        },
        warnings: [],
      };
    },
  });
}

// —— Intake ————————————————————————————————————————————————————————————————

function intake(turn: Turn): Call {
  const last = turn.results.at(-1);
  const offered = (tool: string) => turn.tools.includes(tool);

  if (last?.error) return finish("attention", last.error);
  if (last?.tool === "read_handoff_email" && (last.output as ReadEmailOutput).missing.includes("aePhone")) {
    return finish("attention", "There's no number to call the AE on.");
  }
  if (last?.tool === "call_ae_to_confirm_plan") {
    const call = last.output as CallOutput;
    if (call.outcome !== "confirmed") return finish("attention", `The call ended with "${call.outcome}".`);
    if (call.stillMissing.length) return finish("attention", `Still missing: ${call.stillMissing.join(", ")}.`);
  }

  if (offered("read_handoff_email")) return { tool: "read_handoff_email", input: {} };
  if (offered("list_project_templates")) return { tool: "list_project_templates", input: {} };
  if (offered("call_ae_to_confirm_plan")) {
    const templates = (turn.results.findLast((r) => r.tool === "list_project_templates")?.output as TemplatesOutput).templates;
    const templateIds = behavior.offerTemplates?.(templates) ?? templates.map((t) => t.templateId);
    return { tool: "call_ae_to_confirm_plan", input: { templateIds } };
  }
  if (offered("create_rocketlane_project")) {
    return { tool: "create_rocketlane_project", input: { projectName: `${customer(turn)} onboarding` } };
  }
  return finish("done", "Intake is complete.");
}

function customer(turn: Turn): string {
  const read = turn.results.findLast((r) => r.tool === "read_handoff_email")?.output as ReadEmailOutput | undefined;
  const call = turn.results.findLast((r) => r.tool === "call_ae_to_confirm_plan")?.output as CallOutput | undefined;
  return call?.collected.customerName ?? read?.fields.customerName ?? "Customer";
}

// —— Communication —————————————————————————————————————————————————————————

function comms(turn: Turn): Call {
  const last = turn.results.at(-1);
  const offered = (tool: string) => turn.tools.includes(tool);
  if (last?.error) return finish("attention", last.error);

  const details = turn.results.find((r) => r.tool === "get_onboarding_details")?.output as OnboardingDetailsOutput | undefined;
  const channel = (turn.results.find((r) => r.tool === "create_slack_channel")?.output as { name?: string } | undefined)?.name;

  if (offered("get_onboarding_details")) return { tool: "get_onboarding_details", input: {} };
  if (offered("create_slack_channel") && details) {
    return {
      tool: "create_slack_channel",
      input: {
        name: `${details.customerName} onboarding`,
        topic: `${details.customerName} · ${details.plan} · ${details.template.workingDays} working days · ${csm(details)}`,
      },
    };
  }
  if (offered("post_welcome_message") && details) {
    const contact = details.contactName.split(" ")[0];
    const phases = details.template.phases.map((phase) => `• ${phase.name}`).join("\n");
    return {
      tool: "post_welcome_message",
      input: {
        text:
          `Welcome, ${contact}! Your *${details.plan}* starts now, with ${csm(details)}.\n` +
          `${phases}\nYour AE ${details.aeName} is here too.`,
      },
    };
  }
  if (offered("email_customer") && details && channel) {
    return {
      tool: "email_customer",
      input: {
        subject: `Welcome to NovaCRM, ${details.customerName}`,
        body: `Hi ${details.contactName},\n\nYour onboarding channel is #${channel}. We'll add you there.\n\nNovaCRM Customer Success`,
      },
    };
  }
  return finish("done", "The customer has a channel, a welcome and an email.");
}

function csm(details: OnboardingDetailsOutput): string {
  const staffing = details.template.staffing;
  return staffing.model === "dedicated" ? `your dedicated CSM ${staffing.csm}` : "our pooled CSM team";
}

function finish(outcome: "done" | "attention", summary: string): Call {
  return { tool: "finish", input: { outcome, summary } };
}

// —— Reading the request ———————————————————————————————————————————————————

type RawPart = { type: string; text?: string; toolName?: string; toolCallId?: string; output?: { type: string; value: unknown } };
type RawOptions = {
  prompt: Array<{ role: string; content: string | RawPart[] }>;
  tools?: Array<{ name: string }>;
};

function readTurn(options: RawOptions): Turn {
  const system = options.prompt.filter((m) => m.role === "system").map((m) => String(m.content)).join("\n");
  const prompt = options.prompt
    .filter((m) => m.role === "user")
    .flatMap((m) => (typeof m.content === "string" ? [m.content] : m.content.map((part) => part.text ?? "")))
    .join("\n");
  const results = options.prompt
    .filter((m) => m.role === "tool" && Array.isArray(m.content))
    .flatMap((m) => m.content as RawPart[])
    .filter((part) => part.type === "tool-result")
    .map((part): ToolResult => {
      const output = part.output;
      const isError = output?.type === "error-text" || output?.type === "error-json";
      return {
        tool: part.toolName ?? "",
        output: isError ? null : output?.value,
        error: isError ? String(typeof output?.value === "string" ? output.value : JSON.stringify(output?.value)) : null,
      };
    })
    // The finish tool's "not finished yet" answer isn't a tool step; skip it when reasoning about steps.
    .filter((result) => result.tool !== "finish");
  return { system, prompt, tools: (options.tools ?? []).map((t) => t.name), results };
}
