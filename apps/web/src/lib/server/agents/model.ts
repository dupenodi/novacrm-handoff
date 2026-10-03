import "server-only";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { OPENROUTER_API_KEY, OPENROUTER_MODEL } from "../config";

export function getLanguageModel(modelId = OPENROUTER_MODEL) {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set");
  return createOpenRouter({ apiKey: OPENROUTER_API_KEY }).chat(modelId);
}
