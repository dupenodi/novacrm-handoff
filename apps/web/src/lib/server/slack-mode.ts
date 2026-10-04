import "server-only";
import { getActiveAccountId } from "./composio";

export type SlackModeSetting = "mock" | "real";

/**
 * Slack policy:
 * - SLACK_MODE=mock → always simulated
 * - SLACK_MODE=real (default) → Composio when a Slack account is ACTIVE; otherwise, or if the
 *   call fails, simulated and marked as such
 */
export function slackModeSetting(): SlackModeSetting {
  return process.env.SLACK_MODE?.trim().toLowerCase() === "mock" ? "mock" : "real";
}

/** What Slack calls will do right now. */
export async function effectiveSlackMode(): Promise<SlackModeSetting> {
  if (slackModeSetting() === "mock") return "mock";
  try {
    await getActiveAccountId("slack");
    return "real";
  } catch {
    return "mock";
  }
}

/** Runs `real` against Slack when it's usable, otherwise returns `mock` tagged as simulated. */
export async function withSlackFallback<T extends object>(
  real: () => Promise<unknown>,
  mock: T,
): Promise<{ mock: false; data: unknown } | ({ mock: true } & T)> {
  if ((await effectiveSlackMode()) === "mock") return { ...mock, mock: true };
  try {
    return { mock: false, data: await real() };
  } catch {
    return { ...mock, mock: true };
  }
}
