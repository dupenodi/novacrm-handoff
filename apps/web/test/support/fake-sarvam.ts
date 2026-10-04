/**
 * Stand-in for Sarvam's HTTP API (`src/lib/server/sarvam/api.ts`). Placing a call delivers its
 * result straight away through the real webhook handler logic (`recordCall`), as Sarvam would once
 * the call is over. The code on top of it — outcome parsing, telling a dropped call from no answer,
 * redials — runs unchanged.
 */
import type { CallWebhook } from "@/lib/server/sarvam/api";
import { recordCall } from "@/lib/server/sarvam/webhook";
import { world } from "./world";

export function assertSarvamConfigured(): void {}

export async function startOutboundCall(input: {
  phone: string;
  aeName: string;
  customerName: string;
  planOptions: string;
  missingDetails: string;
}): Promise<string> {
  const attemptId = `attempt${world.sarvam.placed.length + 1}`;
  world.sarvam.placed.push({ attemptId, ...input });
  await recordCall(webhookFor(attemptId));
  return attemptId;
}

function webhookFor(attemptId: string): CallWebhook {
  const scripts = world.sarvam.scripts;
  const index = world.sarvam.placed.findIndex((call) => call.attemptId === attemptId);
  const script = scripts[Math.min(index, scripts.length - 1)] ?? {};
  const status = script.connectivity ?? "connected";
  const connected = status === "connected";
  return {
    attempt_id: attemptId,
    status,
    interaction_id: connected ? `interaction-${attemptId}` : null,
    failure_reason: null,
    final_agent_variables: connected ? (script.vars ?? {}) : null,
    interaction_transcript: connected
      ? (script.transcript ?? []).map((turn) => ({ role: turn.role === "agent" ? "agent" : "user", en_text: turn.text }))
      : null,
  };
}
