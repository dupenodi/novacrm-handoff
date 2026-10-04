# NovaCRM FDE — Status

Updated 2026-10-04. App data was wiped on 2026-10-04 (the old handoff threads were archived in Gmail so they aren't picked up again).

## Hosted

Production: https://novacrm-handoff.vercel.app (Vercel, root `apps/web`). Live watching is on: Composio's Gmail trigger posts new mail to `/api/webhooks/composio` (verified 2026-10-04, about a minute after the email arrived). Deploy with `npx vercel deploy --prod` from the repo root; env vars are set in the Vercel project.

## Works end to end (verified live)

- Inbox watcher reads Gmail, classifies mail, creates a deal for each handoff
- Intake: reads the thread, calls the AE through Sarvam (retries busy or no-answer once), confirms the plan, creates or reuses the Rocketlane project
- Communication: real Slack channel (agent-chosen name, free-name fallback), topic, plan-specific welcome, customer email inviting them
- Deal page shows every step live with rationale, results, call transcript and a raw log

## Demo prep (Rocketlane)

- Plans are Rocketlane's templates: **Growth Onboarding · 14 days** (10 working days, pooled), **Enterprise Onboarding · 30 days** (21 working days, dedicated CSM) and **Mid Market Onboarding · 24 days** (21 working days, pooled). Add a template in Rocketlane and the call offers it.
- A customer whose Rocketlane company already has an open project stops for a person. For clean takes use a new customer name, or archive the old project first (archived projects are ignored).
- New companies are created automatically (through the proxy below).
- Edge-case take: send a second handoff for a customer that has an open project to show "already has a project".

## Known issue: creating Rocketlane companies

Composio's `ROCKETLANE_CREATE_COMPANY` is broken (no `accountOwner`, wrong endpoint), so new companies are created through Composio's proxy. Details and evidence in `DECISION_LOG.md` (2026-10-04). Flag this in the walkthrough.

## Tests

`pnpm test` runs 51 tests (Vitest, `apps/web/test/`) in under a second: happy path, validation, template accuracy, edge cases (no answer, unclear answer, dropped call, busy line, Rocketlane down, existing project, a plan that wasn't offered), and one-onboarding-per-customer. Outside services are in-memory fakes; the agent's model is scripted. See the README.

## Not done yet

1. Not exercised live yet: the missing-details path (it sends a real reply email)
2. Loom walkthrough
