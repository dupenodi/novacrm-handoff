import { jsonError, jsonOk } from "@/lib/server/http";
import { getDeal } from "@/lib/server/store";
import { advanceInBackground, canRetry } from "@/lib/server/workflow";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Runs the deal again from the first agent whose work isn't finished. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await getDeal(id);
  if (!deal) return jsonError("This onboarding doesn't exist.", 404, "not_found");
  if (!canRetry(deal)) return jsonError("This onboarding isn't waiting on anyone right now.", 409, "conflict");
  advanceInBackground(id);
  return jsonOk({ ok: true }, { status: 202 });
}
