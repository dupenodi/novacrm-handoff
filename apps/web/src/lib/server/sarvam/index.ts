import "server-only";
import {
  SARVAM_AGENT_PHONE_NUMBER,
  SARVAM_API_KEY,
  SARVAM_APP_ID,
  SARVAM_APP_VERSION,
  SARVAM_CONNECTION_ID,
  SARVAM_ORG_ID,
  SARVAM_WORKSPACE_ID,
} from "../config";

const SARVAM_BASE = "https://apps.sarvam.ai/api";

export type PlanTier = "growth" | "enterprise";

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

/** What the caller of this module should do after an attempt. */
export type TierCallNextStep =
  | { action: "done" }
  | { action: "retry"; at: string; reason: string }
  | { action: "escalate"; reason: string };

export type TierCallResult = {
  attemptId: string | null;
  tier: PlanTier | null;
  outcome: TierCallOutcome;
  aeQuote: string | null;
  /** AE's own words for when to call back, if they asked for one. */
  callbackTime: string | null;
  notes: string | null;
  connectivityStatus: string | null;
  failureReason: string | null;
  raw: unknown;
};

export type CreateTierConfirmCallInput = {
  aePhone: string;
  aeName: string;
  customerName: string;
};

/**
 * One row from the analytics attempts API. `agent_variables` holds the agent's
 * output variables (tier, confidence, ae_quote, call_outcome, callback_time, notes)
 * once post-call extraction runs.
 */
type SarvamAttempt = {
  attempt_id?: string | null;
  interaction_id?: string | null;
  connectivity_status?: string | null;
  failure_reason?: string | null;
  end_datetime?: string | null;
  agent_variables?: Record<string, unknown> | null;
};

type Page<T> = { items: T[]; total: number };

const REQUIRED_ENV: Array<[string, string]> = [
  ["SARVAM_API_KEY", SARVAM_API_KEY],
  ["SARVAM_ORG_ID", SARVAM_ORG_ID],
  ["SARVAM_WORKSPACE_ID", SARVAM_WORKSPACE_ID],
  ["SARVAM_APP_ID", SARVAM_APP_ID],
  ["SARVAM_CONNECTION_ID", SARVAM_CONNECTION_ID],
  ["SARVAM_AGENT_PHONE_NUMBER", SARVAM_AGENT_PHONE_NUMBER],
];

export function missingSarvamEnv(): string[] {
  return REQUIRED_ENV.filter(([, value]) => !value).map(([name]) => name);
}

export function isSarvamConfigured(): boolean {
  return missingSarvamEnv().length === 0 && Number.isInteger(SARVAM_APP_VERSION);
}

function assertConfigured() {
  const missing = missingSarvamEnv();
  if (missing.length) {
    throw new Error(`Sarvam is not configured: set ${missing.join(", ")}`);
  }
  if (!Number.isInteger(SARVAM_APP_VERSION)) {
    throw new Error("SARVAM_APP_VERSION must be the published agent version number");
  }
}

