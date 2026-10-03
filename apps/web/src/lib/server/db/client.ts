import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL?.trim() ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

let singleton: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (singleton) return singleton;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  singleton = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return singleton;
}

export function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export function iso(value: string | Date | null | undefined): string {
  if (!value) return new Date().toISOString();
  return new Date(value).toISOString();
}

/** Sortable, readable row id such as `cli_m1x2y3_ab12cd`. */
export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
