# NovaCRM FDE — Decision log

Living interview brief. Holds the decisions that still apply; replaced ones are removed, not kept.

## Context

NovaCRM CS receives a closed-won handoff from an AE. Agents turn that into a Rocketlane onboarding project and a shared Slack channel. The plan (which Rocketlane template) is **not** in the email — it is confirmed by phone with the AE.

## System map (real vs mock)

| Piece | Status |
|-------|--------|
| Rocketlane templates + overdue automations | Real (done) |
| Gmail via Composio | Real: watcher, thread reads, customer email |
| Rocketlane via Composio | Real: templates, companies, projects |
| Slack via Composio | Real; simulated (and labelled) when not connected |
| Sarvam outbound call | Real; `call_ae_to_confirm_plan` tool |
| Salesforce | Not used by the agents; the opportunity link is read from the email for reference only |
| Agent runtime | Own small runtime on Vercel AI SDK `generateText` + tools (`docs/AGENTS.md`) |
| Storage | Supabase `novacrm_emails/deals/runs/run_steps/calls/kv` |
| UI | Overview, deal thread, settings |

## Rocketlane (done)

- Enterprise template `5000000098075` — 30-day playbook
- Growth template `5000000098069` — 14-day playbook
- Global automations: task overdue 1d → Project Manager; 4d → Project Owner
- No create-template API → seed projects, then Save as template; deleted unused Simple Onboarding

## Decisions

### 2026-10-04 — Plans are Rocketlane templates; missing details on the call

- **Choice:** No plan names in code. Intake lists Rocketlane's templates and the call offers them by name (Sarvam input `plan_options`); the AE's answer must match an offered option exactly. The project uses that template. A third template (Mid Market, same length as Enterprise) works with no code change
- **Choice:** Dedicated vs pooled CSM is read from the template: tasks assigned to a named person means a dedicated CSM (that person); teams only means pooled. In Rocketlane, Enterprise's "Sales & Presales Hand-off" task is assigned to Rachel (role: Customer success), so Enterprise reads as dedicated with Rachel as CSM; Growth and Mid Market assign teams only (pooled)
- **Choice:** Missing details are collected on the call (Sarvam input `missing_details`, outputs `company_name`, `contact_name`, `contact_email`; emails spelled and read back) instead of emailing the AE. Removes the email loop when the AE and CS inbox are one Gmail account
- **Needs:** the Sarvam agent matching `docs/SARVAM_AGENT.md`, and `SARVAM_APP_VERSION` bumped to its published version

### 2026-10-04 — Deals, background runs, gated tools

- **Choice:** One `deal` per handoff email, stored in Supabase through table-agnostic helpers (`db.ts`) so it runs on Vercel with no local disk. Agents run in the background (`after()`) and the page polls, so refreshing or closing the tab never restarts or kills a run
- **Choice:** Tools declare `available(deal, steps)`; unavailable tools are hidden from the model each step. Order and retry limits are enforced by code, not only the prompt
- **Choice:** Every run ends with `finish`, and `verify(deal)` can overrule a "done". Every tool call logs a human title and a `why`
- **Why:** The first version showed raw tool names and JSON, runs could be lost or duplicated, and outcomes weren't explicit

### 2026-10-04 — Hosted on Vercel; one request per agent

