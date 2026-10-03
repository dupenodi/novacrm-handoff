# NovaCRM FDE — Decision log

Living interview brief. Update after every slice.

## Context

NovaCRM CS receives a closed-won handoff from an AE. Agents turn that into a Rocketlane onboarding project and a shared Slack channel. Plan tier (Growth vs Enterprise) is **not** in the email — it is confirmed by phone with the AE.

## System map (real vs mock)

| Piece | Status |
|-------|--------|
| Rocketlane templates + overdue automations | Real (done) |
| Gmail via Composio | Connected; tools live (`gmail.*`) |
| Salesforce | **Real** (ACTIVE `ca_PDBEjtKkXoME`); tools live (`salesforce.*`) |
| Rocketlane create/list | Tools live |
| Slack | **Real** (ACTIVE); mock auto-fallback if API fails (`SLACK_MODE=real`) |
| `llm.extract_deal` | OpenRouter structured extract (no regex) |
| Sarvam outbound tier call | Building block + `POST /api/runs/[id]/confirm-tier` |
| Runs / audit HTTP API | Live (`docs/API.md`); SQLite `.data/novacrm.sqlite` |
| Agent runtime | Vercel AI SDK `ToolLoopAgent` + OpenRouter (`docs/AGENTS.md`) |
| Operator UI runs | Home board + `/runs/[id]` (Signal ThreadRow / ToolCall / FailureCard) |

## Rocketlane (done)

- Enterprise template `5000000098075` — 30-day playbook
- Growth template `5000000098069` — 14-day playbook
- Global automations: task overdue 1d → Project Manager; 4d → Project Owner
- No create-template API → seed projects, then Save as template; deleted unused Simple Onboarding

## Decisions

### 2026-10-02 — Slack real confirmed; OpenRouter deal extract

- **Choice:** Keep `SLACK_MODE=real` with mock backup; smoke-tested `SLACK_CREATE_CHANNEL` + `SLACK_CHAT_POST_MESSAGE` against ACTIVE account
- **Choice:** Replace heuristic `llm.extract_deal` with `generateText` + `Output.object` (Zod) via OpenRouter — no invented fields
- **Why:** Connection proven end-to-end; intake classification must be agentic for the interview story

### 2026-10-02 — Salesforce connected + demo seed

- **Choice:** ACTIVE `ca_PDBEjtKkXoME`; seeded Acme Logistics Account + Closed Won Opportunity `006f600000BQX24AAH` + Contact Priya Shah
- **Why:** Fresh SF org was empty; enrich path needs at least one opp for demos
- **Verify:** `SALESFORCE_GET_OPPORTUNITY` returns Acme / $120k / Closed Won

### 2026-10-02 — Composio tools wired (no stubs)

- **Choice:** `executeComposioTool(toolkit, slug, args)` + real Gmail / Salesforce / Rocketlane / Slack tool executes; Slack respects `SLACK_MODE=mock`
- **SF search:** `SALESFORCE_EXECUTE_SOQL_QUERY` (Account LIKE) — no dedicated search-account slug
- **Rocketlane create:** maps tier → template ids from `rocketlane-playbooks.json`

### 2026-10-02 — Vercel AI SDK ToolLoopAgent

- **Choice:** Agent loop via `ai` package `ToolLoopAgent` + OpenRouter; keep our tool registry and SQLite persistence
- **Why:** Real multi-step tool calling without inventing a framework; interview-familiar stack
- **Rejected:** Homegrown only invokeTool loop; LangGraph (heavier for this take-home)
- **Entry:** `runAgent()` → `POST /api/runs/[id]/agents/[agent]`

### 2026-10-02 — Opportunity URL optional; Salesforce used for enrich when connected

- **Choice:** Missing opp link does **not** fail the run. When Salesforce is connected and an opp id/name exists, Intake enriches via Composio; otherwise continue with email + voice gap-fill
- **Why:** Agentic intake; SF is enrichment, not a hard dependency
- **Rejected:** Blocking create on missing SF link; requiring live SF for every demo
- **Trade-off:** Mock opportunities in Salesforce for demos when you want enrich path

### 2026-10-02 — Modular agents + SQLite + reusable voice

- **Choice:** Two agents (`intake`, `communication`) with shared SQLite state; tools registered once; `voice.call_ae` is agent-agnostic but allowlisted to intake; Salesforce via Composio for enrich only
- **Why:** Interview-clear separation; Sarvam usable by any future agent without rewriting telephony; local DB for sessions/tool traces
- **AE phone:** `DEMO_AE_PHONE` / persona directory always rings your number in demos
- **Spec:** [`docs/AGENTS.md`](AGENTS.md)

### 2026-10-02 — Run-centric API (no `/api/dev`)

- **Choice:** `POST /api/runs` + `POST /api/runs/[id]/confirm-tier`; delete `/api/dev/sarvam/tier-call` and leftover Vapi module
- **Why:** Two NovaCRM agents (intake, communication); Sarvam is a tool on intake. Smoke tests should create real runs/audit
- **Rejected:** Provider-scoped `/api/dev/*` smoke routes
- **Contract:** [`docs/API.md`](API.md)

