import type { Tone } from "@/components/ui/primitives";
import type { DealStatus } from "./types";

/** How each deal status reads in the UI. */
export const DEAL_STATUS: Record<DealStatus, { label: string; tone: Tone; live: boolean }> = {
  new: { label: "Queued", tone: "neutral", live: false },
  intake: { label: "Intake in progress", tone: "blue", live: true },
  comms: { label: "Setting up Slack", tone: "blue", live: true },
  attention: { label: "Needs attention", tone: "amber", live: false },
  done: { label: "Onboarding started", tone: "green", live: false },
};

export function isLive(status: DealStatus): boolean {
  return DEAL_STATUS[status].live || status === "new";
}
