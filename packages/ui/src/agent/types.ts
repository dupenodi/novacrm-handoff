export type AgentTone = "ok" | "info" | "warn" | "risk" | "neutral";

export type ToolCallState =
  | "queued"
  | "running"
  | "done"
  | "empty"
  | "failed"
  | "skipped"
  | "needs-you";

export type MessageKind =
  | "you"
  | "assistant"
  | "pasted"
  | "voice"
  | "system"
  | "question"
  | "failed"
  | "streaming";

export type ComposerMode = "Ask" | "Capture" | "Dictate";

export type AgentGateVariant =
  | "reach"
  | "refusal"
  | "clarify"
  | "approval";

export type ProgressVariant =
  | "determinate"
  | "indeterminate"
  | "background"
  | "skeleton";

export const toolStateTone: Record<ToolCallState, AgentTone> = {
  queued: "neutral",
  running: "info",
  done: "ok",
  empty: "warn",
  failed: "risk",
  skipped: "neutral",
  "needs-you": "warn",
};

export const toolStateLabel: Record<ToolCallState, string> = {
  queued: "queued",
  running: "running",
  done: "done",
  empty: "empty",
  failed: "failed",
  skipped: "skipped",
  "needs-you": "needs you",
};
