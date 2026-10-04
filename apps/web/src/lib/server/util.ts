export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/** Trimmed string, or "" for anything that isn't a string. */
export function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Splits a From header like `"Jordan Lee" <jordan@acme.com>` into name and address. */
export function parseSender(sender: string | null | undefined): { name: string | null; address: string | null } {
  const raw = sender?.trim() ?? "";
  const match = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1]?.trim() || null, address: match[2]?.trim() || null };
  return { name: null, address: raw.includes("@") ? raw : null };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: string | null | undefined): boolean {
  return Boolean(value && EMAIL_PATTERN.test(value.trim()));
}

/** "+919876543210" → "•••• 3210": enough to recognise a number without showing all of it. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 4 ? `•••• ${digits.slice(-4)}` : phone;
}

/** Legal-form words that don't change which company a name refers to. */
const COMPANY_SUFFIXES = new Set([
  "inc", "incorporated", "llc", "llp", "ltd", "limited", "corp", "corporation", "co", "company",
  "gmbh", "plc", "pvt", "private", "pte", "sa", "ag", "bv",
]);

/**
 * A customer name reduced to the words that identify it: lowercase, punctuation dropped, trailing
 * legal suffixes removed. "Acme Logistics, Inc." and "acme logistics" give the same key; two
 * different names never do. Matching on keys is exact — there's no partial or fuzzy match.
 */
export function customerKey(name: string | null | undefined): string | null {
  const words = (name ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  while (words.length > 1 && COMPANY_SUFFIXES.has(words.at(-1)!)) words.pop();
  return words.length ? words.join(" ") : null;
}

/** Whether two labels say the same thing, ignoring case, spacing and punctuation. Not a fuzzy match. */
export function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
  const norm = (value: string | null | undefined) =>
    (value ?? "").normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return Boolean(norm(a)) && norm(a) === norm(b);
}

export function firstName(name: string | null | undefined): string | null {
  return name?.trim().split(/\s+/)[0] || null;
}
