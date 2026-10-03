# HTTP API

Errors: `{ "error": "message", "code": "optional_code" }`

## Clients

| Method | Path | Body | Response |
|--------|------|------|----------|
| `GET` | `/api/clients` | — | `{ clients }` |
| `GET` | `/api/clients/[id]` | — | `{ client, intake, comms }` |
| `POST` | `/api/clients/[id]/intake` | — | SSE tool/text stream |
| `POST` | `/api/clients/[id]/comms` | — | SSE tool/text stream |

Client `stage`: `received` → `project` → `comms`.

## Mail

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/webhooks/composio` | Gmail new-message trigger |
| `GET`/`POST` | `/api/mail/poll` | Cheap LLM classify, every 5 min or manual |
| `POST` | `/api/mail/setup` | Enable `GMAIL_NEW_GMAIL_MESSAGE` (needs `PUBLIC_APP_URL`) |

## Other

| Method | Path |
|--------|------|
| `GET` | `/api/agents` |
| `GET` | `/api/integrations` |
| `POST` | `/api/integrations/connect` |

SQLite: `apps/web/.data/app.sqlite`
