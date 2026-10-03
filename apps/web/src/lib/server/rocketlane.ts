import "server-only";
import type { PlanTier } from "@/lib/clients";
import { runComposioTool } from "./composio";
import playbooks from "./rocketlane-playbooks.json";

type Company = { id?: string | number; companyId?: string | number; name?: string };

export function listProjects(pageSize = 100): Promise<unknown> {
  return runComposioTool("rocketlane", "ROCKETLANE_LIST_PROJECTS", { page_size: pageSize });
}

/** Creates the customer's onboarding project from the tier's playbook template. */
export async function createOnboardingProject(input: {
  customerName: string;
  tier: PlanTier;
  startDate?: string;
}) {
  const playbook = playbooks.playbooks[input.tier];
  if (!playbook?.templateId) {
    throw new Error(`No Rocketlane template configured for tier ${input.tier}`);
  }

  const startDate = input.startDate ?? todayUtc();
  const companyId = await findOrCreateCompany(input.customerName);
  const data = await runComposioTool("rocketlane", "ROCKETLANE_CREATE_PROJECT", {
    projectName: `${input.customerName} — ${playbook.label}`,
    customer: { companyId },
    owner: { emailId: playbooks.ownerEmail },
    startDate,
    dueDate: addDays(startDate, playbook.durationDays - 1),
    visibility: "EVERYONE",
    sources: [{ templateId: playbook.templateId, startDate }],
  });

  return { data, projectId: projectIdFrom(data), templateId: playbook.templateId };
}

/** Rocketlane returns the id either at the top level or under `data`. */
function projectIdFrom(data: unknown): string | null {
  const body = data as { projectId?: unknown; data?: { projectId?: unknown } } | null;
  const id = body?.projectId ?? body?.data?.projectId;
  return id ? String(id) : null;
}

/** Known company map first, then a fuzzy name match in Rocketlane, else create one. */
async function findOrCreateCompany(customerName: string): Promise<number> {
  const name = customerName.trim();
  const needle = name.toLowerCase();

  const known = Object.entries(playbooks.companies as Record<string, number>).find(([key]) =>
    needle.includes(key),
  );
  if (known) return known[1];

  const listed = (await runComposioTool("rocketlane", "ROCKETLANE_LIST_COMPANIES", {
    page_size: 100,
  })) as { companies?: Company[] } | null;
  const match = (listed?.companies ?? []).find((company) => namesMatch(needle, company.name));
  if (match?.id != null) return Number(match.id);

  const created = (await runComposioTool("rocketlane", "ROCKETLANE_CREATE_COMPANY", { name })) as Company | null;
  const id = created?.id ?? created?.companyId;
  if (id == null) throw new Error("Rocketlane create company returned no id");
  return Number(id);
}

function namesMatch(needle: string, companyName: string | undefined): boolean {
  const name = (companyName ?? "").trim().toLowerCase();
  return Boolean(name) && (needle.includes(name) || name.startsWith(needle));
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
