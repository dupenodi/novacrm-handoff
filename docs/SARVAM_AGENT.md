# Sarvam tier-confirm agent

Lives in [Sarvam Voice Agents](https://indus.sarvam.ai) as **NovaCRM Tier Confirm** (`NovaCRM-Tie-cc51f6d7-0286`). The app runs the committed version in `SARVAM_APP_VERSION` (currently **v3**). Edit in the dashboard, commit a new version, then bump the env var. The code in `apps/web/src/lib/server/sarvam` depends on the variable names below.

This is a summary. The full prompt is in the dashboard.

## Input variables

| Name | Default | Sent by |
|------|---------|---------|
| `ae_name` | `there` | `createTierConfirmCall` |
| `customer_name` | `the customer` | `createTierConfirmCall` |

## Conversation

Warm and unhurried. Asks one thing per turn, then waits. Turns are one or two sentences.

**Greeting:** "Hi, am I speaking with @ae_name?" (identity check only)

1. **Identity.** If it's someone else, apologise and end. Never discuss the customer with a stranger.
2. **Availability.** "This is Nova from NovaCRM customer success. Do you have a quick minute?"
3. **Plan question.** "I'm setting up onboarding for @customer_name. Which plan did they sign, Growth or Enterprise?"
4. **Read-back.** "Got it, Enterprise. Is that right?" Take any correction, then read it back again.
5. **Vague answer.** Ask once: "Just to be sure, was that Growth or Enterprise?" If it's still unclear, end without guessing.

**Unhappy paths:**

| Situation | What Nova does | `call_outcome` |
|-----------|----------------|----------------|
| Busy or bad time | Asks only when to call back, then ends | `callback_requested` |
| Doesn't know or needs to check | Says that's fine, asks when to call back, then ends | `callback_requested` |
| Deal not closed or still negotiating | Acknowledges without pushing, then ends | `deal_not_closed` |
| Asks who's calling or why | Explains in one sentence, then re-asks | — |
| Asks if it's an AI | Says yes, NovaCRM's automated assistant | — |
| Pricing or off-topic | Says it can't help with that on this call, then returns to the plan | — |
| Refuses or is rude | Thanks them, then ends | `declined` |
| Silence | One nudge, "Are you still there?", then ends | `no_conversation` |
| Voicemail | Hangs up without leaving a message | `no_conversation` |

## Settings

Speaking speed 0.9x · eagerness to respond: Relaxed · interruptions allowed · max call length 3 min · voicemail message off · language English.

## Output variables

| Name | Type | Values | Extraction prompt |
|------|------|--------|-------------------|
| `tier` | Enum | `growth`, `enterprise`, `unknown` | Plan the AE confirmed. Use unknown if they never clearly said Growth or Enterprise. |
| `confidence` | Enum | `explicit`, `ambiguous`, `none` | explicit = AE clearly named Growth or Enterprise; ambiguous = hedging or vague; none = no useful answer / no conversation. |
| `ae_quote` | String | — | Short quote of what the AE said about the tier, if any. |
| `call_outcome` | Enum | `tier_confirmed`, `ae_unsure`, `callback_requested`, `wrong_person`, `deal_not_closed`, `declined`, `no_conversation` | How the call ended (see the table above). |
| `callback_time` | String | — | When the AE asked to be called back, in their own words. |
| `notes` | String | — | One short sentence of anything useful for the CS team. |

**Successful when:** `confidence` = `explicit`

## How the app reacts (`nextStepFor`)

| Outcome | Next step |
|---------|-----------|
| `confirmed` | Done |
| `no_answer`, `busy`, transient `failed` | Retry in 2 min, then 5 min. After 3 attempts, escalate |
| `callback_requested` | Escalate with the AE's callback time; a person schedules it, since the time is free text |
| `ambiguous`, `wrong_person`, `deal_not_closed`, `declined` | Escalate; calling again would get the same answer |
| `failed` from DND or an invalid number | Escalate; a redial won't fix it |
