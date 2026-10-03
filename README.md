# NovaCRM Handoff

Closed-won email → Intake (voice + Rocketlane) → Comms (Slack).

```
apps/web        Next.js — kanban, agent pages, webhooks
packages/ui     Geist theme
docs/           API.md, AGENTS.md, STATUS.md
```

```bash
pnpm install
pnpm dev        # http://localhost:3100
```

- `/` clients kanban
- `/clients/[id]/intake` · `/clients/[id]/comms`
- `/components`
- `/settings`

Copy `.env.example` to `.env`. After you host it, set `PUBLIC_APP_URL` and click **Enable Gmail trigger**. Until then, **Check mail** or `GET /api/mail/poll` every 5 minutes.
