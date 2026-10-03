import { NextResponse } from "next/server";

export function jsonOk<T>(body: T, init?: { status?: number }) {
  return NextResponse.json(body, { status: init?.status ?? 200 });
}

export function jsonError(error: string, status: number, code?: string) {
  return NextResponse.json(code ? { error, code } : { error }, { status });
}

export function sseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}