- **Choice:** Production on Vercel with the Composio Gmail trigger on. Each agent runs in its own function invocation (`/api/deals/:id/advance` hand-off) because background work (`after()`) shares the request's 300 s limit
- **Trade-off:** Intake with two calls can approach 300 s (each call up to ~3 min plus Sarvam's extraction). If it's cut off, the stale-run check marks the deal for retry after 12 minutes, and a confirmed plan is kept so Retry skips the call

### 2026-10-04 — Exact customer matching, retries in code

- **Choice:** No substring or fuzzy matching. Customers, deals and Rocketlane companies match on an exact normalized key (`customerKey`) or the exact contact email. A customer with an open project stops for a person instead of guessing whether to reuse it
- **Choice:** One deal per customer (unique `customer_key`); a second handoff joins it as `duplicate`
- **Choice:** Call redials and the Rocketlane create retry live in code; the prompts don't describe retries. Comms chooses the channel name and email wording from tool results, and emails the customer (cc AE) because outside customers can't be added to our Slack without Slack Connect
- **Choice:** `COMPOSIO_USER_ID` from `.env`; inbox auto-check every 2 minutes

### 2026-10-04 — Rocketlane companies: Composio tool broken, proxy workaround (flag to interviewer)

- **Problem:** New customers need a Rocketlane company before a project. Composio's `ROCKETLANE_CREATE_COMPANY` fails on every version tried (current `20260922_00`, `20260910_00`, `20260615_00`, `20251208_00`) with 500 "Server Error: Cannot perform action"
- **Root cause (Composio side):** the tool has no `accountOwner` field, which Rocketlane requires (`/1.0/companies` without it returns 400 "accountOwner is required when creating a company"), and it targets `/api/v2/companies`, which is 404 on this workspace. Extra arguments are dropped by its schema
- **Also tried:** `ROCKETLANE_CREATE_PROJECT` with `customer.companyName` + `autoCreateCompany: true`, rejected with "No customer company found"
- **Not a permissions issue:** the same connected account creates companies through `/1.0/companies` when `accountOwner` is sent
- **Choice (for now):** `createCompany` in `rocketlane.ts` posts to `/1.0/companies` through Composio's proxy (`proxyComposio`, same connected account and auth). Everything else stays on Composio tools
- **Alternative considered:** treat "company exists in Rocketlane" as a guardrail and stop for a person. Cleaner (tools only) but every new customer becomes a manual step
- **Next:** report to Composio; switch back to the tool once it sends an owner. Worth checking whether Rocketlane has a workspace default account owner

### 2026-10-04 — Sarvam webhook delivers the call result

- **Choice:** Each outbound call carries `webhook_config` pointing at `/api/webhooks/sarvam?secret=…`. The route saves the payload (status, variables, transcript) to `novacrm_calls`; the call step waits for that row
- **Why:** The create call returns only an `attempt_id`. The webhook delivers status, extracted variables and transcript in one push. Sarvam doesn't sign webhooks, hence the secret in the URL
- **Rejected:** Polling Sarvam's analytics API (slower, and a transcript fetch on top)
- **Trade-off:** Voice calls need a public `PUBLIC_APP_URL` (ngrok locally). There's no earlier "call ended" signal, so the timer runs until the webhook lands

### 2026-10-02 — Sarvam Voice Agents for the AE call

- **Choice:** `POST https://apps.sarvam.ai/api/outbounds/v1/orgs/{org}/workspaces/{ws}/outbounds` with `X-API-Key`, dialing from rented number +91 79658 50505
- **Why:** Vapi needs an imported carrier number and the Twilio trial can't buy one. Sarvam rents Indian numbers directly (₹59/mo launch price) and handles Indian languages
- **Rejected:** Vapi + Twilio (upgrade and compliance profile needed), Vapi free numbers (can't dial out)
- **Trade-off:** We depend on the number staying rented. Sarvam releases it at renewal if credits run short

### 2026-10-02 — Agent prompt lives in the Sarvam dashboard

- **Choice:** The agent is built in Sarvam; the app passes input variables and reads output variables. Spec is in `docs/SARVAM_AGENT.md`
- **Why:** Sarvam's outbound API takes an `app_id`/`app_version`, not an inline assistant
- **Trade-off:** The prompt can drift from the repo. Pin `SARVAM_APP_VERSION` and keep the spec doc in sync

### 2026-10-02 — The plan only comes from explicit extracted variables

- **Choice:** The plan counts only when the extracted `plan` is one of the offered options and `confidence` isn't hedged. `no_answer`/`busy` map to their own outcomes, other non-connected calls to `failed`, vague answers to `ambiguous`
- **Why:** Guardrail: never invent a plan (assignment Part 3)
- **Rejected:** Regex on the transcript as the primary signal

### 2026-10-02 — Unhappy paths: retry only reachability, escalate what the AE said

- **Choice:** The agent returns `call_outcome`, `callback_time` and `notes`. Code redials only when nobody could be heard (no answer, cut off, busy, failed). Wrong person, deal not closed, unsure, declined and callback requests go to a human
- **Why:** Calling again won't change what the AE already said, and repeated calls annoy AEs. Callback times are free text ("after lunch"), so a person picks the slot instead of us parsing it
- **Rejected:** Redial on every non-confirmed outcome; parsing callback times
- **Trade-off:** More escalations land on CS. Sarvam errors and timeouts come back as a `failed` result instead of throwing

### 2026-10-02 — Slow, one-question-per-turn call

- **Choice:** The greeting is only an identity check. Then Nova asks if it's a good time, then asks the plan question and reads the answer back. Speed 0.9x, eagerness Relaxed
- **Why:** Asking the plan question in the first breath felt abrupt. The identity check also stops us discussing a customer with a wrong number

### 2026-10-02 — Slack simulated when not connected

- **Choice:** `SLACK_MODE=real` posts through Composio; if Slack isn't connected or a call fails, the channel and welcome are simulated and labelled "Simulated". `SLACK_MODE=mock` always simulates. Smoke-tested `SLACK_CREATE_CHANNEL` + `SLACK_CHAT_POST_MESSAGE` against an ACTIVE account
- **Why:** Slack is optional for a demo; a missing connection shouldn't block onboarding

### 2026-10-02 — Structured extraction for deal emails

- **Choice:** Classifying and reading emails uses `generateText` + `Output.object` (Zod) via OpenRouter, with no subject-line regex and no invented fields
- **Why:** Intake classification must be agentic, and a model that copies what's written beats keyword gates

## Open questions / assumptions

- **Salesforce opportunity link is reference-only.** The brief mentions it only in Priya's description of today's process; Part 2 requires parsing the customer name, contact email and AE name, and no Salesforce integration. Intake extracts the link as an optional field (a missing link never blocks a deal), and the deal page links to it so the CS team can open the record. It is never a source for the plan: the brief makes the AE's voice confirmation the only authority. Open question for Karthik: should the opportunity be the source of truth for any field (contact email, AE phone), and should a missing link fail validation? Production options: verify the opportunity exists and is Closed Won before onboarding starts, and write the Rocketlane project and Slack channel back to it.
- The AE phone comes from the deal email. For demos, `DEMO_AE_PHONE` makes every call ring one handset instead.
