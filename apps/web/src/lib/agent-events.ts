/** Server-sent events streamed while an agent runs. Shared by the runner and the browser. */
export type AgentEvent =
  | { type: "text"; text: string }
  | { type: "tool"; tool: string; status: "running" | "done"; input: unknown; output?: unknown }
  | { type: "done" }
  | { type: "error"; error: string };

export function encodeAgentEvent(event: AgentEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** Reads `data:` events from a streaming response body as they arrive. */
export async function* readAgentEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<AgentEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const json = frame.replace(/^data: /, "").trim();
      if (json) yield JSON.parse(json) as AgentEvent;
    }
  }
}
