import "server-only";
import type { PlanTier, VoiceTurn } from "@/lib/clients";
import { errorMessage, str } from "../util";
import {
  assertSarvamConfigured,
  fetchTranscript,
  findAttempt,
  normalizePhone,
  startOutboundCall,
  type SarvamAttempt,
} from "./api";
import { interpretAttempt, isFinished, type TierCallOutcome } from "./interpret";
import { parseTranscript } from "./transcript";

export { isSarvamConfigured } from "./api";
export type { TierCallOutcome } from "./interpret";

export type TierCallResult = {
  attemptId: string | null;
  interactionId: string | null;
  tier: PlanTier | null;
  outcome: TierCallOutcome;
  aeQuote: string | null;
  /** AE's own words for when to call back, if they asked for one. */
  callbackTime: string | null;
  notes: string | null;
  connectivityStatus: string | null;
  failureReason: string | null;
  transcript: VoiceTurn[];
  raw: unknown;
};

export type TierCallInput = {
  aePhone: string;
  aeName: string;
  customerName: string;
};

type WaitOptions = { timeoutMs?: number; intervalMs?: number };

/**
 * Calls the AE, waits until Sarvam has recorded and extracted the call, and
 * returns the interpreted tier outcome. Call failures come back as outcome "failed".
 */
export async function confirmPlanTier(input: TierCallInput, wait?: WaitOptions): Promise<TierCallResult> {
  assertSarvamConfigured();
  const phone = normalizePhone(input.aePhone);
  if (phone.replace(/\D/g, "").length < 10) throw new Error(`Invalid AE phone number: ${input.aePhone}`);

  const startedAt = new Date();
  let attemptId: string;
  try {
    attemptId = await startOutboundCall({ phone, aeName: input.aeName, customerName: input.customerName });
  } catch (error) {
    return failedResult(null, errorMessage(error, "Could not start the call"));
  }

  try {
    const attempt = await waitForAttempt(attemptId, startedAt, wait);
    return {
      ...toResult(attempt, attemptId),
      transcript: await transcriptFor(attempt),
    };
  } catch (error) {
    return failedResult(attemptId, errorMessage(error, "Lost track of the call"));
  }
}

async function waitForAttempt(
  attemptId: string,
  since: Date,
  { timeoutMs = 180_000, intervalMs = 3_000 }: WaitOptions = {},
): Promise<SarvamAttempt> {
  const deadline = Date.now() + timeoutMs;
  let last: SarvamAttempt | null = null;
  while (Date.now() < deadline) {
    last = await findAttempt(attemptId, since);
    if (last && isFinished(last)) return last;
    await sleep(intervalMs);
  }
  throw new Error(
    `Timed out waiting for Sarvam attempt ${attemptId} (last status: ${last?.connectivity_status ?? "not recorded yet"})`,
  );
}

function toResult(attempt: SarvamAttempt, attemptId: string): TierCallResult {
  const vars = attempt.agent_variables ?? {};
  // Analytics reports the literal "NO_FAILURE_REASON" on clean calls.
  const failureReason = attempt.failure_reason === "NO_FAILURE_REASON" ? null : attempt.failure_reason || null;
  return {
    ...interpretAttempt(attempt),
    attemptId,
    interactionId: attempt.interaction_id ?? null,
    aeQuote: str(vars.ae_quote) || null,
    callbackTime: str(vars.callback_time) || null,
    notes: str(vars.notes) || null,
    connectivityStatus: attempt.connectivity_status ?? null,
    failureReason,
    transcript: [],
    raw: attempt,
  };
}

/** The transcript is a nice-to-have; a failed fetch shouldn't fail the call. */
async function transcriptFor(attempt: SarvamAttempt): Promise<VoiceTurn[]> {
  if (!attempt.interaction_id) return [];
  try {
    return parseTranscript(await fetchTranscript(attempt.interaction_id));
  } catch {
    return [];
  }
}

function failedResult(attemptId: string | null, reason: string): TierCallResult {
  return {
    attemptId,
    interactionId: null,
    tier: null,
    outcome: "failed",
    aeQuote: null,
    callbackTime: null,
    notes: null,
    connectivityStatus: null,
    failureReason: reason,
    transcript: [],
    raw: null,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
