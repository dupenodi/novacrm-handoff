# NovaCRM Handoff

Agent-run customer onboarding for NovaCRM: a closed-won email becomes a Rocketlane project and a shared
Slack channel, with the plan tier confirmed by phone with the AE.

## Layout

```
apps/web        Next.js app (App Router) — the operator UI, and later the webhook routes
packages/ui     "Signal" design system, copied from resumama (see packages/ui/README.md)
docs/           design-system.md — component inventory and action-placement rules
```

## Run

```bash
pnpm install
pnpm dev        # http://localhost:3100
pnpm build
pnpm typecheck
```

The UI is a placeholder: a Home page and Settings → Integrations.

## Configure

Copy `.env.example` to `.env` and fill in the keys, then connect Gmail, Rocketlane and Slack from Settings.
Composio brokers those three; the AE tier call goes straight to Sarvam's Voice Agents API.

### Sarvam (outbound AE tier call)

Calls go out from the rented Sarvam number **+91 79658 50505**.

1. In [Sarvam Voice Agents](https://indus.sarvam.ai), build the tier-confirm agent described in [`docs/SARVAM_AGENT.md`](docs/SARVAM_AGENT.md) and publish it.
2. Create an API key under **Settings → API Key**.
3. Fill the `SARVAM_*` vars in `.env`: API key, org and workspace IDs, the agent's ID and version, and the connection ID that owns the number. `SARVAM_TEST_AE_NUMBER` is optional, for smoke tests.
4. With `pnpm dev` running, smoke-test:

```bash
curl -sS -X POST http://localhost:3100/api/dev/sarvam/tier-call \
  -H 'content-type: application/json' \
  -d '{"aePhone":"+91YOURNUMBER","aeName":"Dana Reyes","customerName":"Acme Logistics"}'
```

The response has an `outcome` (`confirmed`, `ambiguous`, `callback_requested`, `wrong_person`, `deal_not_closed`, `declined`, `no_answer`, `busy` or `failed`) and a `nextStep` (`done`, `retry` with a time, or `escalate` with a reason). Pass `"attempt": 2` and so on for redials. Agent behaviour: [`docs/SARVAM_AGENT.md`](docs/SARVAM_AGENT.md). Interview notes: [`docs/DECISION_LOG.md`](docs/DECISION_LOG.md).
