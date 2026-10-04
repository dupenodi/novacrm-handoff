import "server-only";
import { generateText, isStepCount, tool, type ToolSet } from "ai";
import { z } from "zod";
import type { AgentName, Deal, Run, RunStatus, Step } from "@/lib/types";
import { insertRow, listRows, newId, updateRow } from "../db";
import { agentModel } from "../llm";
import { getDeal, updateDeal } from "../store";
import { errorMessage } from "../util";

/**
 * A small agent runtime: an agent is instructions, a prompt built from the deal, and tools.
 * Every tool call is written to `novacrm_run_steps` with a human title, the model's reason,
 * inputs, outputs and timing. A run ends when the agent calls `finish`, and code — not the
 * model — has the last word on whether the run actually succeeded (`verify`).
 *
 * Before each model step, tools whose `available` check fails are hidden from the model, so an
 * agent can't skip ahead (create a project before the plan is confirmed) or repeat finished work.
 */

export type ToolContext = {
  /** The deal as it was right before this tool call. */
  deal: Deal;
  run: Run;
  updateDeal(patch: Partial<Deal>): Promise<Deal>;
  /** Updates the running step's title or interim output, for long steps like a phone call. */
  progress(update: { title?: string; output?: unknown }): Promise<void>;
};

type ObjectSchema = z.ZodObject<z.ZodRawShape>;

export type AgentTool<S extends ObjectSchema = ObjectSchema, O = unknown> = {
  description: string;
  input: S;
  /** What the step says while it runs, e.g. "Calling Jordan to confirm the plan". */
  title(input: z.infer<S>, deal: Deal): string;
  /** What it says once finished. Defaults to `title`. */
  doneTitle?(output: O, input: z.infer<S>, deal: Deal): string;
  execute(input: z.infer<S>, ctx: ToolContext): Promise<O>;
  /** Whether the model may call this tool right now. Defaults to always. */
  available?(state: { deal: Deal; steps: Step[] }): boolean;
};

export function defineTool<S extends ObjectSchema, O>(definition: AgentTool<S, O>): AgentTool<S, O> {
  return definition;
}

export type Agent = {
  name: AgentName;
  instructions: string;
  // Tools have different input and output types; each is checked where it's defined.
  tools: Record<string, AgentTool<any, any>>;
  prompt(deal: Deal): string;
  /** Returns why a run that reported success hasn't actually finished the job, or null if it has. */
  verify(deal: Deal): string | null;
  maxSteps?: number;
};

export type RunOutcome = { status: Exclude<RunStatus, "running">; summary: string };

const WHY =
  "One short, complete sentence for the CS team on why this step is needed, starting with a capital letter. " +
  "Example: \"The email doesn't say which plan Acme signed.\"";

const SHARED_RULES = `
Rules for every run:
- Work only from tool results and the facts you are given. Never invent names, emails, phone numbers, plans or ids.
- Every tool takes a "why": one plain, complete sentence for the customer success team.
- Only the tools that make sense right now are offered. If none fit, call finish.
- Finish every run by calling finish exactly once. Use outcome "done" only when the job is complete.
  Use "attention" when a person has to step in, and say plainly what they need to do.
- Keep any text you write short and plain. No markdown headings.`;

const finishInput = z.object({
  outcome: z.enum(["done", "attention"]),
  summary: z
    .string()
    .describe("One or two sentences for the CS team: what happened, and what a person must do next if anything."),
});

