# Agents

Two agents. Each has a system prompt, tools, and a ReAct loop (`streamText` + tools).

| Agent | Route | Owns |
|-------|-------|------|
| intake | `/clients/[id]/intake` | Salesforce, voice, Rocketlane |
| comms | `/clients/[id]/comms` | Slack channel + welcome |

Kickoff is a button on the kanban. The page streams tool calls.

Prompts live in `apps/web/src/lib/server/agents/{intake,comms}/definition.ts`.
