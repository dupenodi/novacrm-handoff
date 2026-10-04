import "server-only";
import { getRow, upsertRow } from "../db";
import type { CallWebhook } from "./api";

type CallRow = { id: string; payload: CallWebhook };

/** Called by the webhook route. Sarvam may deliver twice; the second write just repeats the first. */
export async function recordCall(payload: CallWebhook): Promise<void> {
  await upsertRow<CallRow>("novacrm_calls", { id: payload.attempt_id, payload });
}

/**
 * Waits for Sarvam to report the call over. The webhook can land on a different server instance
 * than the one running the agent, so the result is passed through the database.
 */
export async function waitForCall(
  attemptId: string,
  { timeoutMs = 720_000, intervalMs = 2_000 } = {},
): Promise<CallWebhook> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const row = await getRow<CallRow>("novacrm_calls", attemptId);
    if (row) return row.payload;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Sarvam never reported the result of call ${attemptId}`);
}
