import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/webhooks/sarvam/route";
import { waitForCall } from "@/lib/server/sarvam/webhook";
import { rows } from "./support/world";

const SECRET = process.env.SARVAM_WEBHOOK_SECRET!;

function post(body: unknown, secret = SECRET) {
  return POST(
    new Request(`http://localhost/api/webhooks/sarvam?secret=${secret}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

describe("Sarvam webhook", () => {
  it("hands the call result to the step waiting for it", async () => {
    const waiting = waitForCall("attempt-x", { intervalMs: 1 });

    const response = await post({
      attempt_id: "attempt-x",
      status: "connected",
      final_agent_variables: { plan: "Growth Onboarding · 14 days" },
    });

    expect(response.status).toBe(200);
    await expect(waiting).resolves.toMatchObject({ attempt_id: "attempt-x", status: "connected" });
  });

  it("takes a repeated delivery in stride", async () => {
    await post({ attempt_id: "attempt-y", status: "no_answer" });
    const again = await post({ attempt_id: "attempt-y", status: "no_answer" });

    expect(again.status).toBe(200);
    expect(rows("novacrm_calls")).toHaveLength(1);
  });

  it("rejects a request without the secret", async () => {
    const response = await post({ attempt_id: "attempt-z", status: "connected" }, "wrong");

    expect(response.status).toBe(401);
    expect(rows("novacrm_calls")).toHaveLength(0);
  });

  it("rejects a body that isn't a call result", async () => {
    expect((await post({ hello: "world" })).status).toBe(400);
  });
});
