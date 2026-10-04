import "server-only";

/** Composio brokers Gmail, Rocketlane and Slack. Set COMPOSIO_API_KEY in the root .env. */
export const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY?.trim() ?? "";

/** Every connected account lives under this Composio user. */
export const COMPOSIO_USER_ID = process.env.COMPOSIO_USER_ID?.trim() || "novacrm-cs";

/** Sarvam Voice Agents — places the outbound call that confirms the plan with the AE. */
export const SARVAM_API_KEY = process.env.SARVAM_API_KEY?.trim() ?? "";
export const SARVAM_ORG_ID = process.env.SARVAM_ORG_ID?.trim() ?? "";
export const SARVAM_WORKSPACE_ID = process.env.SARVAM_WORKSPACE_ID?.trim() ?? "";

/** The plan-confirm agent and the published version to run. */
export const SARVAM_APP_ID = process.env.SARVAM_APP_ID?.trim() ?? "";
export const SARVAM_APP_VERSION = Number(process.env.SARVAM_APP_VERSION?.trim() || "1");

/** Telephony connection that owns the rented number, and the number itself (E.164). */
export const SARVAM_CONNECTION_ID = process.env.SARVAM_CONNECTION_ID?.trim() ?? "";
export const SARVAM_AGENT_PHONE_NUMBER = process.env.SARVAM_AGENT_PHONE_NUMBER?.trim() ?? "";

/** Sarvam doesn't sign webhooks, so the webhook URL we hand it carries this secret. Any random string. */
export const SARVAM_WEBHOOK_SECRET = process.env.SARVAM_WEBHOOK_SECRET?.trim() ?? "";

/** Demos: every AE call rings this number (your handset) instead of the one in the email. */
export const DEMO_AE_PHONE = process.env.DEMO_AE_PHONE?.trim() ?? "";

/** OpenRouter — the model provider for the agents and email reading. */
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim() ?? "";
export const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL?.trim() || "anthropic/claude-haiku-4.5";

export const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL?.trim() ?? "";

/** Your Rocketlane workspace (e.g. https://acme.rocketlane.com), used to link to created projects. */
export const ROCKETLANE_APP_URL = process.env.ROCKETLANE_APP_URL?.trim().replace(/\/$/, "") ?? "";
