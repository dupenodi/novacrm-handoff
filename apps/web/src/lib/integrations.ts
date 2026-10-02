/** Integration catalog and the status shape the Settings panel renders. Safe to import on the client. */

export type IntegrationGroup = "core" | "communication" | "voice";
export type IntegrationMethod = "composio" | "api-key";

export type IntegrationDef = {
  id: string;
  name: string;
  /** Composio toolkit slug, also used for the logo. */
  toolkit: string;
  group: IntegrationGroup;
  method: IntegrationMethod;
  /** Env var holding the key, for API-key integrations. */
  envVar?: string;
  scope: string;
};

export const INTEGRATIONS: IntegrationDef[] = [
  {
    id: "gmail",
    name: "Gmail",
    toolkit: "gmail",
    group: "core",
    method: "composio",
    scope: "Watches the onboarding inbox for newly closed deals.",
  },
  {
    id: "rocketlane",
    name: "Rocketlane",
    toolkit: "rocketlane",
    group: "core",
    method: "composio",
    scope: "Creates each customer's onboarding project from the right plan template.",
  },
  {
    id: "slack",
    name: "Slack",
    toolkit: "slack",
    group: "communication",
    method: "composio",
    scope: "Opens a channel for each new customer and posts a welcome message.",
  },
  {
    id: "sarvam",
    name: "Sarvam",
    toolkit: "sarvam",
    group: "voice",
    method: "api-key",
    envVar: "SARVAM_API_KEY",
    scope: "Calls the account executive to confirm the customer's plan.",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    toolkit: "openrouter",
    group: "voice",
    method: "api-key",
    envVar: "OPENROUTER_API_KEY",
    scope: "Reads deal emails and makes sense of what's said on calls.",
  },
];

export const COMPOSIO_TOOLKITS = new Set(
  INTEGRATIONS.filter((integration) => integration.method === "composio").map((integration) => integration.toolkit),
);

export const METHOD_LABEL: Record<IntegrationMethod, string> = {
  composio: "Composio",
  "api-key": "API key",
};

export const GROUP_ORDER: IntegrationGroup[] = ["core", "communication", "voice"];

export function integrationGroupLabel(group: IntegrationGroup): string {
  switch (group) {
    case "core":
      return "Core";
    case "communication":
      return "Communication";
    case "voice":
      return "Voice & AI";
  }
}

export function integrationLogoUrl(toolkit: string): string {
  return `https://logos.composio.dev/api/${encodeURIComponent(toolkit)}`;
}

export type ComposioConnection = {
  toolkit: string;
  accountId: string;
  status: string;
  label: string | null;
};

export type IntegrationsStatus = {
  composio: {
    configured: boolean;
    error?: string;
  };
  connections: ComposioConnection[];
  /** Which API-key integrations have their env var set. */
  apiKeysSet: Record<string, boolean>;
  slackMode: "mock" | "real";
};
