import "server-only";
import { extractDealFromEmail } from "../../intake/extract-deal";
import { registerTool } from "../registry";

registerTool({
  name: "llm.extract_deal",
  description:
    "Classify whether the email is a closed-won handoff and extract deal fields via OpenRouter. Does not invent values; opportunityUrl may be null.",
  agents: ["intake"],
  inputSchema: {
    type: "object",
    required: ["subject", "body"],
    properties: {
      subject: { type: "string" },
      body: { type: "string" },
    },
  },
  async execute(input: { subject: string; body: string }, ctx) {
    const deal = await extractDealFromEmail(input);
    ctx.state.extracted = deal;
    return deal;
  },
});
