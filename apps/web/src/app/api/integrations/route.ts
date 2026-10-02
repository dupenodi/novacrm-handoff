import { NextResponse } from "next/server";
import { INTEGRATIONS, type IntegrationsStatus } from "@/lib/integrations";
import { isComposioConfigured, listConnections } from "@/lib/server/composio";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isComposioConfigured();
  const status: IntegrationsStatus = {
    composio: { configured },
    connections: [],
    apiKeysSet: Object.fromEntries(
      INTEGRATIONS.filter((integration) => integration.envVar).map((integration) => [
        integration.id,
        Boolean(process.env[integration.envVar!]?.trim()),
      ]),
    ),
    slackMode: process.env.SLACK_MODE === "real" ? "real" : "mock",
  };

  if (configured) {
    try {
      status.connections = await listConnections();
    } catch (error) {
      status.composio.error = error instanceof Error ? error.message : "Couldn't reach Composio";
    }
  }
  return NextResponse.json(status);
}
