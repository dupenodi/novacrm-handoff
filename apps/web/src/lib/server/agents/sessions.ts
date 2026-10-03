import "server-only";
import type { AgentName, ToolTrace } from "@/lib/clients";
import { getSupabase, iso, newId, throwIfError } from "../db/client";
import type { AgentSession, SessionStatus } from "./types";

const SESSIONS = "novacrm_agent_sessions";
const INVOCATIONS = "novacrm_tool_invocations";

type SessionRow = {
  id: string;
  client_id: string;
  agent: AgentName;
  status: SessionStatus;
  state: Record<string, unknown> | string;
  created_at: string;
  updated_at: string;
};

type InvocationRow = {
  id: string;
  client_id: string;
  agent: AgentName;
  tool: string;
  input: unknown;
  output: unknown;
  error: string | null;
  status: string;
  created_at: string;
  finished_at: string | null;
};

function toSession(row: SessionRow): AgentSession {
  return {
    id: row.id,
    clientId: row.client_id,
    agent: row.agent,
    status: row.status,
    // Older rows stored state as a JSON string.
    state: typeof row.state === "string" ? JSON.parse(row.state) : (row.state ?? {}),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function toTrace(row: InvocationRow): ToolTrace {
  return {
    id: row.id,
    clientId: row.client_id,
    agent: row.agent,
    tool: row.tool,
    status: row.status,
    input: row.input,
    output: row.output ?? null,
    error: row.error,
    createdAt: iso(row.created_at),
    finishedAt: row.finished_at ? iso(row.finished_at) : null,
  };
}

// —— Sessions —————————————————————————————————————————————————————————————

export async function createSession(
  clientId: string,
  agent: AgentName,
  initialState: Record<string, unknown> = {},
): Promise<AgentSession> {
  const { data, error } = await getSupabase()
    .from(SESSIONS)
    .insert({ id: newId("sess"), client_id: clientId, agent, status: "active", state: initialState })
    .select("*")
    .single();
  throwIfError(error);
  return toSession(data as SessionRow);
}

export async function getSession(id: string): Promise<AgentSession | undefined> {
  const { data, error } = await getSupabase().from(SESSIONS).select("*").eq("id", id).maybeSingle();
  throwIfError(error);
  return data ? toSession(data as SessionRow) : undefined;
}

export async function latestSession(clientId: string, agent: AgentName): Promise<AgentSession | undefined> {
  const { data, error } = await getSupabase()
    .from(SESSIONS)
    .select("*")
    .eq("client_id", clientId)
    .eq("agent", agent)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(error);
  return data ? toSession(data as SessionRow) : undefined;
}

export async function saveSessionState(id: string, state: Record<string, unknown>): Promise<void> {
  const { error } = await getSupabase()
    .from(SESSIONS)
    .update({ state, updated_at: new Date().toISOString() })
    .eq("id", id);
  throwIfError(error);
}

export async function setSessionStatus(id: string, status: SessionStatus): Promise<void> {
  const { error } = await getSupabase()
    .from(SESSIONS)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  throwIfError(error);
}

// —— Tool invocations —————————————————————————————————————————————————————

export async function recordToolStart(input: {
  sessionId: string;
  clientId: string;
  agent: AgentName;
  tool: string;
  args: unknown;
}): Promise<string> {
  const id = newId("tool");
  const { error } = await getSupabase().from(INVOCATIONS).insert({
    id,
    session_id: input.sessionId,
    client_id: input.clientId,
    agent: input.agent,
    tool: input.tool,
    input: input.args ?? {},
    status: "running",
  });
  throwIfError(error);
  return id;
}

export async function recordToolFinish(
  id: string,
  result: { output?: unknown; error?: string; status: "done" | "failed" },
): Promise<void> {
  const { error } = await getSupabase()
    .from(INVOCATIONS)
    .update({
      output: result.output ?? null,
      error: result.error ?? null,
      status: result.status,
      finished_at: new Date().toISOString(),
    })
    .eq("id", id);
  throwIfError(error);
}

export async function listToolsForClient(clientId: string, agent?: AgentName, limit = 80): Promise<ToolTrace[]> {
  let query = getSupabase()
    .from(INVOCATIONS)
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (agent) query = query.eq("agent", agent);
  const { data, error } = await query;
  throwIfError(error);
  return ((data ?? []) as InvocationRow[]).map(toTrace);
}
