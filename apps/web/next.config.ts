import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { updateInitialEnv } from "@next/env";
import type { NextConfig } from "next";

loadRootEnv();

const nextConfig: NextConfig = {
  serverExternalPackages: ["@composio/core"],
  // The floating dev badge sits on top of the sidebar's Settings link.
  devIndicators: false,
};

export default nextConfig;

/**
 * Secrets live in the monorepo root .env, shared by every app. @next/env caches its first load
 * (this app's dir), so the root file is parsed directly. The values also join Next's initial env
 * snapshot, which it restores whenever it reloads this app's own env files.
 */
function loadRootEnv(): void {
  const file = path.resolve(process.cwd(), "../../.env");
  if (!existsSync(file)) return;
  const rootEnv = parseEnv(readFileSync(file, "utf8"));
  const unset = Object.fromEntries(Object.entries(rootEnv).filter(([key]) => process.env[key] === undefined));
  Object.assign(process.env, unset);
  updateInitialEnv(unset);
}
