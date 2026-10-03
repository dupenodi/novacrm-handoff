import "server-only";
import type { PlanTier } from "@/lib/clients";
import { updateClient } from "../../clients-store";
import { createOnboardingProject, listProjects } from "../../rocketlane";
import { registerTool } from "../registry";

registerTool({
  name: "rocketlane.list_projects",
  description: "List Rocketlane projects (use to detect duplicates for a customer).",
  agents: ["intake"],
  composioSlug: "ROCKETLANE_LIST_PROJECTS",
  inputSchema: {
    type: "object",
    properties: { page_size: { type: "integer" } },
  },
  execute: (input: { page_size?: number }) => listProjects(input.page_size),
});

registerTool({
  name: "rocketlane.create_project",
  description:
    "Create a Rocketlane onboarding project from the Growth or Enterprise template for a customer company name.",
  agents: ["intake"],
  composioSlug: "ROCKETLANE_CREATE_PROJECT",
  inputSchema: {
    type: "object",
    required: ["customerName", "tier"],
    properties: {
      customerName: { type: "string" },
      tier: { type: "string", enum: ["growth", "enterprise"] },
      startDate: { type: "string", description: "YYYY-MM-DD (default: today UTC)" },
    },
  },
  async execute(input: { customerName: string; tier: PlanTier; startDate?: string }, ctx) {
    const project = await createOnboardingProject(input);
    if (project.projectId) {
      await updateClient(ctx.clientId, { rocketlaneProjectId: project.projectId, stage: "project" });
    }
    return project;
  },
});
