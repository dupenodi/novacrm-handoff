import type { CallOutcome } from "@/lib/types";
import { sameText, str } from "../util";
import type { CallWebhook } from "./api";

/** The agent's `call_outcome` variable, mapped to our outcome. */
const AGENT_OUTCOMES: Record<string, CallOutcome> = {
  callback_requested: "callback_requested",
  wrong_person: "wrong_person",
  deal_not_closed: "deal_not_closed",
  declined: "declined",
  no_conversation: "no_answer",
  ae_unsure: "ambiguous",
};

/**
 * Reads the outcome and, when confirmed, the plan from a finished call. The plan only counts
 * when it is one of the options offered, said with confidence; anything else is unclear.
 */
export function interpretCall(
  call: CallWebhook,
  options: string[],
): { outcome: CallOutcome; plan: string | null } {
  if (call.status === "busy") return { outcome: "busy", plan: null };
  if (call.status === "no_answer") return { outcome: "no_answer", plan: null };
  if (call.status !== "connected") return { outcome: "failed", plan: null };

  const vars = call.final_agent_variables ?? {};
  const said = str(vars.plan);
  const confidence = str(vars.confidence).toLowerCase();

  // The agent's own read of how the call went takes precedence over the plan fields.
  const agentOutcome = AGENT_OUTCOMES[str(vars.call_outcome).toLowerCase()];
  if (agentOutcome) return { outcome: agentOutcome, plan: null };

  const plan = options.find((option) => sameText(option, said)) ?? null;
  if (plan) {
    // Named a plan but hedged: never invent certainty.
    const hedged = confidence === "ambiguous" || confidence === "none";
    return hedged ? { outcome: "ambiguous", plan: null } : { outcome: "confirmed", plan };
  }

  if (confidence === "none" && !str(vars.ae_quote)) return { outcome: "no_answer", plan: null };
  // No plan, or one that isn't among the options offered.
  return { outcome: "ambiguous", plan: null };
}
