import { NextResponse } from "next/server";

export function jsonOk<T>(body: T, init?: { status?: number }) {
  return NextResponse.json(body, { status: init?.status ?? 200 });
}

export function jsonError(error: string, status: number, code?: string) {
  return NextResponse.json(code ? { error, code } : { error }, { status });
}