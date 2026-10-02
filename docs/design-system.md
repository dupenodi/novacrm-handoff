# Signal UI component inventory

**Sources:** `product.html`, `onboarding.html`, `agent-related.html`, [`../PRODUCT_PLAN.md`](../PRODUCT_PLAN.md)  
**Theme:** Signal — Space Grotesk, ink `#0A1020`, electric `#1B34FF`, paper `#E7EBF1`, hard borders + offset shadows (not soft cards/pills).

Suggested folders under `apps/web/src/components/`:

```
ui/          # low-level primitives
chrome/      # app shell
domain/      # CRM / search surfaces
agent/       # assistant surface
capture/     # capture modal flow
onboarding/  # setup wizard
```

---

## Low-level (`ui/`)

Reusable, no domain knowledge. Build these first.

| Component | From | Notes |
|-----------|------|--------|
| `Button` | all mocks | Primary (blue fill), secondary (white), danger (Stop), ghost; hard shadow + press translate |
| `IconButton` | header avatar | Square 30×30 |
| `Input` / `Textarea` | search, capture, composer | Focus = blue border + blue offset shadow |
| `SecretField` | Settings secrets | Masked filled value + Edit (never empty + “Saved …” placeholder) |
| ChatGPT auth | Settings → ChatGPT provider | First-party device login under `apps/web/src/lib/chatgpt-auth` + `ChatGPTConnect` (Codex OAuth client; BYO subscription). Not the OpenCore SDK. |
| `Select` / channel tabs | Capture channels | Tab strip, not dropdown-first |
| `Badge` / `CountBadge` | Needs you, nav counts | Small uppercase or numeric chip |
| `Tag` / `TonePill` | inbox type, hero tags, stages | Tone variants: inbound / fact / guess / call / risky / quiet |
| `Chip` (filter) | Inbox filters, Companies tabs, agent phases | Selected = filled ink/blue |
| `Panel` | everywhere | White or muted fill, 1.5px ink border, radius 3, optional offset shadow |
| `Callout` | honesty / wipe / yellow notes | Variants: info (`#DEE2FF`), warn (`#FFF6D6`), danger (`#FFE1DC`) |
| `ProgressBar` | sidebar, onboarding | Thick bordered track, blue fill |
| `Avatar` | header, sidebar, people | Initials + hatch fill |
| `Kicker` | section labels | 9.5–10px uppercase tracking |
| `PageHeader` | main title row | Title + badge + sub + primary/secondary actions |
| `EmptyHint` / `FooterMeta` | inbox footer, quiet patterns | Small uppercase meta |
| `Modal` / `Overlay` | Capture | Centered or docked panel + dim |
| `Divider` / `Rule` | agent header | 1–1.5px ink/hairline |
| `Link` | Signal blue | `#1B34FF` → `#0F24CC` |
| `Tokens` (CSS vars) | all | Colors, shadow recipes, radii, type scale |

---

## Action placement

CTAs follow surface type — not a single “always left” or “always right” rule.

| Surface | Alignment | Button order | Use |
|---------|-----------|--------------|-----|
| **In-page forms** (settings, create cards, agent gates) | **Left** under fields | Primary first, then secondary / plain | `.form-actions` |
| **Dialogs / modals** | **Right** (trailing edge) | Dismissive / secondary first, **primary last** | `.modal-actions` or `Modal` `footer` |
| **List / integration rows** | **Right** of the row | Connect / Manage / Disconnect in the aside | `IntegrationRow`, `.entity-list__row` |
| **Card chrome** | Title row, trailing | Meta only (Refresh) — never primary Save | `Card` `actions` |

