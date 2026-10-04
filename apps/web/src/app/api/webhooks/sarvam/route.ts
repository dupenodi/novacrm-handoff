import { timingSafeEqual } from "node:crypto";
import { SARVAM_WEBHOOK_SECRET } from "@/lib/server/config";
import { jsonError, jsonOk } from "@/lib/server/http";
import type { CallWebhook } from "@/lib/server/sarvam/api";
import { recordCall } from "@/lib/server/sarvam/webhook";
import { isRecord, str } from "@/lib/server/util";

export const dynamic = "force-dynamic";

/** Sarvam posts here when an AE call is over: the outcome, the agent's variables and the transcript. */
export async function POST(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret") ?? "";
  if (!SARVAM_WEBHOOK_SECRET || !sameSecret(secret, SARVAM_WEBHOOK_SECRET)) {
    return jsonError("Invalid webhook", 401, "unauthorized");
  }

  const payload: unknown = await request.json().catch(() => null);
  if (!isRecord(payload) || !str(payload.attempt_id) || !str(payload.status)) {
    return jsonError("Not a Sarvam call result", 400, "bad_request");
  }

  await recordCall(payload as CallWebhook);
  return jsonOk({ ok: true });
}

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
