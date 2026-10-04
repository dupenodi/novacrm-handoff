/**
 * Stand-in for `src/lib/server/llm.ts`.
 * - `extract` reads "Label: value" lines, the way the real model is told to: copy what's written, never guess.
 * - `agentModel` is a scripted model that drives the agents through their tools (see agent-policy.ts).
 */
import type { z } from "zod";
import { scriptedModel } from "./scripted-model";

export function agentModel() {
  return scriptedModel();
}

export async function extract<T>(input: { schema: z.ZodType<T>; system: string; prompt: string }): Promise<T> {
  const shape = (input.schema as unknown as { shape: Record<string, unknown> }).shape;
  const text = input.prompt;
  return ("isDealHandoff" in shape ? classify(text) : readFields(text)) as T;
}

/** The last value written after `label:`, so a later reply can correct an earlier email. */
function lastValue(text: string, label: string): string | null {
  const pattern = new RegExp(`^${label}:\\s*(.+)$`, "gim");
  const values = [...text.matchAll(pattern)].map((match) => match[1]!.trim());
  return values.at(-1) ?? null;
}

function classify(text: string) {
  const isDealHandoff = /closed-won|deal is closed|has signed/i.test(text);
  return {
    isDealHandoff,
    customerName: lastValue(text, "Customer"),
    contactEmail: lastValue(text, "Contact email"),
    reason: isDealHandoff ? "An AE says a deal closed." : "Not about a closed deal.",
  };
}

function readFields(text: string) {
  const phone = text.match(/^\+?\d[\d\s-]{8,}\d$/m)?.[0] ?? null;
  return {
    customerName: lastValue(text, "Customer"),
    contactName: lastValue(text, "Contact"),
    contactEmail: lastValue(text, "Contact email"),
    aeName: null,
    aeEmail: null,
    aePhone: phone,
    opportunityUrl: null,
  };
}
