# Requirements analysis

How I understood the problem, what I decided to build, and why. The original assignment text is in [PROBLEM_STATEMENT.md](PROBLEM_STATEMENT.md).

## The problem

NovaCRM is a CRM company with about 200 customers. Every time a deal closes, the sales rep emails the customer success (CS) team, and someone on that team does the onboarding by hand: builds the project, opens a Slack channel with the customer, and chases tasks that run late. It is slow, templates get mixed up, and late tasks slip through without anyone being told.

One more catch: the email doesn't say which plan the customer bought (Enterprise with a 30-day onboarding, or Growth with a 14-day one). Someone has to ask the rep, and the wrong answer means the wrong template.

## What we need

- Watch the CS inbox and pick up deal emails on their own.
- Check the email has what's needed (customer, contact email, rep) and ask instead of guessing when something is missing.
- Phone the rep to confirm the plan, and never assume one.
- Create the project in Rocketlane from the right template.
- Open a Slack channel for the customer with a welcome message that fits their plan.
- Escalate overdue tasks inside Rocketlane: 1 day late tells the project manager, 4 days late tells the project owner.
- Log every action with its inputs, outputs and the reason for it.
- Cover the happy path and the failure cases with automated tests.

## What happens today

From Priya's description, a deal gets onboarded like this:

1. The sales rep (AE) emails the CS inbox with the customer name and a Salesforce link.
2. Someone creates a project from the standard template (about 15 tasks, 4 phases: Kickoff, Data Migration, Configuration, Go-Live).
3. Someone creates a Slack channel with the customer and schedules the kickoff.
4. The team updates the project as work goes on. Tasks blocked for 3+ days should be escalated, but that gets forgotten.
5. At the end, they write a handoff summary and pass the customer to support.

Where it hurts:

- Every step is manual, so it's slow and depends on whoever picks up the email.
- Enterprise (30 days, dedicated CSM) and Growth (14 days, pooled CSM) templates get mixed up.
- Late tasks aren't escalated reliably.
- Data migration tasks get marked done without the data being checked.

## What I chose to automate

The assignment covers steps 1 to 4 (inbox, project, Slack, escalation). I left the end-of-onboarding summary and the data-migration check out. They need a finished project to work on, and the brief doesn't ask for them. Both are worth doing next.

The flow:

1. **Watch the inbox.** A Gmail trigger sends each new email to the app. The app decides whether it's a deal handoff and, if so, creates a deal.
2. **Intake agent.** Reads the email and checks the customer name, contact email and AE. It calls the AE to confirm the plan and creates the Rocketlane project from the matching template.
3. **Communication agent.** Opens the Slack channel, posts a welcome that fits the plan, and emails the customer an invite.
4. **Overdue tasks.** Handled by Rocketlane's own automations, not by an agent: 1 day late notifies the Project Manager, 4 days late notifies the Project Owner.

Each deal has a page showing every step, the reason the agent gave for it, the call transcript and the result. That page is also the audit log.

## Assumptions

- The brief says Asana, but the build uses Rocketlane (the assignment is built around the Rocketlane API, and Rocketlane has projects, templates and overdue automations in one place, so there was no reason to add Asana).
- The plan is never in the email, so the phone call is the only source for it. I don't read it from the Salesforce link, the email wording or the customer name.
- I did not connect Salesforce. The customer name, contact email and AE phone number are read from the email (the phone number from the signature). In production these would come from Salesforce, and the AE's phone number from a directory of people.
- For demos, one `DEMO_AE_PHONE` makes every call ring the same phone.
- I only have one Gmail account, so it plays both the AE and the CS inbox. I avoid flows that depend on telling the two apart.
- One customer gets one onboarding. A second email for the same customer joins the first deal.
- An outside customer can't be added to our Slack without Slack Connect, so a new channel is created and the customer is invited by email.
- If details are missing from the email, the agent collects them on the phone call instead of emailing the AE. This is an assumption I made, and a few things don't work perfectly because of it.

## Main decisions

