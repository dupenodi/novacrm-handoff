import { jsonError, jsonOk } from "@/lib/server/http";
import { getDeal } from "@/lib/server/store";
import { advanceInBackground } from "@/lib/server/workflow";
import { AGENT_LABEL, type AgentName } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Hand-off between agents: the agent named in `from` finished, so the next one starts here, in a
 * request of its own. Only moves a deal that `from` is still holding, so it can't jump the queue.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { from?: string } | null;
  const from = body?.from;
  if (!from || !(from in AGENT_LABEL)) return jsonError("Say which agent finished.", 400, "bad_request");
  if (!(await getDeal(id))) return jsonError("This onboarding doesn't exist.", 404, "not_found");
  advanceInBackground(id, from as AgentName);
  return jsonOk({ ok: true }, { status: 202 });
}
