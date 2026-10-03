import "server-only";
import type { Client, ClientStage } from "@/lib/clients";
import { getSupabase, iso, newId, throwIfError } from "./db/client";

const CLIENTS = "novacrm_clients";
const MAIL_SEEN = "novacrm_mail_seen";

type Row = {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  ae_name: string | null;
  ae_email: string | null;
  ae_phone: string | null;
  opportunity_url: string | null;
  gmail_message_id: string | null;
  stage: ClientStage;
  rocketlane_project_id: string | null;
  slack_channel: string | null;
  created_at: string;
  updated_at: string;
};

/** Fields an update may change, mapped to their column. */
const PATCHABLE = {
  name: "name",
  contactName: "contact_name",
  contactEmail: "contact_email",
  aeName: "ae_name",
  aeEmail: "ae_email",
  aePhone: "ae_phone",
  opportunityUrl: "opportunity_url",
  stage: "stage",
  rocketlaneProjectId: "rocketlane_project_id",
  slackChannel: "slack_channel",
} as const satisfies Partial<Record<keyof Client, keyof Row>>;

/** Fields set when a client is created. */
const INSERTABLE = { ...PATCHABLE, gmailMessageId: "gmail_message_id" } as const;

export type ClientPatch = Partial<Pick<Client, keyof typeof PATCHABLE>>;

export type NewClient = Pick<Client, "name"> &
  Partial<Pick<Client, "contactName" | "contactEmail" | "aeName" | "aeEmail" | "aePhone" | "opportunityUrl" | "gmailMessageId">>;

function toClient(row: Row): Client {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    aeName: row.ae_name,
    aeEmail: row.ae_email,
    aePhone: row.ae_phone,
    opportunityUrl: row.opportunity_url,
    gmailMessageId: row.gmail_message_id,
    stage: row.stage,
    rocketlaneProjectId: row.rocketlane_project_id,
    slackChannel: row.slack_channel,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

/** Picks the mapped fields that have a value; anything else is left out of the write. */
function toColumns(fields: Partial<Client>, columns: Record<string, string>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [field, column] of Object.entries(columns)) {
    const value = fields[field as keyof Client];
    if (value !== undefined) row[column] = value;
  }
  return row;
}

export async function listClients(): Promise<Client[]> {
  const { data, error } = await getSupabase().from(CLIENTS).select("*").order("updated_at", { ascending: false });
  throwIfError(error);
  return ((data ?? []) as Row[]).map(toClient);
}

async function findClientBy(column: "id" | "gmail_message_id", value: string): Promise<Client | undefined> {
  const { data, error } = await getSupabase().from(CLIENTS).select("*").eq(column, value).maybeSingle();
  throwIfError(error);
  return data ? toClient(data as Row) : undefined;
}

export function getClient(id: string): Promise<Client | undefined> {
  return findClientBy("id", id);
}

export function getClientByGmail(messageId: string): Promise<Client | undefined> {
  return findClientBy("gmail_message_id", messageId);
}

export async function insertClient(input: NewClient): Promise<Client> {
  const { data, error } = await getSupabase()
    .from(CLIENTS)
    .insert({ ...toColumns(input, INSERTABLE), id: newId("cli"), stage: "received" })
    .select("*")
    .single();
  throwIfError(error);
  return toClient(data as Row);
}

/** Applies the patch and returns the updated client, or undefined if it doesn't exist. */
export async function updateClient(id: string, patch: ClientPatch): Promise<Client | undefined> {
  const { data, error } = await getSupabase()
    .from(CLIENTS)
    .update({ ...toColumns(patch, PATCHABLE), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  throwIfError(error);
  return data ? toClient(data as Row) : undefined;
}

export async function markMailSeen(messageId: string): Promise<void> {
  const { error } = await getSupabase()
    .from(MAIL_SEEN)
    .upsert(
      { message_id: messageId, seen_at: new Date().toISOString() },
      { onConflict: "message_id", ignoreDuplicates: true },
    );
  throwIfError(error);
}

export async function wasMailSeen(messageId: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from(MAIL_SEEN)
    .select("message_id")
    .eq("message_id", messageId)
    .maybeSingle();
  throwIfError(error);
  return Boolean(data);
}
