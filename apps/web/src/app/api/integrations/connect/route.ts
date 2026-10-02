import { NextResponse } from "next/server";
import { COMPOSIO_TOOLKITS } from "@/lib/integrations";
import { startConnection } from "@/lib/server/composio";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { toolkit?: unknown };
  const toolkit = typeof body.toolkit === "string" ? body.toolkit.trim().toLowerCase() : "";
  if (!COMPOSIO_TOOLKITS.has(toolkit)) {
    return NextResponse.json(
      { error: `“${toolkit || "(none)"}” isn't connectable here. Allowed: ${[...COMPOSIO_TOOLKITS].join(", ")}.` },
      { status: 400 },
    );
  }

  const callbackUrl = new URL(`/api/integrations/callback?toolkit=${encodeURIComponent(toolkit)}`, request.url);
  try {
    return NextResponse.json({ redirectUrl: await startConnection(toolkit, callbackUrl.toString()) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Connect failed" }, { status: 502 });
  }
}
