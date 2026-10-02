import "server-only";

/** Composio brokers Gmail, Rocketlane and Slack. Set COMPOSIO_API_KEY in the root .env. */
export const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY?.trim() ?? "";

/** Every connected account lives under this Composio user. */
export const COMPOSIO_USER_ID = "novacrm-cs";

/** Sarvam Voice Agents (Samvaad) — places the outbound AE tier-confirm call. */
export const SARVAM_API_KEY = process.env.SARVAM_API_KEY?.trim() ?? "";
export const SARVAM_ORG_ID = process.env.SARVAM_ORG_ID?.trim() ?? "";
export const SARVAM_WORKSPACE_ID = process.env.SARVAM_WORKSPACE_ID?.trim() ?? "";

/** The tier-confirm agent and the published version to run. */
export const SARVAM_APP_ID = process.env.SARVAM_APP_ID?.trim() ?? "";
export const SARVAM_APP_VERSION = Number(process.env.SARVAM_APP_VERSION?.trim() || "1");

/** Telephony connection that owns the rented number, and the number itself (E.164). */
export const SARVAM_CONNECTION_ID = process.env.SARVAM_CONNECTION_ID?.trim() ?? "";
export const SARVAM_AGENT_PHONE_NUMBER = process.env.SARVAM_AGENT_PHONE_NUMBER?.trim() ?? "";

/** Optional default AE number for the local tier-call smoke test. */
export const SARVAM_TEST_AE_NUMBER = process.env.SARVAM_TEST_AE_NUMBER?.trim() ?? "";
