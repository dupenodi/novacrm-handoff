import "server-only";
import type { Staffing, TemplateSummary } from "@/lib/step-outputs";
import { proxyComposio, runComposioTool } from "./composio";
import team from "./rocketlane-team.json";
import { customerKey, isRecord, str } from "./util";

type ListedCompany = { id?: string | number; name?: string };

type ListedProject = {
  projectId?: string | number;
  projectName?: string;
  archived?: boolean;
  customer?: { companyId?: string | number; companyName?: string };
};

type RawUser = { userId?: string | number; emailId?: string; firstName?: string; lastName?: string };

type RawTask = { assignee?: { users?: RawUser[]; teams?: unknown[] } };

type RawTemplate = {
  templateId?: string | number;
  templateName?: string;
  templateContent?: {
    duration?: number;
    projectPhases?: Array<{ projectPhaseName?: string; duration?: number; startDay?: number; tasks?: RawTask[] }>;
  };
};

export type CreatedProject = { projectId: string; projectName: string; startDate: string; dueDate: string };

// —— Templates ————————————————————————————————————————————————————————————

/** Every published project template in Rocketlane, with its phases and timeline. */
export async function listProjectTemplates(): Promise<TemplateSummary[]> {
  const data = (await runComposioTool("rocketlane", "ROCKETLANE_LIST_TEMPLATES", {
    object_type: "PROJECT",
    page_size: 100,
  })) as { templates?: Array<{ template_id?: string | number }> } | null;
  const ids = (data?.templates ?? []).flatMap((t) => (t.template_id != null ? [String(t.template_id)] : []));
  return Promise.all(ids.map(getProjectTemplate));
}

export async function getProjectTemplate(templateId: string): Promise<TemplateSummary> {
  const raw = (await runComposioTool("rocketlane", "ROCKETLANE_GET_TEMPLATE_BY_ID", {
    template_id: templateId,
  })) as RawTemplate | null;
  if (!raw?.templateContent) throw new Error(`Rocketlane has no project template ${templateId}.`);

  const phases = (raw.templateContent.projectPhases ?? []).map((phase) => ({
    name: decodeEntities(str(phase.projectPhaseName)) || "Untitled phase",
    taskCount: phase.tasks?.length ?? 0,
  }));
  const workingDays = raw.templateContent.duration ?? 0;
  const tasks = (raw.templateContent.projectPhases ?? []).flatMap((phase) => phase.tasks ?? []);
  return {
    templateId: String(raw.templateId ?? templateId),
    name: decodeEntities(str(raw.templateName)) || `Template ${templateId}`,
    staffing: staffingOf(tasks),
    workingDays,
    calendarDays: workingDays ? daysBetween(firstWorkingDay(), addWorkingDays(firstWorkingDay(), workingDays - 1)) + 1 : 0,
    phases,
    taskCount: phases.reduce((sum, phase) => sum + phase.taskCount, 0),
  };
}

/**
 * Dedicated or pooled, from who the template's tasks are assigned to. Templates assign work to teams
 * (pooled: whoever on the team is free picks it up); a dedicated plan assigns it to a named person.
 * The person assigned the most tasks is the customer's CSM.
 */
function staffingOf(tasks: RawTask[]): Staffing {
  const counts = new Map<string, { name: string; tasks: number }>();
  for (const user of tasks.flatMap((task) => task.assignee?.users ?? [])) {
    const id = String(user.userId ?? user.emailId ?? "");
    if (!id) continue;
    const name = [user.firstName, user.lastName].map(str).filter(Boolean).join(" ") || str(user.emailId);
    const entry = counts.get(id) ?? { name, tasks: 0 };
    entry.tasks += 1;
    counts.set(id, entry);
  }
  const [csm] = [...counts.values()].sort((a, b) => b.tasks - a.tasks);
  return csm ? { model: "dedicated", csm: csm.name } : { model: "pooled" };
}

