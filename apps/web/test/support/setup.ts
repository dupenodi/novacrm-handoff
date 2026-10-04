import { beforeEach, vi } from "vitest";
import { resetBehavior } from "./scripted-model";
import { resetWorld, world } from "./world";

// Outside services are replaced at their edges; everything in between is the real app code.
vi.mock("@/lib/server/db", () => import("./fake-db"));
vi.mock("@/lib/server/composio", () => import("./fake-composio"));
vi.mock("@/lib/server/llm", () => import("./fake-llm"));
vi.mock("@/lib/server/sarvam/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/sarvam/api")>()),
  ...(await import("./fake-sarvam")),
}));
// `after()` runs work once the response is sent; tests collect it and wait for it with `settle()`.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (work: () => Promise<unknown>) => {
    world.background.push(Promise.resolve().then(work));
  },
}));

// Redials and retries wait seconds in real life; tests shouldn't.
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = ((handler: () => void, ms?: number, ...args: unknown[]) =>
  realSetTimeout(handler, ms && ms >= 500 ? 0 : ms, ...args)) as typeof setTimeout;

process.env.SLACK_MODE = "real";
process.env.DEMO_AE_PHONE = "";
process.env.SARVAM_WEBHOOK_SECRET = "test-secret";

beforeEach(() => {
  resetWorld();
  resetBehavior();
});