### 2026-10-02 — Sarvam Voice Agents replace Vapi

- **Choice:** `POST https://apps.sarvam.ai/api/outbounds/v1/orgs/{org}/workspaces/{ws}/outbounds` with `X-API-Key`, dialing from rented number +91 79658 50505
- **Why:** Vapi needs an imported carrier number; the Twilio trial can't buy one. Sarvam rents Indian numbers directly (₹59/mo launch price) and handles Indian languages
- **Rejected:** Vapi + Twilio (upgrade and compliance profile needed), Vapi free numbers (can't dial out)
- **Trade-off:** We depend on the number staying rented. Sarvam releases it at renewal if credits run short

### 2026-10-02 — Agent prompt lives in the Sarvam dashboard

- **Choice:** Agent built in Sarvam with input vars `ae_name` and `customer_name`, and output vars `tier`, `confidence` and `ae_quote`. Spec is in `docs/SARVAM_AGENT.md`
- **Why:** Sarvam's outbound API takes an `app_id`/`app_version`, not an inline assistant
- **Rejected:** Inline per-call assistant (the old Vapi approach; Sarvam's API has no equivalent)
- **Trade-off:** Prompt can drift from the repo. Pin `SARVAM_APP_VERSION` and keep the spec doc in sync

### 2026-10-02 — Poll analytics attempts (not webhook yet)

- **Choice:** `waitForAttempt` polls `GET /analytics/v1/{org}/{ws}/{app}/attempts` filtered by `attempt_id` until it's terminal and the output vars are extracted (~3 min timeout)
- **Why:** Works locally without a public URL
- **Rejected:** `webhook_config` only. Sarvam's instant-outbound webhook pushes status, final vars and transcript, so switch to it once intake has a public URL
- **Trade-off:** Long-lived request on `POST /api/dev/sarvam/tier-call`

### 2026-10-02 — Tier only from explicit extracted variables

- **Choice:** Output vars `{ tier, confidence, ae_quote }`. Confirm only on Growth/Enterprise with explicit confidence. no_answer/busy → `no_answer`, other non-connected → `failed`, vague → `ambiguous`
- **Why:** Guardrail: never invent a tier (assignment Part 3)
- **Rejected:** Regex on transcript as the primary signal

### 2026-10-02 — Unhappy paths: retry only reachability, escalate what the AE said

- **Choice:** Agent v3 adds `call_outcome`, `callback_time` and `notes`. `nextStepFor` retries only no-answer, busy and transient failures (2 min, then 5 min, 3 attempts max). Wrong person, deal not closed, unsure, declined, callback requests and DND/invalid-number failures go to a human
- **Why:** Calling again won't change what the AE already said, and repeated calls annoy AEs. Callback times are free text ("after lunch"), so a person picks the slot instead of us parsing it
- **Rejected:** Redial on every non-confirmed outcome; parsing callback times
- **Trade-off:** More escalations land on CS. Sarvam errors and timeouts come back as a `failed` result instead of throwing

### 2026-10-02 — Slow, one-question-per-turn agent

- **Choice:** Greeting is only an identity check. Then Nova asks if it's a good time, then asks the plan question and reads the answer back. Speed 0.9x, eagerness Relaxed, 3 min cap
- **Why:** The v2 greeting asked the plan question in the first breath, which felt abrupt. The identity check also stops us discussing a customer with a wrong number

### 2026-10-02 — No subject regex for Gmail (upcoming)

- **Choice:** Intake agent classifies natural emails (planned)
- **Why:** Agentic demo, not brittle keyword gates
- **Rejected:** `/closed[- ]?won/i` subject filter

### 2026-10-02 — Continue + scan + operator UI

- **Choice:** Deterministic `continue` (Rocketlane then Slack) — no extra LLM loop
- **Choice:** `POST /api/intake/scan` classifies with OpenRouter; missing fields reply via Gmail
- **Choice:** Home is the run board; `/runs/[id]` shows steps + tool invocations using Signal agent/domain components
- **Why:** Interview needs a visible trail, not just curl

## Open questions / assumptions

- AE phone comes from deal email or CRM later; for the Sarvam smoke test use the `aePhone` body or `SARVAM_TEST_AE_NUMBER`
- Analytics `connectivity_status` is `connected` on answered calls (verified 2026-10-02); other values assumed to match the webhook (`no_answer`/`busy`/`failed`)

## Demo notes (Sarvam slice)

1. Fill `SARVAM_*` in `.env` (see README)
2. `pnpm dev` → `POST /api/runs` then `POST /api/runs/{id}/confirm-tier`
3. Answer clearly “Enterprise” or “Growth” → `outcome: confirmed`, stage `creating_project`
4. Ignore / vague → `nextStep` retry or escalate via `nextStepFor`

