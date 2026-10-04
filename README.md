# NovaCRM Onboarding

A deal handoff email lands in the CS inbox → the **Intake agent** reads it, phones the AE to confirm the plan, and creates the Rocketlane project from the matching template → the **Communication agent** opens the customer's Slack channel, welcomes them, and emails the customer an invite.

```
apps/web        Next.js app: UI, API routes, agents
apps/web/supabase/schema.sql   Database tables (novacrm_*)
docs/           AGENTS.md, API.md, STATUS.md, DECISION_LOG.md, SARVAM_AGENT.md
```

```bash
pnpm install
cp .env.example .env   # fill it in
pnpm dev               # http://localhost:3100
```

Run `apps/web/supabase/schema.sql` once in the Supabase SQL editor (it's idempotent).

## Pages

- `/` Overview: the pipeline, deals that need attention, and every email the inbox watcher has read
- `/deals/[id]` One onboarding as a thread: the AE's email, then each agent's steps, results and outcome
- `/settings` Inbox watching and integrations (Gmail, Rocketlane, Slack via Composio; Sarvam and OpenRouter keys)

## How the inbox is watched

- **Hosted:** set `PUBLIC_APP_URL`, then Settings → **Turn on live watching**. Composio's Gmail trigger posts each new message to `/api/webhooks/composio`.
- **Local:** while the app is open it checks the inbox every 2 minutes. **Check now** in the sidebar checks immediately.

Either way, a handoff email creates a deal and starts the agents in the background, so closing the tab doesn't stop a run.

## Tests

```bash
pnpm test          # all tests, once
pnpm --filter @novacrm/web test:watch
```

51 Vitest tests in `apps/web/test/`, offline and in under a second. They run the real inbox, workflow, agent runtime, tools and Sarvam call logic. Only the edges are replaced (`test/support/`):

- **Supabase** → an in-memory database with the schema's defaults and unique constraints
- **Gmail, Rocketlane, Slack** (Composio) → fakes that return the real tools' shapes, with failure injection
- **Sarvam** → a fake HTTP layer that plays scripted calls (confirmed, no answer, busy, dropped, unclear)
- **The LLM** → a scripted model that makes the calls a careful model would, from the tools offered and their results

| File | Covers |
|------|--------|
| `happy-path.test.ts` | Enterprise email → parse → call offering Rocketlane's templates → Enterprise project → personalised channel, welcome, customer email; every step logged. Template accuracy for Enterprise (dedicated CSM), Growth (pooled) and Mid Market (a template no code knows about) |
| `validation.test.ts` | Missing customer, contact or contact email: collected on the call, never emailed; an email spelled with spaces is cleaned; a detail not given or malformed stops for a person; no AE phone stops without a call |
| `edge-cases.test.ts` | No answer (redial, then stop), unclear answer, hedged answer, dropped call, busy line; Rocketlane down (retry, stop, recover); existing open project; similar-but-different company; a plan that wasn't offered; options matched exactly; only offered templates count; taken Slack name |
| `entity-resolution.test.ts` | `customerKey`; one deal per customer across repeat handoffs, name variants and contact email; the same message seen twice |
