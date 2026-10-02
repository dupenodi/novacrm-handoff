import { NextResponse } from "next/server";
import { disconnect } from "@/lib/server/composio";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await disconnect(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Disconnect failed" }, { status: 502 });
  }
}
