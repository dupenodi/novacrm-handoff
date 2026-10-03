import type { PlanTier } from "@/lib/clients";
import { str } from "../util";
import type { SarvamAttempt } from "./api";

export type TierCallOutcome =
  | "confirmed"
  | "ambiguous"
  | "callback_requested"
  | "wrong_person"
  | "deal_not_closed"
  | "declined"
  | "no_answer"
  | "busy"
  | "failed";

const NO_ANSWER_STATUSES = ["no_answer", "not_connected", "voicemail"];

/** The agent's `call_outcome` variable, mapped to our outcome. */
const AGENT_OUTCOMES: Record<string, TierCallOutcome> = {
  callback_requested: "callback_requested",
  wrong_person: "wrong_person",
  deal_not_closed: "deal_not_closed",
  declined: "declined",
  no_conversation: "no_answer",
  ae_unsure: "ambiguous",
};

/** A call is finished once it failed to connect, or connected and the output variables are extracted. */
export function isFinished(attempt: SarvamAttempt): boolean {
  const status = (attempt.connectivity_status ?? "").toLowerCase();
  if (!status) return false;
  if (status !== "connected") return true;
  const vars = attempt.agent_variables ?? {};
  return Boolean(attempt.end_datetime && (vars.call_outcome || vars.tier));
}

/** Reads the outcome and (when confirmed) the tier from a finished attempt. */
export function interpretAttempt(attempt: SarvamAttempt): { outcome: TierCallOutcome; tier: PlanTier | null } {
  const status = (attempt.connectivity_status ?? "").toLowerCase();
  if (status.includes("busy")) return { outcome: "busy", tier: null };
  if (NO_ANSWER_STATUSES.some((s) => status.includes(s))) return { outcome: "no_answer", tier: null };
  if (status && status !== "connected") return { outcome: "failed", tier: null };

  const vars = attempt.agent_variables ?? {};
  const tier = str(vars.tier).toLowerCase();
  const confidence = str(vars.confidence).toLowerCase();

  // The agent's own read of how the call went takes precedence over the tier fields.
  const agentOutcome = AGENT_OUTCOMES[str(vars.call_outcome).toLowerCase()];
  if (agentOutcome) return { outcome: agentOutcome, tier: null };

  if (tier === "growth" || tier === "enterprise") {
    // Named a tier but hedged — never invent certainty.
    const hedged = confidence === "ambiguous" || confidence === "none";
    return hedged ? { outcome: "ambiguous", tier: null } : { outcome: "confirmed", tier };
  }

  if (confidence === "none" && !str(vars.ae_quote)) return { outcome: "no_answer", tier: null };
  return { outcome: "ambiguous", tier: null };
}
