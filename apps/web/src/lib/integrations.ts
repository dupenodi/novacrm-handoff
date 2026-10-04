/** Integration catalog and the status shape the Settings panel renders. Safe to import on the client. */

export type IntegrationGroup = "core" | "communication" | "voice";
type IntegrationMethod = "composio" | "api-key";

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
    scope: "Watches the CS inbox for deal handoff emails and replies to AEs.",
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
    scope: "Runs the Intake and Communication agents and reads deal emails.",
  },
];

export const COMPOSIO_TOOLKITS = new Set(
  INTEGRATIONS.filter((integration) => integration.method === "composio").map((integration) => integration.toolkit),
);

export const GROUP_ORDER: IntegrationGroup[] = ["core", "communication", "voice"];

export const GROUP_LABEL: Record<IntegrationGroup, string> = {
  core: "Core",
  communication: "Communication",
  voice: "Voice & AI",
};

/** Official marks for providers Composio doesn't logo. Served from /public/logos. */
const LOCAL_LOGOS: Record<string, string> = {
  sarvam: "/logos/sarvam.svg",
  openrouter: "/logos/openrouter.svg",
};

export function integrationLogoUrl(toolkit: string): string {
  return LOCAL_LOGOS[toolkit] ?? `https://logos.composio.dev/api/${encodeURIComponent(toolkit)}`;
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
  /** What Slack calls will actually do right now (real only if Slack is ACTIVE). */
  slackEffective: "mock" | "real";
};