**Why:** In-page forms keep the primary action in the left scanning path of left-aligned fields ([IBM Carbon](https://carbondesignsystem.com/components/button/usage/#placement)). Dialogs put the confirming action on the trailing edge ([Material Design 3](https://m3.material.io/components/dialogs/guidelines), Apple HIG). Consistency within each surface matters more than micro-optimizing order ([NN/g](https://www.nngroup.com/articles/ok-cancel-or-cancel-ok/)).

**Do not** put Save / Test / primary submit in a card header. Header actions are for persistent optional controls (Refresh, Edit).

---

## Mid-level chrome (`chrome/`)

| Component | From | Notes |
|-----------|------|--------|
| `AppHeader` | `product.html` | Brand mark + search + Needs you + Capture + avatar |
| `AppSidebar` | `product.html` | Nav groups (“Your search” / “You”) + user progress card |
| `NavGroup` / `NavItem` | sidebar | Dot + label + optional count badge; active state |
| `SearchField` | header | Global search placeholder copy |
| `UserProgressCard` | sidebar footer | Avatar, “week N · local only”, bar, stage counts |
| `AppShell` | product | Header + sidebar + main |
| `MemoryBanner` | doctrine (not in mock yet) | “Memory unavailable” when SuperMemory down |

---

## Domain / CRM (`domain/`)

| Component | From | Notes |
|-----------|------|--------|
| `HeroDecisionCard` | Home | Tag + when + title + body + CTA |
| `SinceMondayList` | Home | Movement rows |
| `QuietThreadRow` | Home | Silent thread + quiet reason |
| `NextUpCard` | Home | Interview prep |
| `WeekStat` / `InsightCallout` | Home / Stats | Calm stats — no streaks |
| `InboxFilters` | Inbox | All · Inbound · Needs a fact · … |
| `InboxRow` | Inbox | Type pill · title · why · proposal · dual CTAs |
| `InboxQueue` | Inbox | List + “watched quietly” footer |
| `CompanyTable` / `CompanyRow` | Companies | Stage chip (click to advance), fit, persona, last touch |
| `StageChip` | Companies / People | Pipeline stage with tone colors |
| `PeopleList` / `PersonRow` | People | Name, role, lifecycle stage |
| `PersonDetail` | People | Habit, Watch out, primary action, Log message |
| `WatchOutBanner` | People / Inbox risky | Conflict / agency warning |
| `CallsTable` / `CallRow` | Calls | Who · when · state · what’s off · actions |
| `PersonaCard` / `PersonaTabs` | Profile | Line + proofs + leading/available |
| `NonNegotiablesEditor` | Profile / onboarding | Chips + hard/soft |
| `ShapeEditor` | onboarding | Roles, stage, team-size |
| `ConnectionRow` | Settings | Email/calendar/helper honesty states |
| `DangerZone` | Settings | Export / wipe callout |
| `StatFunnel` / `PersonaStatCard` | Stats | Funnel + per-persona reply |

---

## Capture (`capture/`)

| Component | From | Notes |
|-----------|------|--------|
| `CaptureModal` | product modal | Shell |
| `ChannelTabs` | Capture | LinkedIn DM, email, WhatsApp, dictate… |
| `CapturePaste` | Capture | Textarea + hint |
| `ParsedPreview` | Capture | What I read / unknowns / Then I’ll do this |
| `CaptureActions` | Capture | File it / dismiss |

Wires to `POST /captures` (dual-write already shipped).

---

## Agent (`agent/`) — from `agent-related.html`

| Component | From | Notes |
|-----------|------|--------|
| `Composer` | § composer | Ask / Capture / Dictate mode switch + input |
| `RunCard` | § live run | Status pill, elapsed, phase chips, Stop |
| `PhaseChips` | run header | Idle · Planning · Tools · Writing · Waiting on you |
| `MessageBubble` | message kinds | you / resumama / paste / voice / system / needs you / failed / writing |
| `PlanPanel` | run | Collapsible plan steps with glyphs |
| `ToolCallCard` | tool states | pending / running / ok / failed / partial |
| `GroundingChips` | grounding | Sources used (memory / thread / person) |
| `MemoryWriteReceipt` | memory | What was written; Forget |
| `ApprovalGate` | consent | Approve & send / copy / edit / discard |
| `RefusalBanner` | consent | Hard refuse / clarify |
| `ErrorCard` | failures | tool failed · rate limit · offline · memory unavailable |
| `ConfidencePips` | agent | Told / dated / guess (not fake %) |

---

## Onboarding (`onboarding/`)

| Component | From | Notes |
|-----------|------|--------|
| `OnboardingShell` | onboarding | Dark left rail + main |
| `StepRail` | left nav | Steps with marks, progress, side note |
| `StepHeader` | main | Kicker · title · sub |
| `PromiseCard` | step 1 | Numbered promise panels |
| `SituationPicker` / `PacePicker` | step 2 | |
| `MaterialImport` | step 4 | Resume/About → proofs |
| `PersonaDraft` | step 5 | Line + proofs editor |
| `PracticeCapture` | step 8 | Reuses capture components |
| `ReadySummary` | step 9 | Tomorrow’s inbox preview |

---

## Suggested build order (frontend)

1. **Tokens + `ui/*` primitives** (Button, Panel, Tag, Input, Callout)  
2. **`AppShell` + header/sidebar** + MemoryBanner  
3. **CaptureModal** → live `POST /captures`  
4. **Companies / People / Threads** thin screens on CRM APIs  
5. **Inbox + Home** (can mock InboxItem until schema exists)  
6. **Agent composer + RunCard** (Ask harness next on API)  
7. Onboarding last (or parallel once shell exists)

Materials / Presence / full LaTeX studio stay out of this Signal pass.
