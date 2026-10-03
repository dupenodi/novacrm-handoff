import { NextResponse } from "next/server";

/** Composio sends the browser here after the hosted connect flow; bounce back to Settings with the outcome. */
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const error =
    params.get("error") ??
    params.get("error_description") ??
    (params.get("status") === "failed" ? "Connection failed" : null);

  const settings = new URL("/settings", request.url);
  if (error) settings.searchParams.set("error", error);
  else settings.searchParams.set("connected", params.get("toolkit") ?? "integration");
  settings.hash = "integrations";
  return NextResponse.redirect(settings);
}
