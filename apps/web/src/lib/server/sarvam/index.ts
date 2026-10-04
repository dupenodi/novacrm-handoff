import "server-only";
import type { CallOutcome, VoiceTurn } from "@/lib/types";
import { errorMessage, str } from "../util";
import { assertSarvamConfigured, normalizePhone, startOutboundCall, type CallWebhook } from "./api";
import { interpretCall } from "./interpret";
import { waitForCall } from "./webhook";

export type PlanCallResult = {
  attemptId: string | null;
  interactionId: string | null;
  /** The option the AE picked, exactly as offered, when the plan was confirmed. */
  plan: string | null;
  /** Details the AE gave on the call, keyed by the Sarvam variable name (e.g. contact_email). */
  collected: Record<string, string>;
  outcome: CallOutcome;
  aeQuote: string | null;
  /** AE's own words for when to call back, if they asked for one. */
  callbackTime: string | null;
  notes: string | null;
  failureReason: string | null;
  transcript: VoiceTurn[];
};

export type PlanCallInput = {
  aePhone: string;
  aeName: string;
  customerName: string;
  /** The plans to offer: names of Rocketlane project templates. */
  options: string[];
  /** Details to collect, keyed by Sarvam variable name, with how Nova should ask for them. */
  missing: Array<{ variable: string; label: string }>;
};

/**
 * Calls the AE to confirm which plan the customer signed (from `options`) and collect any missing
 * details, waits for Sarvam to report the call over, and returns the interpreted outcome. Call
 * failures come back as outcome "failed".
 */
export async function confirmPlan(input: PlanCallInput): Promise<PlanCallResult> {
  assertSarvamConfigured();
  const phone = normalizePhone(input.aePhone);
  if (phone.replace(/\D/g, "").length < 10) throw new Error(`Invalid AE phone number: ${input.aePhone}`);

  let attemptId: string;
  try {
    attemptId = await startOutboundCall({
      phone,
      aeName: input.aeName,
      customerName: input.customerName,
      planOptions: spokenList(input.options),
      missingDetails: input.missing.length ? spokenList(input.missing.map((m) => m.label), "and") : "none",
    });
  } catch (error) {
    return failedResult(null, errorMessage(error, "Could not start the call"));
  }

  try {
    return toResult(await waitForCall(attemptId), input);
  } catch (error) {
    return failedResult(attemptId, errorMessage(error, "Lost track of the call"));
  }
}

/**
 * Sarvam reports "no conversation" both when nobody picked up and when the AE answered but the
 * call ended before the plan came up — usually because Nova couldn't hear them. The transcript
 * tells the two apart.
 */
function refineOutcome(outcome: CallOutcome, transcript: VoiceTurn[]): CallOutcome {
  if (outcome === "no_answer" && transcript.some((turn) => turn.speaker === "ae")) return "cut_off";
  return outcome;
}

/** "Growth, Enterprise or Mid Market" */
function spokenList(items: string[], last = "or"): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${last} ${items.at(-1)}`;
}

function toResult(call: CallWebhook, input: PlanCallInput): PlanCallResult {
  const vars = call.final_agent_variables ?? {};
  const transcript = toTranscript(call);
  const { outcome, plan } = interpretCall(call, input.options);
  return {
    attemptId: call.attempt_id,
    interactionId: call.interaction_id ?? null,
    plan,
    collected: Object.fromEntries(
      input.missing.flatMap(({ variable }) => {
        const value = str(vars[variable]);
        return value && value.toLowerCase() !== "unknown" ? [[variable, value]] : [];
      }),
    ),
    outcome: refineOutcome(outcome, transcript),
    aeQuote: str(vars.ae_quote) || null,
    callbackTime: str(vars.callback_time) || null,
    notes: str(vars.notes) || null,
    failureReason: call.failure_reason || null,
    transcript,
  };
}

function toTranscript(call: CallWebhook): VoiceTurn[] {
  return (call.interaction_transcript ?? []).map((turn) => ({
    speaker: turn.role === "agent" ? "nova" : "ae",
    text: turn.en_text,
  }));
}

function failedResult(attemptId: string | null, reason: string): PlanCallResult {
  return {
    attemptId,
    interactionId: null,
    plan: null,
    collected: {},
    outcome: "failed",
    aeQuote: null,
    callbackTime: null,
    notes: null,
    failureReason: reason,
    transcript: [],
  };
}
