/**
 * In-memory stand-in for `src/lib/server/db.ts`, with the same functions and filter rules, plus the
 * schema's defaults and unique constraints that the app relies on.
 */
import type { ListOptions, Table, Where } from "@/lib/server/db";
import { table, world } from "./world";

const DEAL_COLUMNS = [
  "attention", "customerName", "customerKey", "contactName", "contactEmail", "aeName", "aeEmail", "aePhone",
  "opportunityUrl", "planName", "planQuote", "planConfirmedAt", "rocketlaneProjectId", "rocketlaneProjectName",
  "rocketlaneTemplateId", "rocketlaneTemplateName", "projectStartDate", "projectDueDate", "slackChannelId",
  "slackChannelName", "slackWelcomeAt", "customerEmailedAt",
];

/** Column defaults, as in supabase/schema.sql. */
function defaults(name: Table): Record<string, unknown> {
  const now = new Date().toISOString();
  switch (name) {
    case "novacrm_deals":
      return {
        ...Object.fromEntries(DEAL_COLUMNS.map((column) => [column, null])),
        status: "new",
        slackSimulated: false,
        createdAt: now,
        updatedAt: now,
      };
    case "novacrm_emails":
      return { threadId: null, sender: null, subject: null, body: null, receivedAt: null, reason: null, dealId: null, createdAt: now };
    case "novacrm_runs":
      return { summary: null, startedAt: now, finishedAt: null };
    case "novacrm_run_steps":
      return { seq: world.nextId++, tool: null, why: null, input: null, output: null, error: null, startedAt: now, finishedAt: null };
    default:
      return { updatedAt: now };
  }
}

/** Unique columns besides `id` (the deal's customer key and handoff email). */
const UNIQUE: Partial<Record<Table, string[]>> = {
  novacrm_deals: ["customerKey", "emailId"],
};

function keyOf(name: Table, values: Record<string, unknown>): string {
  return String(name === "novacrm_kv" ? values.key : values.id);
}

function violates(name: Table, values: Record<string, unknown>, ignoreId?: string): string | null {
  const existing = [...table(name).values()];
  if (!ignoreId && table(name).has(keyOf(name, values))) return "id";
  for (const column of UNIQUE[name] ?? []) {
    const value = values[column];
    if (value == null) continue;
    if (existing.some((row) => row[column] === value && keyOf(name, row) !== ignoreId)) return column;
  }
  return null;
}

function matches(row: Record<string, unknown>, where: Where): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (value === null) return row[key] == null;
    if (Array.isArray(value)) return value.includes(row[key] as never);
    return row[key] === value;
  });
}

const copy = <T>(row: Record<string, unknown>) => structuredClone(row) as T;

export function newId(prefix: string): string {
  return `${prefix}_${world.nextId++}`;
}

export async function insertRow<T>(name: Table, values: Partial<T>): Promise<T> {
  const row = { ...defaults(name), ...stripUndefined(values) };
  const conflict = violates(name, row);
  if (conflict) throw new Error(`${name}: duplicate key value violates unique constraint on ${conflict}`);
  table(name).set(keyOf(name, row), row);
  return copy<T>(row);
}

export async function insertRowIfAbsent<T>(name: Table, values: Partial<T>, conflictKey: string): Promise<T | null> {
  const value = (values as Record<string, unknown>)[conflictKey];
  if (value != null && [...table(name).values()].some((row) => row[conflictKey] === value)) return null;
  return insertRow(name, values);
}

export async function upsertRow<T>(name: Table, values: Partial<T>, conflictKey = "id"): Promise<T> {
  const value = (values as Record<string, unknown>)[conflictKey];
  const existing = [...table(name).values()].find((row) => row[conflictKey] === value);
  if (!existing) return insertRow(name, values);
  Object.assign(existing, stripUndefined(values));
  return copy<T>(existing);
}

export async function getRow<T>(name: Table, id: string): Promise<T | null> {
  return findRow<T>(name, { id });
}

export async function findRow<T>(name: Table, where: Where): Promise<T | null> {
  const [row] = await listRows<T>(name, { where, limit: 1 });
  return row ?? null;
}

export async function listRows<T>(name: Table, options: ListOptions = {}): Promise<T[]> {
  let found = [...table(name).values()].filter((row) => matches(row, options.where ?? {}));
  if (options.orderBy) {
    const key = options.orderBy;
    const direction = options.ascending === false ? -1 : 1;
    found = found.sort((a, b) => (String(a[key] ?? "") < String(b[key] ?? "") ? -direction : direction));
  }
  if (options.limit) found = found.slice(0, options.limit);
  return found.map((row) => copy<T>(row));
}

export async function updateRow<T>(name: Table, id: string, patch: Partial<T>): Promise<T> {
  const [row] = await updateRows<T>(name, { id }, patch);
  if (!row) throw new Error(`${name}: no row with id ${id}`);
  return row;
}

export async function updateRows<T>(name: Table, where: Where, patch: Partial<T>): Promise<T[]> {
  const targets = [...table(name).values()].filter((row) => matches(row, where));
  for (const row of targets) {
    const next = { ...row, ...stripUndefined(patch) };
    const conflict = violates(name, next, keyOf(name, row));
    if (conflict) throw new Error(`${name}: duplicate key value violates unique constraint on ${conflict}`);
  }
  for (const row of targets) Object.assign(row, stripUndefined(patch));
  return targets.map((row) => copy<T>(row));
}

function stripUndefined(values: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}
