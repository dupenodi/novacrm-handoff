# HTTP API

Errors: `{ "error": "message", "code": "optional_code" }`. Types are in `apps/web/src/lib/types.ts` and `step-outputs.ts`.

## Deals

| Method | Path | Response |
|--------|------|----------|
| `GET` | `/api/deals` | `{ deals: DealSummary[] }` |
| `GET` | `/api/deals/[id]` | `DealView`: deal, source email, replies, runs, steps, Rocketlane link |
| `POST` | `/api/deals/[id]/retry` | `202`. Runs again from the first unfinished agent. `409` unless the deal needs attention |
| `POST` | `/api/deals/[id]/advance` | `202`. Internal hand-off between agents, body `{ "from": "intake" }`. Starts the next agent only if `from` still holds the deal |

Deal `status`: `new` → `intake` → `comms` → `done`, or `attention` when it's waiting on a person.

## Inbox

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/inbox` | `{ watch: InboxWatch, recent: Email[] }` |
| `POST` | `/api/inbox/check` | Read recent inbox mail now; returns `{ checked, newDeals, ignored }` |
| `POST` / `DELETE` | `/api/inbox/watch` | Turn the Composio Gmail trigger on or off (needs `PUBLIC_APP_URL`) |
| `POST` | `/api/webhooks/composio` | Gmail trigger delivery; signature verified with the stored secret |
| `POST` | `/api/webhooks/sarvam?secret=…` | AE call result from Sarvam (outcome, agent variables, transcript); `secret` must equal `SARVAM_WEBHOOK_SECRET`. Saved to `novacrm_calls`, where the waiting call step picks it up |

## Integrations

| Method | Path |
|--------|------|
| `GET` | `/api/integrations` |
| `POST` | `/api/integrations/connect` |
| `GET` | `/api/integrations/callback` |
| `DELETE` | `/api/integrations/accounts/[id]` |

## Storage

Supabase (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`), schema in `apps/web/supabase/schema.sql`: `novacrm_emails`, `novacrm_deals`, `novacrm_runs`, `novacrm_run_steps`, `novacrm_calls`, `novacrm_kv`. RLS is on with no policies, so only the server can read them.
