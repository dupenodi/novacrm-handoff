import "server-only";
import { after } from "next/server";
import type { AgentName, Deal } from "@/lib/types";
import { updateRows } from "./db";
import { commsAgent } from "./agents/comms";
import { runAgent, type Agent } from "./agents/framework";
import { intakeAgent } from "./agents/intake";
import { PUBLIC_APP_URL } from "./config";
import { getDeal, updateDeal } from "./store";
import { errorMessage } from "./util";

/** The onboarding pipeline, in order. Each agent picks up where the previous one stopped. */
const PIPELINE: Agent[] = [intakeAgent, commsAgent];

/** The first agent whose work isn't done yet, or null when the deal is fully set up. */
function nextAgent(deal: Deal): AgentName | null {
  if (!deal.rocketlaneProjectId) return "intake";
  if (!deal.slackWelcomeAt || !deal.customerEmailedAt) return "comms";
  return null;
}

/**
 * Runs the deal's next agent after the current response is sent. `from` is the agent that just
 * finished and is handing the deal over; without it, only a deal that's new or waiting on a person
 * is picked up. Safe to call repeatedly.
 */
export function advanceInBackground(dealId: string, from?: AgentName): void {
  after(async () => {
    try {
      await advanceDeal(dealId, from);
    } catch (error) {
      const reason = `Something went wrong while running the agents: ${errorMessage(error, "unknown error")}`;
      await updateDeal(dealId, { status: "attention", attention: reason }).catch(() => undefined);
    }
  });
}

export async function advanceDeal(dealId: string, from?: AgentName): Promise<void> {
  const deal = await getDeal(dealId);
  if (!deal) return;
  const next = nextAgent(deal);
  if (!next) {
    if (deal.status !== "done") await updateDeal(dealId, { status: "done", attention: null });
    return;
  }

  // Claim the deal so a second trigger (a duplicate webhook, a double click) can't start a parallel run.
  const claimed = await updateRows<Deal>(
    "novacrm_deals",
    { id: dealId, status: from ? [from] : ["new", "attention"] },
    { status: next, attention: null, updatedAt: new Date().toISOString() },
  );
  if (claimed.length === 0) return;

  const agent = PIPELINE.find((candidate) => candidate.name === next)!;
  const outcome = await runAgent(agent, dealId);
  if (outcome.status !== "done") return;

  const updated = await getDeal(dealId);
  if (updated && nextAgent(updated)) {
    await handOff(dealId, agent.name);
  } else {
    await updateDeal(dealId, { status: "done", attention: null });
  }
}

/**
 * Starts the next agent. Hosted, each agent gets a request of its own, so a long Intake run (calls
 * to the AE) and Communication don't share one function's time limit. Locally it just continues.
 */
async function handOff(dealId: string, from: AgentName): Promise<void> {
  if (!PUBLIC_APP_URL) return advanceDeal(dealId, from);
  const response = await fetch(`${PUBLIC_APP_URL.replace(/\/$/, "")}/api/deals/${dealId}/advance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from }),
  });
  if (!response.ok) throw new Error(`Couldn't start the next agent (HTTP ${response.status}).`);
}

/** Whether a deal is waiting on a person and can be run again. */
export function canRetry(deal: Deal): boolean {
  return deal.status === "attention" || (deal.status === "new" && nextAgent(deal) !== null);
}