async function sarvamFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${SARVAM_BASE}${path}`, {
    ...init,
    headers: {
      "X-API-Key": SARVAM_API_KEY,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }
  if (!response.ok) {
    const detail =
      typeof body === "object" && body && "detail" in body
        ? JSON.stringify((body as { detail: unknown }).detail)
        : text || response.statusText;
    throw new Error(`Sarvam ${init?.method ?? "GET"} ${path} failed (${response.status}): ${detail}`);
  }
  return body as T;
}

/** Normalize to E.164-ish: strip spaces/dashes; keep leading +. */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const keepPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  return keepPlus ? `+${digits}` : digits;
}

/**
 * Suggested delay before the next AE tier-call attempt (3 attempts total).
 * Attempt 1 → next in 2 min; attempt 2 → next in 5 min; exhausted → null.
 */
export function nextRetryAt(attemptJustFinished: number): Date | null {
  if (attemptJustFinished >= 3) return null;
  const delaysMs = [2 * 60_000, 5 * 60_000];
  const delay = delaysMs[attemptJustFinished - 1] ?? delaysMs[delaysMs.length - 1]!;
  return new Date(Date.now() + delay);
}

/**
 * Starts an instant outbound call from the rented number. The prompt and the
 * tier/confidence/ae_quote extraction live in the Sarvam agent; we only pass
 * the per-call input variables.
 */
export async function createTierConfirmCall(
  input: CreateTierConfirmCallInput,
): Promise<{ attemptId: string }> {
  assertConfigured();

  const userNumber = normalizePhone(input.aePhone);
  if (!userNumber || userNumber.replace(/\D/g, "").length < 10) {
    throw new Error(`Invalid AE phone number: ${input.aePhone}`);
  }

  const { attempt_id } = await sarvamFetch<{ attempt_id?: string }>(
    `/outbounds/v1/orgs/${SARVAM_ORG_ID}/workspaces/${SARVAM_WORKSPACE_ID}/outbounds`,
    {
      method: "POST",
      body: JSON.stringify({
        app_config: {
          app_id: SARVAM_APP_ID,
          app_version: SARVAM_APP_VERSION,
          connection_config: {
            connection_id: SARVAM_CONNECTION_ID,
            agent_phone_number: SARVAM_AGENT_PHONE_NUMBER,
          },
          agent_variables: {
            ae_name: input.aeName.trim() || "there",
            customer_name: input.customerName.trim() || "the customer",
          },
        },
        user_config: { user_phone_number: userNumber },
      }),
    },
  );

  if (!attempt_id) {
    throw new Error("Sarvam create outbound returned no attempt_id");
  }
  return { attemptId: attempt_id };
}

/** Looks up one attempt in the analytics API; null until Sarvam has recorded it. */
export async function getAttempt(attemptId: string, since: Date): Promise<SarvamAttempt | null> {
  const params = new URLSearchParams({
    start_datetime: new Date(since.getTime() - 60_000).toISOString(),
    end_datetime: new Date(Date.now() + 60_000).toISOString(),
    limit: "1",
    filter_conditions: JSON.stringify([
      { id: "1", field: "attempt_id", operator: "equals", value: attemptId },
    ]),
  });
  const page = await sarvamFetch<Page<SarvamAttempt>>(
    `/analytics/v1/${SARVAM_ORG_ID}/${SARVAM_WORKSPACE_ID}/${SARVAM_APP_ID}/attempts?${params}`,
  );
  return page.items[0] ?? null;
}

function isFinished(attempt: SarvamAttempt): boolean {
  const status = (attempt.connectivity_status ?? "").toLowerCase();
  if (!status) return false;
  if (status !== "connected") return true;
  // Connected calls are done once output variables have been extracted.
  const vars = attempt.agent_variables ?? {};
  return Boolean(attempt.end_datetime && (vars.call_outcome || vars.tier));
}

export async function waitForAttempt(
  attemptId: string,
  since: Date,
  opts: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<SarvamAttempt> {
  const timeoutMs = opts.timeoutMs ?? 180_000;
  const intervalMs = opts.intervalMs ?? 3_000;
  const deadline = Date.now() + timeoutMs;

  let last: SarvamAttempt | null = null;
  while (Date.now() < deadline) {
    last = await getAttempt(attemptId, since);
    if (last && isFinished(last)) return last;
    await sleep(intervalMs);
  }
  throw new Error(
    `Timed out waiting for Sarvam attempt ${attemptId} (last status: ${last?.connectivity_status ?? "not recorded yet"})`,
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const NO_ANSWER_STATUSES = ["no_answer", "not_connected", "voicemail"];

/** Provider failures that a redial will not fix (DND registry, bad number). */
const PERMANENT_FAILURE = /ndnc|dnd|do not disturb|invalid|not a valid|unallocated|does not exist/i;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

type Base = Omit<TierCallResult, "tier" | "outcome">;

function result(base: Base, outcome: TierCallOutcome, tier: PlanTier | null = null): TierCallResult {
  return { ...base, tier, outcome };
}

export function interpretTier(attempt: SarvamAttempt, attemptId: string): TierCallResult {
  const connectivityStatus = attempt.connectivity_status ?? null;
  // Analytics reports the literal "NO_FAILURE_REASON" on clean calls.
  const failureReason =
    attempt.failure_reason && attempt.failure_reason !== "NO_FAILURE_REASON" ? attempt.failure_reason : null;
  const vars = attempt.agent_variables ?? {};
  const tierRaw = str(vars.tier).toLowerCase();
  const confidence = str(vars.confidence).toLowerCase();
  const callOutcome = str(vars.call_outcome).toLowerCase();

  const base: Base = {
    attemptId,
    aeQuote: str(vars.ae_quote) || null,
    callbackTime: str(vars.callback_time) || null,
    notes: str(vars.notes) || null,
    connectivityStatus,
    failureReason,
    raw: attempt,
  };
  const status = (connectivityStatus ?? "").toLowerCase();

  if (status.includes("busy")) return result(base, "busy");
  if (NO_ANSWER_STATUSES.some((s) => status.includes(s))) return result(base, "no_answer");
  if (status && status !== "connected") return result(base, "failed");

  // The agent's own read of how the call went takes precedence over the tier fields.
  switch (callOutcome) {
    case "callback_requested":
      return result(base, "callback_requested");
    case "wrong_person":
      return result(base, "wrong_person");
    case "deal_not_closed":
      return result(base, "deal_not_closed");
    case "declined":
      return result(base, "declined");
    case "no_conversation":
      return result(base, "no_answer");
    case "ae_unsure":
      return result(base, "ambiguous");
  }

  if (tierRaw === "growth" || tierRaw === "enterprise") {
    // Named a tier but hedged — never invent certainty.
    if (confidence === "ambiguous" || confidence === "none") return result(base, "ambiguous");
    return result(base, "confirmed", tierRaw);
  }

  if (confidence === "none" && !base.aeQuote) return result(base, "no_answer");

  return result(base, "ambiguous");
}

/**
 * Retry policy. Only reachability problems are redialled; anything the AE actually
 * said (wrong number, deal not closed, unsure, refused) goes to a human, because
 * calling again would get the same answer.
 */
export function nextStepFor(res: TierCallResult, attemptNumber: number): TierCallNextStep {
  const retry = (reason: string): TierCallNextStep => {
    const at = nextRetryAt(attemptNumber);
    return at
      ? { action: "retry", at: at.toISOString(), reason }
      : { action: "escalate", reason: `${reason}, and all ${attemptNumber} attempts are used up` };
  };

  switch (res.outcome) {
    case "confirmed":
      return { action: "done" };
    case "no_answer":
      return retry("AE didn't pick up");
    case "busy":
      return retry("AE's line was busy");
    case "callback_requested":
      // The callback time is free text, so a person picks the slot.
      return {
        action: "escalate",
        reason: res.callbackTime
          ? `AE asked to be called back ${res.callbackTime}`
          : "AE asked to be called back later",
      };
    case "ambiguous":
      return { action: "escalate", reason: "AE didn't clearly name Growth or Enterprise; confirm in writing" };
    case "wrong_person":
      return { action: "escalate", reason: "Number reached someone other than the AE; check the AE's phone" };
    case "deal_not_closed":
      return { action: "escalate", reason: "AE says the deal isn't closed; hold onboarding" };
    case "declined":
      return { action: "escalate", reason: "AE declined to answer" };
    case "failed":
      if (res.failureReason && PERMANENT_FAILURE.test(res.failureReason)) {
        return { action: "escalate", reason: `Call can't be placed: ${res.failureReason}` };
      }
      return retry(res.failureReason ? `Call failed: ${res.failureReason}` : "Call failed");
  }
}

function failedResult(attemptId: string | null, reason: string): TierCallResult {
  return {
    attemptId,
    tier: null,
    outcome: "failed",
    aeQuote: null,
    callbackTime: null,
    notes: null,
    connectivityStatus: null,
    failureReason: reason,
    raw: null,
  };
}

/**
 * Place call, wait until the attempt is recorded and extracted, return interpreted tier outcome.
 * Sarvam errors and timeouts come back as a `failed` result instead of throwing, so the
 * caller can always apply `nextStepFor`. Bad input and missing config still throw.
 */
export async function confirmPlanTier(
  input: CreateTierConfirmCallInput,
  waitOpts?: { timeoutMs?: number; intervalMs?: number },
): Promise<TierCallResult> {
  assertConfigured();
  const startedAt = new Date();

  let attemptId: string;
  try {
    ({ attemptId } = await createTierConfirmCall(input));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid AE phone")) throw error;
    return failedResult(null, error instanceof Error ? error.message : "Could not start the call");
  }

  try {
    const attempt = await waitForAttempt(attemptId, startedAt, waitOpts);
    return interpretTier(attempt, attemptId);
  } catch (error) {
    return failedResult(attemptId, error instanceof Error ? error.message : "Lost track of the call");
  }
}