export async function runAgent(agent: Agent, dealId: string): Promise<RunOutcome> {
  const deal = await getDeal(dealId);
  if (!deal) throw new Error(`Deal not found: ${dealId}`);

  const run = await insertRow<Run>("novacrm_runs", {
    id: newId("run"),
    dealId,
    agent: agent.name,
    status: "running",
  });
  await updateDeal(dealId, { status: agent.name, attention: null });

  let reported: RunOutcome | null = null;
  // Notes are written when a model call ends; tool steps wait for them so the log stays in order.
  let pendingNote: Promise<unknown> = Promise.resolve();

  const tools: ToolSet = {};
  for (const [name, definition] of Object.entries(agent.tools)) {
    tools[name] = tool({
      description: definition.description,
      inputSchema: definition.input.extend({ why: z.string().describe(WHY) }),
      execute: async ({ why, ...input }: Record<string, unknown>) => {
        await pendingNote;
        return runStep(name, definition, input, typeof why === "string" ? why : null, run);
      },
    });
  }
  tools.finish = tool({
    description: "End the run and report the outcome to the CS team.",
    inputSchema: finishInput,
    execute: async (input) => {
      // A model can call finish in the same step as its last real tool, before that work exists.
      // "done" only ends the run once the job checks out; otherwise the agent is told what's left.
      if (input.outcome === "done") {
        await pendingNote;
        const current = await getDeal(dealId);
        const gap = current ? agent.verify(current) : null;
        if (gap) return { ok: false, notFinished: `${gap} Do that before finishing.` };
      }
      reported = { status: input.outcome, summary: input.summary.trim() };
      return { ok: true };
    },
  });

  let outcome: RunOutcome;
  try {
    await generateText({
      model: agentModel(),
      system: `${agent.instructions.trim()}\n${SHARED_RULES}`,
      prompt: agent.prompt(deal),
      tools,
      stopWhen: [isStepCount(agent.maxSteps ?? 12), () => reported !== null],
      prepareStep: async () => ({ activeTools: await availableTools(agent, run) }),
      onLanguageModelCallEnd: ({ content }) => {
        const text = content
          .flatMap((part) => (part.type === "text" ? [part.text] : []))
          .join("")
          .trim();
        if (text) pendingNote = pendingNote.then(() => addNote(run, text));
      },
    });
    await pendingNote;
    outcome = settle(agent, await getDeal(dealId), reported);
  } catch (error) {
    outcome = { status: "attention", summary: `The agent stopped on an error: ${errorMessage(error, "unknown error")}` };
  }

  await updateRow<Run>("novacrm_runs", run.id, {
    status: outcome.status,
    summary: outcome.summary,
    finishedAt: new Date().toISOString(),
  });
  if (outcome.status === "attention") await updateDeal(dealId, { status: "attention", attention: outcome.summary });
  return outcome;
}

/** The tools the model may call next, given the deal and what this run has done so far. */
async function availableTools(agent: Agent, run: Run): Promise<string[]> {
  const [deal, steps] = await Promise.all([
    getDeal(run.dealId),
    listRows<Step>("novacrm_run_steps", { where: { runId: run.id }, orderBy: "seq" }),
  ]);
  if (!deal) return ["finish"];
  const open = Object.entries(agent.tools)
    .filter(([, definition]) => definition.available?.({ deal, steps }) ?? true)
    .map(([name]) => name);
  return [...open, "finish"];
}

/** Code decides the outcome: a "done" report only counts if `verify` agrees. */
function settle(agent: Agent, deal: Deal | null, reported: RunOutcome | null): RunOutcome {
  if (!deal) return { status: "attention", summary: "The deal was deleted during the run." };
  if (!reported) return { status: "attention", summary: "The agent stopped without reporting a result." };
  if (reported.status === "attention") return reported;
  const gap = agent.verify(deal);
  return gap ? { status: "attention", summary: gap } : reported;
}

async function runStep(
  name: string,
  definition: AgentTool,
  input: Record<string, unknown>,
  why: string | null,
  run: Run,
): Promise<unknown> {
  const deal = await getDeal(run.dealId);
  if (!deal) throw new Error("The deal no longer exists.");

  const step = await insertRow<Step>("novacrm_run_steps", {
    id: newId("step"),
    runId: run.id,
    dealId: run.dealId,
    kind: "tool",
    tool: name,
    title: definition.title(input, deal),
    why,
    status: "running",
    input,
  });

  const ctx: ToolContext = {
    deal,
    run,
    updateDeal: (patch) => updateDeal(run.dealId, patch),
    progress: async ({ title, output }) => {
      await updateRow<Step>("novacrm_run_steps", step.id, {
        ...(title ? { title } : {}),
        ...(output !== undefined ? { output } : {}),
      });
    },
  };
  try {
    const output = await definition.execute(input, ctx);
    const after = (await getDeal(run.dealId)) ?? deal;
    await updateRow<Step>("novacrm_run_steps", step.id, {
      status: "done",
      title: definition.doneTitle?.(output, input, after) ?? step.title,
      output: output ?? null,
      finishedAt: new Date().toISOString(),
    });
    return output;
  } catch (error) {
    const message = errorMessage(error, "The step failed.");
    await updateRow<Step>("novacrm_run_steps", step.id, {
      status: "failed",
      error: message,
      finishedAt: new Date().toISOString(),
    });
    // The model sees the error as the tool result and can decide what to do next.
    throw new Error(message);
  }
}

async function addNote(run: Run, text: string): Promise<void> {
  const now = new Date().toISOString();
  await insertRow<Step>("novacrm_run_steps", {
    id: newId("step"),
    runId: run.id,
    dealId: run.dealId,
    kind: "note",
    title: text,
    status: "done",
    finishedAt: now,
  });
}
