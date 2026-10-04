import "server-only";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output, wrapLanguageModel, type LanguageModelMiddleware } from "ai";
import type { z } from "zod";
import { OPENROUTER_API_KEY, OPENROUTER_MODEL } from "./config";

function openRouter() {
  if (!OPENROUTER_API_KEY) throw new Error("Set OPENROUTER_API_KEY in .env");
  return createOpenRouter({ apiKey: OPENROUTER_API_KEY });
}

/**
 * Keeps only the first tool call in each response. Not every OpenRouter provider honours
 * `parallel_tool_calls: false` (gpt-4o-mini on OpenAI repeated create_slack_channel, making two
 * channels), so the limit is enforced here rather than trusted to the provider.
 */
const oneToolCallPerStep: LanguageModelMiddleware = {
  wrapGenerate: async ({ doGenerate }) => {
    const result = await doGenerate();
    let seenToolCall = false;
    const content = result.content.filter((part) => {
      if (part.type !== "tool-call") return true;
      if (seenToolCall) return false;
      seenToolCall = true;
      return true;
    });
    return { ...result, content };
  },
};

/**
 * The model agents run on: one tool call per step, so the agent sees each result (say, a call
 * nobody answered) before deciding what to do next — and never finishes alongside its last action.
 */
export function agentModel() {
  return wrapLanguageModel({
    model: openRouter().chat(OPENROUTER_MODEL, { parallelToolCalls: false }),
    middleware: oneToolCallPerStep,
  });
}

/** One structured-output call: returns an object matching `schema`, or throws. */
export async function extract<T>(input: { schema: z.ZodType<T>; system: string; prompt: string }): Promise<T> {
  const { output } = await generateText({
    model: openRouter().chat(OPENROUTER_MODEL),
    output: Output.object({ schema: input.schema }),
    system: input.system,
    prompt: input.prompt,
  });
  if (!output) throw new Error("The model returned no structured output");
  return output;
}
