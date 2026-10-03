import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import { getLanguageModel } from "../agents/model";

export const dealExtractSchema = z.object({
  isDealNotification: z
    .boolean()
    .describe("True only if this is a closed-won / signed / handoff to CS"),
  customerName: z.string().nullable().describe("Company / account name"),
  contactName: z.string().nullable().describe("Customer contact person"),
  contactEmail: z.string().nullable(),
  aeName: z.string().nullable().describe("Account executive who owns the deal"),
  aeEmail: z.string().nullable(),
  aePhone: z.string().nullable().describe("E.164 or as written; null if absent"),
  opportunityUrl: z
    .string()
    .nullable()
    .describe("Salesforce opportunity URL or raw Opportunity Id if present"),
  reason: z.string().describe("One-line why this classification"),
});

export type DealExtract = z.infer<typeof dealExtractSchema>;

export async function extractDealFromEmail(input: {
  subject: string;
  body: string;
}): Promise<DealExtract> {
  const { output } = await generateText({
    model: getLanguageModel(),
    output: Output.object({ schema: dealExtractSchema }),
    system: `You extract closed-won CS handoff fields from emails.
Rules:
- Never invent names, emails, phones, or URLs. Use null when not clearly present.
- isDealNotification=true only for closed-won / signed / won / handoff-to-CS language.
- opportunityUrl may be a full Salesforce URL or an Opportunity Id starting with 006.
- Prefer explicit labels (Customer:, AE:, Contact:) over guessing from signatures.`,
    prompt: `Subject: ${input.subject}\n\nBody:\n${input.body}`,
  });

  if (!output) {
    throw new Error("llm.extract_deal: model returned no structured output");
  }
  return output;
}
