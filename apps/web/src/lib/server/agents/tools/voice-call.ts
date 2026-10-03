import "server-only";
import type { PlanTier, VoiceTurn } from "@/lib/clients";
import { DEMO_AE_PHONE } from "../../config";
import { getSupabase, newId, throwIfError } from "../../db/client";
import { confirmPlanTier, isSarvamConfigured, type TierCallOutcome } from "../../sarvam";
import { registerTool } from "../registry";

type VoicePurpose = "confirm_tier" | "fill_missing_fields" | "confirm_and_fill";

type VoiceInput = {
  purpose: VoicePurpose;
  aeName: string;
  customerName: string;
  aePhone?: string;
  aeEmail?: string;
  missingFields?: string[];
};

type VoiceOutput = {
  attemptId: string | null;
  interactionId: string | null;
  purpose: VoicePurpose;
  toPhone: string;
  outcome: TierCallOutcome;
  tier: PlanTier | null;
  aeQuote: string | null;
  transcript: VoiceTurn[];
};

const CALLS_TABLE = "novacrm_voice_calls";

/** Demos always ring DEMO_AE_PHONE (your handset); otherwise use the phone from the deal email. */
function resolveAePhone(emailPhone?: string): string {
  const phone = DEMO_AE_PHONE || emailPhone?.trim();
  if (!phone) throw new Error("No AE phone: set DEMO_AE_PHONE (or SARVAM_TEST_AE_NUMBER) in .env for demos");
  return phone;
}

registerTool({
  name: "voice.call_ae",
  description:
    "Place an outbound Sarvam voice call to the AE. Use to confirm Growth/Enterprise or collect missing deal fields.",
  agents: ["intake"],
  inputSchema: {
    type: "object",
    required: ["purpose", "aeName", "customerName"],
    properties: {
      purpose: { type: "string", enum: ["confirm_tier", "fill_missing_fields", "confirm_and_fill"] },
      aeName: { type: "string" },
      customerName: { type: "string" },
      aePhone: { type: "string" },
      aeEmail: { type: "string" },
      missingFields: { type: "array", items: { type: "string" } },
    },
  },
  async execute(input: VoiceInput, ctx): Promise<VoiceOutput> {
    if (!isSarvamConfigured()) throw new Error("Sarvam is not configured");
    const toPhone = resolveAePhone(input.aePhone);

    const id = newId("voice");
    const started = await getSupabase().from(CALLS_TABLE).insert({
      id,
      session_id: ctx.sessionId,
      client_id: ctx.clientId,
      purpose: input.purpose,
      to_phone: toPhone,
      status: "running",
    });
    throwIfError(started.error);

    const call = await confirmPlanTier({ aePhone: toPhone, aeName: input.aeName, customerName: input.customerName });
    const output: VoiceOutput = {
      attemptId: call.attemptId,
      interactionId: call.interactionId,
      purpose: input.purpose,
      toPhone,
      outcome: call.outcome,
      tier: call.tier,
      aeQuote: call.aeQuote,
      transcript: call.transcript,
    };

    const finished = await getSupabase()
      .from(CALLS_TABLE)
      .update({
        attempt_id: call.attemptId,
        status: call.outcome === "confirmed" ? "done" : call.outcome,
        result: output,
        finished_at: new Date().toISOString(),
      })
      .eq("id", id);
    throwIfError(finished.error);

    ctx.state.lastVoiceResult = output;
    if (call.tier) ctx.state.tier = call.tier;
    return output;
  },
});