// —— Companies and projects ———————————————————————————————————————————————

/** The customer's Rocketlane company: the one whose name has the same customer key. */
export async function findCompany(customerName: string): Promise<{ id: string; name: string } | null> {
  const key = customerKey(customerName);
  const data = (await runComposioTool("rocketlane", "ROCKETLANE_LIST_COMPANIES", { page_size: 100 })) as {
    companies?: ListedCompany[];
  } | null;
  const matches = (data?.companies ?? []).filter((company) => key && customerKey(company.name) === key);
  if (matches.length > 1) {
    throw new Error(`Rocketlane has ${matches.length} companies named like "${customerName}". A person needs to pick one.`);
  }
  const [match] = matches;
  return match?.id != null ? { id: String(match.id), name: match.name ?? customerName } : null;
}

/**
 * Rocketlane requires an account owner on new companies, and Composio's create-company tool doesn't
 * send one (Rocketlane answers 500). Until that's fixed this calls the REST endpoint through
 * Composio's proxy.
 */
export async function createCompany(customerName: string): Promise<{ id: string; name: string }> {
  const created = (await proxyComposio("rocketlane", {
    endpoint: "/1.0/companies",
    method: "POST",
    body: { companyName: customerName.trim(), accountOwner: { emailId: team.ownerEmail } },
  })) as { companyId?: number | string; companyName?: string } | null;
  if (created?.companyId == null) throw new Error("Rocketlane didn't return an id for the new company");
  return { id: String(created.companyId), name: created.companyName ?? customerName };
}

/** Open (not archived) projects that belong to a company. */
export async function listCompanyProjects(companyId: string): Promise<Array<{ projectId: string; projectName: string }>> {
  const data = (await runComposioTool("rocketlane", "ROCKETLANE_LIST_PROJECTS", { page_size: 100 })) as {
    data?: ListedProject[];
  } | null;
  return (data?.data ?? [])
    .filter((project) => !project.archived && String(project.customer?.companyId ?? "") === companyId)
    .flatMap((project) =>
      project.projectId != null
        ? [{ projectId: String(project.projectId), projectName: project.projectName ?? "Untitled project" }]
        : [],
    );
}

/** Creates the onboarding project from a template, starting on the next working day (today if it is one). */
export async function createProject(input: {
  projectName: string;
  companyId: string;
  template: TemplateSummary;
}): Promise<CreatedProject> {
  const startDate = firstWorkingDay();
  const dueDate = addWorkingDays(startDate, Math.max(input.template.workingDays - 1, 0));
  const data = await runComposioTool("rocketlane", "ROCKETLANE_CREATE_PROJECT", {
    projectName: input.projectName,
    customer: { companyId: Number(input.companyId) },
    owner: { emailId: team.ownerEmail },
    startDate,
    dueDate,
    visibility: "EVERYONE",
    sources: [{ templateId: Number(input.template.templateId), startDate }],
  });
  const projectId = projectIdFrom(data);
  if (!projectId) throw new Error("Rocketlane didn't return a project id");
  return { projectId, projectName: input.projectName, startDate, dueDate };
}

/** Rocketlane returns the id either at the top level or under `data`. */
function projectIdFrom(data: unknown): string | null {
  const body = isRecord(data) ? data : null;
  const id = body?.projectId ?? (isRecord(body?.data) ? body.data.projectId : undefined);
  return id ? String(id) : null;
}

// —— Dates ————————————————————————————————————————————————————————————————

/** Today, or the following Monday when today is a weekend: Rocketlane's day 1 is a working day. */
function firstWorkingDay(): string {
  const date = new Date();
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** The date `days` working days after `isoDate`, skipping Saturdays and Sundays. */
function addWorkingDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  let left = days;
  while (left > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) left--;
  }
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

/** Rocketlane returns some names HTML-escaped ("Kickoff &amp; Readiness"). */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
