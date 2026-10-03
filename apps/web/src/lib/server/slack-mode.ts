import "server-only";
import { getActiveAccountId } from "./composio";
import { errorMessage } from "./util";

export type SlackModeSetting = "mock" | "real" | "real_strict";

/**
 * Slack policy:
 * - SLACK_MODE=mock → always mock
 * - SLACK_MODE=real (default) → Composio when ACTIVE; on miss/error fall back to mock
 * - SLACK_MODE=real_strict → Composio only; throw if unavailable
 */
export function slackModeSetting(): SlackModeSetting {
  const raw = (process.env.SLACK_MODE ?? "real").trim().toLowerCase();
  if (raw === "mock") return "mock";
  if (raw === "real_strict" || raw === "strict") return "real_strict";
  return "real";
}

export async function resolveSlackMode(): Promise<{ mode: "real" | "mock"; reason: string }> {
  const setting = slackModeSetting();
  if (setting === "mock") return { mode: "mock", reason: "SLACK_MODE=mock" };

  try {
    await getActiveAccountId("slack");
    return { mode: "real", reason: "ACTIVE Composio Slack connection" };
  } catch (error) {
    if (setting === "real_strict") throw error;
    return { mode: "mock", reason: `fallback mock — ${errorMessage(error, "Slack not connected")}` };
  }
}

type Mocked<T> = T & { ok: true; mock: true; reason: string };

/**
 * Runs `real` against Slack when it's usable, otherwise returns `mock` tagged with the reason.
 * A failing real call also falls back to the mock unless SLACK_MODE=real_strict.
 */
export async function withSlackFallback<T extends object>(
  real: () => Promise<unknown>,
  mock: T,
): Promise<{ ok: true; mock: false; data: unknown } | Mocked<T>> {
  const fallback = (reason: string): Mocked<T> => ({ ...mock, ok: true, mock: true, reason });

  const { mode, reason } = await resolveSlackMode();
  if (mode === "mock") return fallback(reason);

  try {
    return { ok: true, mock: false, data: await real() };
  } catch (error) {
    if (slackModeSetting() === "real_strict") throw error;
    return fallback(errorMessage(error, "Slack API failed"));
  }
}
