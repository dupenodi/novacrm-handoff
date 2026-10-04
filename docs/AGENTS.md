# Agents

Two agents run in order for each deal. Code lives in `apps/web/src/lib/server/agents/`.

| Agent | File | Job | Done when (checked in code) |
|-------|------|-----|------------------------------|
| Intake | `intake.ts` | Read the deal's emails, list Rocketlane's templates, call the AE to pick one and to give any missing details, create the project from that template | No required field missing, plan confirmed on a call, project id saved |
| Communication | `comms.ts` | Read the onboarding plan from Rocketlane, create a Slack channel (name and topic chosen by the agent), post a welcome, email the customer contact (cc the AE) inviting them | Channel id saved, welcome posted, customer emailed |

**Tools.** Intake: `read_handoff_email`, `list_project_templates`, `call_ae_to_confirm_plan({ templateIds })`, `create_rocketlane_project({ projectName })`. Communication: `get_onboarding_details`, `create_slack_channel({ name, topic })`, `post_welcome_message({ text })`, `email_customer({ subject, body })`.

**Where the facts come from.** Everything about plans is read from Rocketlane at run time (`ROCKETLANE_LIST_TEMPLATES`, `ROCKETLANE_GET_TEMPLATE_BY_ID`): the plan names offered on the call are the template names; phases, tasks and timeline come from the template; staffing too: a template that assigns tasks to a named person is a dedicated CSM (that person), one that assigns only teams is a pooled CSM team (`staffingOf` in `rocketlane.ts`). No plan names exist in code. `rocketlane-team.json` only holds the Rocketlane project owner's email.

`workflow.ts` runs them: a new deal starts Intake; if Intake finishes, Communication starts. Hosted (`PUBLIC_APP_URL` set), each agent runs in its own request: Intake hands the deal to Communication through `POST /api/deals/:id/advance`, so a long Intake run with calls doesn't share one function's 300-second limit with Communication. Runs happen after the HTTP response (`after()`), so they don't depend on a browser being open. A deal is claimed atomically (`status` in `new|attention`), so a duplicate webhook or double click can't start a second run.

## Runtime (`framework.ts`)

An agent is `instructions`, a `prompt(deal)`, `tools`, and `verify(deal)`.

- **Tools** are defined with `defineTool`: a zod input, a human `title` (and `doneTitle`) for the UI, an `execute`, and an optional `available({ deal, steps })`.
- Before each model step, tools that aren't `available` are hidden. The model can't create a project before the plan is confirmed, call the AE more than twice, or redo finished work.
- Every tool input gets a required `why`: one sentence of rationale for the CS team, shown under the step.
- Each call is logged to `novacrm_run_steps`: title, why, input, output, error, start and finish times. Any text the model writes is logged as a note.
- The model makes one tool call per step (`parallelToolCalls: false`), so it sees each result before deciding the next move.
- A run ends when the model calls `finish({ outcome, summary })`. A `done` is refused while `verify(deal)` still reports a gap, and the model is told what's left; a run that stops without `finish`, or throws, becomes `attention`.
- Long tools can update their running step (`ctx.progress`). The call tool uses it to show "Call ended, reading the answer" while Sarvam extracts the result.

## Guardrails

| Rule | Where |
|------|-------|
| Required details (customer, contact name, contact email, AE name, a number to call) must be present and valid. Missing ones are asked for on the call (an email is spelled and read back) and checked like email details. The agent never emails the AE. No number to call: stop for a person | `missingFields`, `call_ae_to_confirm_plan` |
| An AE reply on the thread (sent on their own) resumes the deal | `inbox.ts` (`verdict: "reply"`) |
| The plan only comes from the call: the AE picks one of the templates offered, and only an exact match (ignoring case and punctuation) counts. The project tool takes no template input; it uses the one the AE picked | `interpretCall`, `create_rocketlane_project` |
| No answer, call cut short, busy or failed: the call tool redials once by itself (`MAX_CALL_ATTEMPTS`, `REDIAL_OUTCOMES`). Unclear answer, call back, wrong person, deal not closed, declined: stop for a person | `call_ae_to_confirm_plan` |
| A Rocketlane failure while creating the project gets one automatic retry | `withOneRetry` in `intake.ts` |
| If the customer's Rocketlane company already has an open project, nothing is created; a person decides whether to use or archive it | `create_rocketlane_project` |
| One deal per customer. Customers match on an exact normalized name (`customerKey`: case, punctuation, trailing "Inc"/"Ltd" etc.) or the same contact email; a second handoff joins the existing deal (`verdict: "duplicate"`) and its thread is read too. A unique index on `customer_key` backs this up | `inbox.ts`, `read_handoff_email` |
| Rocketlane companies match on the same exact key; more than one match stops for a person | `findCompany` in `rocketlane.ts` |
| The customer email must name the Slack channel | `email_customer` |
| Runs that stop reporting for 12 minutes (e.g. a server restart) are marked for retry | `closeStaleRuns` in `store.ts` |

## Data (`apps/web/src/lib/server/db.ts`)

Table-agnostic helpers over Supabase: `insertRow`, `insertRowIfAbsent`, `upsertRow`, `getRow`, `findRow`, `listRows`, `updateRow`, `updateRows`. Callers use camelCase; columns are snake_case. Domain helpers built on these are in `store.ts`.
