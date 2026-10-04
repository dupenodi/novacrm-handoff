# Problem statement

Forward Deployed Engineer take-home: customer onboarding automation. My analysis and plan are in [REQUIREMENTS_ANALYSIS.md](REQUIREMENTS_ANALYSIS.md).

Role: Forward Deployed Engineer, AI Implementation Team. Any major AI platform and any agentic framework may be used.

## The scenario

You are an FDE embedded with NovaCRM, a mid-market CRM platform with about 200 customers. Their Customer Success team runs a manual onboarding process for every new customer. Priya, the CS Manager, said on a discovery call:

> When a new deal closes, our AE sends an email to our CS team inbox with the customer name and the Salesforce opportunity link. From there, we manually create a project in Asana with our standard onboarding template - about 15 tasks across 4 phases: Kickoff, Data Migration, Configuration, and Go-Live. We then create a shared Slack channel with the customer and schedule the kickoff call. Each phase has its own checklist, and we update Asana as we go. If a task is blocked for more than 3 days, we're supposed to escalate - but honestly, that falls through the cracks a lot. At the end of onboarding, we write a handoff summary and move the customer to our ongoing support team.

She also said:

> Some customers are on our Enterprise plan and get a dedicated CSM and a 30-day onboarding. Others are on Growth and get a pooled CSM with a 14-day onboarding. We sometimes mix up the templates. And we've had cases where data migration tasks were marked done but the customer's data wasn't actually verified - that caused a few ugly escalations.

## Part 1: Requirements and workflow analysis (a document)

Document your understanding of the current workflow and your proposed agentic workflow, including any assumptions. Clarifying questions can go to karthikr@rocketlane.com.

## Part 2: Build the agent system

A working multi-agent system that automates the workflow. At minimum:

- **Agent 1, Intake and Routing.** Monitors a Gmail inbox for new deal emails from AEs. Parses the customer name, customer contact email, AE name and other details. The email does not include the plan tier, so the agent must phone the AE (any Voice AI tool) to confirm Enterprise or Growth before going on. Once confirmed, it creates a project in Rocketlane through the API, with the right onboarding template and timeline.
- **Agent 2, Communication.** Creates a shared Slack channel with the customer. The channel name, topic and welcome message are personalized by plan tier and customer details.
- **Rocketlane automation, overdue task escalation.** Configured inside Rocketlane (not a separate agent). A task overdue by 1 day notifies the Project Manager. A task overdue by 4 days notifies the Project Owner.

## Part 3: Guardrails

At least these, plus any others you think matter:

- The Intake Agent validates that all required fields are present before going on. If data is missing it asks for clarification instead of guessing.
- The Intake Agent does not create a project until the AE has given a clear, unambiguous plan tier on the call. If the call fails or the answer is unclear, it retries or escalates to a human instead of assuming a tier.
- Every agent action is logged with timestamps, inputs, outputs and decision rationale.

## Part 4: Automated tests

- **Happy path.** An Enterprise deal email arrives, the Intake Agent parses it, the call confirms the tier, the Rocketlane project is created with the right template, and the Communication Agent creates a personalized Slack channel.
- **Validation.** Incomplete or malformed emails are rejected (missing customer name, no contact email, etc.).
- **Template accuracy.** Enterprise gets the 30-day template with a dedicated CSM. Growth gets the 14-day template with a pooled CSM.
- **Edge cases.** Rocketlane API down. Customer already has an onboarding project. AE doesn't answer the call. AE gives an ambiguous answer about the plan.

## Deliverables

1. A written requirements analysis document (Part 1).
2. A video walkthrough of two end-to-end scenarios:
   - **Positive:** email arrives, voice call succeeds, Rocketlane project is created with the right template, Slack channel is set up, and the Rocketlane automation is shown.
   - **Negative:** things go wrong (malformed email, AE doesn't answer, ambiguous plan, missing fields) and the system handles it with retries and guardrails.

## Submission notes

- Submit the video through Loom or any screen recorder.
- The AE call must be a real, working voice interaction, not a text simulation. Most Voice AI tools have a free tier.
- A free Rocketlane trial account can be used. Use the Rocketlane API to create projects, tasks and phases.
- Any Gmail account works. The agent should watch the inbox and start the workflow by itself when a deal email arrives.
- Mock or simulated APIs are fine for secondary integrations such as Slack, but explain in the video what would change in production.
