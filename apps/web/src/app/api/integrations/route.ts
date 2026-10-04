import { INTEGRATIONS, type IntegrationsStatus } from "@/lib/integrations";
import { jsonOk } from "@/lib/server/http";
import { isComposioConfigured, listConnections } from "@/lib/server/composio";
import { effectiveSlackMode, slackModeSetting } from "@/lib/server/slack-mode";
import { errorMessage } from "@/lib/server/util";

export const dynamic = "force-dynamic";

/** Which API-key integrations have their env var set. */
function apiKeysSet(): Record<string, boolean> {
  return Object.fromEntries(
    INTEGRATIONS.filter((integration) => integration.envVar).map((integration) => [
      integration.id,
      Boolean(process.env[integration.envVar!]?.trim()),
    ]),
  );
}

export async function GET() {
  const configured = isComposioConfigured();
  const status: IntegrationsStatus = {
    composio: { configured },
    connections: [],
    apiKeysSet: apiKeysSet(),
    slackMode: slackModeSetting(),
    slackEffective: "mock",
  };

  if (configured) {
    try {
      status.connections = await listConnections();
    } catch (error) {
      status.composio.error = errorMessage(error, "Couldn't reach Composio");
    }
    status.slackEffective = await effectiveSlackMode();
  }

  return jsonOk(status);
}
