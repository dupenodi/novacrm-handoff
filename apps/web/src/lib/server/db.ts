import "server-only";
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Table-agnostic data access over Supabase. Callers use camelCase field names; columns are
 * snake_case. Only top-level keys are converted, so jsonb values come back exactly as stored.
 */

export type Table =
  | "novacrm_emails"
  | "novacrm_deals"
  | "novacrm_runs"
  | "novacrm_run_steps"
  | "novacrm_calls"
  | "novacrm_kv";

type Scalar = string | number | boolean | null;

/** Equality filters. An array means "any of", null means "is null". */
export type Where = Record<string, Scalar | readonly Scalar[]>;

export type ListOptions = {
  where?: Where;
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
};

let client: SupabaseClient | null = null;

function supabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

/** Sortable, readable id such as `deal_m1x2y3k4_9f2c1a`. */
export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
}

export async function insertRow<T>(table: Table, values: Partial<T>): Promise<T> {
  const { data, error } = await supabase().from(table).insert(toColumns(values)).select().single();
  check(error, table);
  return toRecord<T>(data);
}

/** Inserts unless a row with the same `conflictKey` exists. Returns null when it did. */
export async function insertRowIfAbsent<T>(table: Table, values: Partial<T>, conflictKey: string): Promise<T | null> {
  const { data, error } = await supabase()
    .from(table)
    .upsert(toColumns(values), { onConflict: toSnake(conflictKey), ignoreDuplicates: true })
    .select();
  check(error, table);
  return data?.[0] ? toRecord<T>(data[0]) : null;
}

export async function upsertRow<T>(table: Table, values: Partial<T>, conflictKey = "id"): Promise<T> {
  const { data, error } = await supabase()
    .from(table)
    .upsert(toColumns(values), { onConflict: toSnake(conflictKey) })
    .select()
    .single();
  check(error, table);
  return toRecord<T>(data);
}

export async function getRow<T>(table: Table, id: string): Promise<T | null> {
  return findRow<T>(table, { id });
}

export async function findRow<T>(table: Table, where: Where): Promise<T | null> {
  const [row] = await listRows<T>(table, { where, limit: 1 });
  return row ?? null;
}

export async function listRows<T>(table: Table, options: ListOptions = {}): Promise<T[]> {
  let query = filter(supabase().from(table).select(), options.where ?? {});
  if (options.orderBy) query = query.order(toSnake(options.orderBy), { ascending: options.ascending ?? true });
  if (options.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  check(error, table);
  return (data ?? []).map((row) => toRecord<T>(row));
}

export async function updateRow<T>(table: Table, id: string, patch: Partial<T>): Promise<T> {
  const [row] = await updateRows<T>(table, { id }, patch);
  if (!row) throw new Error(`${table}: no row with id ${id}`);
  return row;
}

/** Updates every row matching `where` and returns them. An empty result means nothing matched. */
export async function updateRows<T>(table: Table, where: Where, patch: Partial<T>): Promise<T[]> {
  const { data, error } = await filter(supabase().from(table).update(toColumns(patch)), where).select();
  check(error, table);
  return (data ?? []).map((row) => toRecord<T>(row));
}

// —— Helpers ——————————————————————————————————————————————————————————————

type Filterable = {
  eq(column: string, value: Scalar): Filterable;
  is(column: string, value: null): Filterable;
  in(column: string, values: readonly Scalar[]): Filterable;
};

function filter<Q>(query: Q, where: Where): Q {
  let q = query as unknown as Filterable;
  for (const [key, value] of Object.entries(where)) {
    const column = toSnake(key);
    if (value === null) q = q.is(column, null);
    else if (Array.isArray(value)) q = q.in(column, value);
    else q = q.eq(column, value as Scalar);
  }
  return q as unknown as Q;
}

function check(error: { message: string } | null, table: Table): void {
  if (error) throw new Error(`${table}: ${error.message}`);
}

function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function toColumns(values: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [toSnake(key), value]),
  );
}

function toRecord<T>(row: Record<string, unknown>): T {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [toCamel(key), value])) as T;
}
