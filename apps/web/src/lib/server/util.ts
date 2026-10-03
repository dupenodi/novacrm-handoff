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
