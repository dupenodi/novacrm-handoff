import type { VoiceTurn } from "@/lib/clients";
import { isRecord, str } from "../util";

/**
 * Sarvam's transcript shape isn't pinned down, so accept the common ones:
 * plain "Speaker: text" lines, an array of turns, or an object wrapping that array.
 */
export function parseTranscript(raw: unknown): VoiceTurn[] {
  if (typeof raw === "string") return parseLines(raw);
  const turns = Array.isArray(raw) ? raw : isRecord(raw) ? findTurnList(raw) : null;
  if (!turns) return [];
  return turns.map(toTurn).filter((turn): turn is VoiceTurn => turn !== null);
}

const LIST_KEYS = ["messages", "transcript", "items", "turns", "utterances", "data"];

function findTurnList(bag: Record<string, unknown>): unknown[] | null {
  const list = LIST_KEYS.map((key) => bag[key]).find((value) => value != null);
  return Array.isArray(list) ? list : null;
}

function parseLines(text: string): VoiceTurn[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(agent|assistant|nova|ai|user|ae|human|customer)\s*[:—-]\s*(.+)$/i);
      if (!match) return { speaker: "other", text: line };
      return { speaker: speakerFrom(match[1]!), text: match[2]!.trim() };
    });
}

function toTurn(item: unknown): VoiceTurn | null {
  if (typeof item === "string") return { speaker: "other", text: item.trim() };
  if (!isRecord(item)) return null;

  const text = str(item.text ?? item.content ?? item.message ?? item.utterance ?? item.transcript);
  if (!text) return null;
  const role = str(item.role ?? item.speaker ?? item.channel ?? item.actor ?? item.name);
  const at = str(item.timestamp ?? item.at ?? item.start_time ?? item.time);
  return { speaker: speakerFrom(role), text, at: at || undefined };
}

function speakerFrom(role: string): VoiceTurn["speaker"] {
  const value = role.toLowerCase();
  if (/user|ae|human|customer|callee/.test(value)) return "ae";
  if (/agent|assistant|bot|nova|ai|system/.test(value)) return "nova";
  return "other";
}
