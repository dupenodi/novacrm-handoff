# NovaCRM FDE — Decision log

Living interview brief. Update after every slice.

## Context

NovaCRM CS receives a closed-won handoff from an AE. Agents turn that into a Rocketlane onboarding project and a shared Slack channel. Plan tier (Growth vs Enterprise) is **not** in the email — it is confirmed by phone with the AE.

## System map (real vs mock)

| Piece | Status |
|-------|--------|
| Rocketlane templates + overdue automations | Real (done) |
| Gmail via Composio | Connected; intake agent not wired yet |
| Sarvam outbound tier call | Building block in code; agent built in Sarvam dashboard |
| Slack | Modeled; `SLACK_MODE=mock` by default |
| Operator UI runs | Still seed/mock until intake writes live runs |

## Rocketlane (done)

- Enterprise template `5000000098075` — 30-day playbook
- Growth template `5000000098069` — 14-day playbook
- Global automations: task overdue 1d → Project Manager; 4d → Project Owner
- No create-template API → seed projects, then Save as template; deleted unused Simple Onboarding

## Decisions

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

## Open questions / assumptions

- AE phone comes from deal email or CRM later; for the Sarvam smoke test use the `aePhone` body or `SARVAM_TEST_AE_NUMBER`
- Analytics `connectivity_status` is `connected` on answered calls (verified 2026-10-02); other values assumed to match the webhook (`no_answer`/`busy`/`failed`)

## Demo notes (Sarvam slice)

1. Fill `SARVAM_*` in `.env` (see README)
2. `pnpm dev` → `POST http://localhost:3100/api/dev/sarvam/tier-call` with your phone as `aePhone`
3. Answer clearly “Enterprise” or “Growth” → `outcome: confirmed`
4. Ignore / vague → `no_answer` or `ambiguous` → retry helper `nextRetryAt`
