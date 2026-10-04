/** Display formatting shared by the UI. */

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" });

export function formatRelative(iso: string, now = Date.now()): string {
  const seconds = Math.round((Date.parse(iso) - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86_400) return relative.format(Math.round(seconds / 86_400), "day");
  return formatDate(iso);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
}

/** "1.4s", "42s", "2m 05s". */
export function formatDuration(fromIso: string, toIso: string): string {
  const ms = Math.max(0, Date.parse(toIso) - Date.parse(fromIso));
  if (ms < 10_000) return `${(ms / 1000).toFixed(1)}s`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

/** A calendar date like "2026-10-04" → "Oct 4". */
export function formatDay(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** `"Jordan Lee" <jordan@acme.com>` → { name: "Jordan Lee", address: "jordan@acme.com" }. */
export function parseSender(sender: string | null): { name: string; address: string | null } {
  const raw = sender?.trim() ?? "";
  const match = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1]?.trim() || match[2]?.trim() || "Unknown sender", address: match[2]?.trim() ?? null };
  return { name: raw || "Unknown sender", address: raw.includes("@") ? raw : null };
}

export function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase();
}