- **Plans are Rocketlane templates, not names in code.** The agent fetches the templates from Rocketlane during each run, and the call offers them by name. I made three templates instead of the two the assignment asks for (Mid Market is the extra one) to show that a new template becomes a plan with no code change. Dedicated or pooled CSM is read from the template: a named person on the tasks means dedicated, teams only means pooled. In production I'd want more templates and more granular tools to create and manage them.
- **The phone call also collects missing details.** If the contact name or email is missing, the agent asks for it on the same call, with the email spelled out and read back, rather than sending an email and waiting.
- **Code enforces the rules, the model handles the words.** The order of steps, the retry limits and "is this tool allowed right now" are in code. The model picks the Slack channel name and writes the welcome and the customer email.
- **Retry only when the AE couldn't be reached.** No answer, busy, cut off or failed: redial once. If the AE said something (unsure, wrong person, deal not closed, wants a callback), a person takes over, because calling again won't change the answer.
- **No fuzzy matching.** Customers, companies and plan answers match exactly (after cleaning case and punctuation), so the agent doesn't merge two different customers or pick a plan nobody offered. If something doesn't match, a person looks at it. A real deployment would need proper dedupe logic so the data doesn't get corrupted.
- **Runs in the background.** Closing the tab doesn't stop a run, and a stuck run is marked for retry after 12 minutes. Each agent runs in its own request to stay inside Vercel's time limit.
- **Voice: Sarvam.** I first tried to get phone numbers from Vapi and Twilio, but they only offered US numbers. Sarvam rents Indian numbers directly, makes outbound calls, and is easy to integrate. I set up a Sarvam voice agent for NovaCRM that calls the AE, confirms the plan and collects any missing details. The call result comes back by webhook.
- **Tools through Composio.** There are a lot of integrations, and Composio handles the OAuth connections for Gmail, Rocketlane and Slack, so I don't manage them myself.
- **Storage: Supabase.** It was the easiest to integrate, and the app runs on Vercel, so there's no local disk.

## Guardrails

- Missing required fields: ask for them on the call. If they still aren't given, stop for a person.
- The project is only created after a clear, confirmed plan that matches an offered option.
- A customer who already has an open Rocketlane project stops for a person.
- Rocketlane errors are retried; if they keep failing, the deal stops for a person.
- Every tool call is logged with a timestamp, inputs, output and the reason.
- Every run ends with an explicit outcome, and a check can overrule a "done".

## Real and simulated

| Piece | Status |
|-------|--------|
| Gmail watching and email | Real |
| Voice call to the AE | Real call |
| Rocketlane templates, companies, projects | Real |
| Rocketlane overdue automations | Real, set up in Rocketlane |
| Slack | Real when connected; otherwise simulated and labelled "Simulated" |
| Salesforce | Not connected |

## What would change in production

- A proper Slack integration with Slack Connect, so customers join the channel directly.
- A proper Salesforce integration: read the customer, contact and AE details from the opportunity, check it is Closed Won before starting, and write the project and channel back to it.
- A directory to look up AE phone numbers, instead of reading them from the email.
- More tools for the agents to look things up and process data themselves, instead of relying on what's in the email.
- Dedupe logic for customers and companies.
- Agents on a queue instead of inside a request, so long calls aren't cut off by a time limit.
- Verified Sarvam webhooks (today it's only a secret in the URL).

## Known issues and limits

- **Composio can't create Rocketlane companies.** Its `ROCKETLANE_CREATE_COMPANY` tool doesn't send the `accountOwner` that Rocketlane requires, and it calls an endpoint that doesn't exist on this workspace. I wrote a small proxy call that hits the Rocketlane endpoint directly. Everything else uses the normal tools. Once Composio fixes it, the proxy can go.
- **The call result arrives a few seconds late.** Sarvam doesn't support live transcription for voice calls yet, so after the call ends it takes a few extra seconds to summarise the call and send the transcript.

## Questions I'd ask Karthik

- Should the Salesforce opportunity be the source of truth for anything (contact email, AE phone)? Should a missing link block a deal?
- Does Rocketlane have a default account owner for new companies?
