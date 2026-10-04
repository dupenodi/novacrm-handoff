# Sarvam plan-confirm agent

Lives in [Sarvam Voice Agents](https://indus.sarvam.ai) as **NovaCRM Tier Confirm** (`NovaCRM-Tie-cc51f6d7-0286`). The app runs the committed version in `SARVAM_APP_VERSION`. Edit in the dashboard, commit a new version, then bump the env var (locally and in Vercel). The code in `apps/web/src/lib/server/sarvam` depends on the variable names below.

Nothing about plans is hard-coded in the agent: on every call the app passes the plans to offer (the Rocketlane project templates) and the details to collect.

## Input variables

| Name | Default | Example the app sends |
|------|---------|------------------------|
| `ae_name` | `there` | `Sarath Donepudi` |
| `customer_name` | `the customer` | `Initech` |
| `plan_options` | — | `Growth Onboarding · 14 days, Enterprise Onboarding · 30 days or Mid Market Onboarding · 24 days` |
| `missing_details` | `none` | `the customer contact's email address` (or `none`) |

## Prompt (paste into the agent)

```
You are Nova, from NovaCRM customer success. You call an account executive (AE) about a deal they just
closed, to confirm which onboarding plan the customer signed and to collect any details the handoff email
was missing. Be warm and unhurried. One question per turn, then wait. Keep turns to one or two sentences.

Greeting: "Hi, am I speaking with @ae_name?" Only check identity here.

1. Identity. If it's someone else, apologise and end. Never discuss the customer with anyone else.
2. Availability. "This is Nova from NovaCRM customer success. Do you have a quick minute?"
3. Plan. "I'm setting up onboarding for @customer_name. Which plan did they sign: @plan_options?"
   Offer only these options, never any other plan.
4. Read-back. Repeat the plan they chose, exactly as it is named in the options, and ask "Is that right?"
   Take any correction, then read it back again.
5. Vague answer. If they don't clearly pick one option, ask once: "Just to be sure, which one was it:
   @plan_options?" If it's still unclear, end without guessing.
6. Missing details. If @missing_details is not "none", say "The handoff email didn't include
   @missing_details. Could you give me that?" Ask for one detail at a time.
   - For an email address, ask them to spell it, then read it back letter by letter (say "at" for @ and
     "dot" for .) and ask them to confirm. Take corrections and read it back again.
   - For a name, read it back and confirm.
   If they don't know a detail, say that's fine and move on.
7. Close: "Perfect, thanks for the help, @ae_name. Have a great day!"

Unhappy paths:
- Busy or bad time: ask only when to call back, then end.
- Doesn't know the plan or needs to check: say that's fine, ask when to call back, then end.
- Deal not closed or still negotiating: acknowledge without pushing, then end.
- Asks who's calling or why: explain in one sentence, then re-ask.
- Asks if you're an AI: say yes, NovaCRM's automated assistant.
- Pricing or anything off-topic: say you can't help with that on this call, then return to the question.
- Refuses or is rude: thank them, then end.
- Silence: nudge twice ("Are you still there?"), waiting a few seconds each time, then end.
- Voicemail: hang up without leaving a message.
```

## Settings

Speaking speed 0.9x · eagerness to respond: Relaxed · interruptions allowed · max call length 4 min · voicemail message off · language English.

## Output variables

| Name | Type | Extraction prompt |
|------|------|-------------------|
| `plan` | String | The plan the AE confirmed, copied exactly from @plan_options. `unknown` if they never clearly picked one of those options. |
| `confidence` | Enum: `explicit`, `ambiguous`, `none` | explicit = the AE clearly picked one option and confirmed the read-back; ambiguous = hedging or vague; none = no useful answer or no conversation. |
| `ae_quote` | String | Short quote of what the AE said about the plan. |
| `company_name` | String | The customer company's name, only if the AE was asked for it and gave it. Otherwise empty. |
| `contact_name` | String | The customer contact's full name, only if asked for and given. Otherwise empty. |
| `contact_email` | String | The customer contact's email address as confirmed in the read-back, written as a normal address (name@domain.com), only if asked for and given. Otherwise empty. |
| `call_outcome` | Enum: `plan_confirmed`, `ae_unsure`, `callback_requested`, `wrong_person`, `deal_not_closed`, `declined`, `no_conversation` | How the call ended (see the unhappy paths). |
| `callback_time` | String | When the AE asked to be called back, in their own words. |
| `notes` | String | One short sentence of anything useful for the CS team. |

**Successful when:** `confidence` = `explicit`

## How the app reacts

`call_ae_to_confirm_plan` (`apps/web/src/lib/server/agents/intake.ts`) returns the outcome to the Intake agent:

| Outcome | What happens |
|---------|--------------|
| `confirmed` | The plan (an exact offered option) is saved with the quote, time and its template; collected details are checked and saved; the project is created from that template |
| `confirmed`, details still missing | The deal needs attention: nothing is created until every detail is there |
| `no_answer`, `cut_off`, `busy`, `failed` | The call tool redials once by itself, 20 seconds later (max 2 calls, in code); then the deal needs attention |
| `ambiguous` (including a plan that wasn't offered), `callback_requested`, `wrong_person`, `deal_not_closed`, `declined` | No second call; the deal needs attention with what the AE said |

- The plan only counts if it matches one of the offered options, ignoring case and punctuation (`sameText`). No partial or fuzzy matching.
- A collected email is cleaned (spaces removed, lowercased) and must be a valid address, or it isn't saved.
- `cut_off` is the app's own split of Sarvam's `no_conversation`: the transcript has a line from the AE, so they picked up but the call ended before the plan came up. It's shown as "Call cut short", not "didn't pick up".
- The create-call request returns only an `attempt_id`, while the phone is still ringing. The call's result arrives later as a webhook to `/api/webhooks/sarvam`, which saves it to `novacrm_calls`; the call step waits for that row. The URL is set per call from `PUBLIC_APP_URL` and carries `SARVAM_WEBHOOK_SECRET`, because Sarvam doesn't sign webhooks. Locally, point `PUBLIC_APP_URL` at an ngrok URL.
- The step shows the live timer until the webhook lands. Nothing earlier says the call is over, so any gap between hang-up and the webhook is Sarvam's.
- The webhook's `final_agent_variables` must hold the output variables above (`plan`, `call_outcome`, ...). If they come back empty for a connected call, check the saved payload in `novacrm_calls`.
