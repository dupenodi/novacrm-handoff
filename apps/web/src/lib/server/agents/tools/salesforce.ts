import "server-only";
import { runComposioTool } from "../../composio";
import { registerTool } from "../registry";

const OPPORTUNITY_FIELDS =
  "Id,Name,Amount,StageName,CloseDate,Type,AccountId,Account.Name,OwnerId,Owner.Name,Owner.Email";

/** Extract the 15/18-char Opportunity Id (006…) from a Salesforce URL or raw id. */
export function parseOpportunityId(urlOrId: string): string | null {
  const raw = urlOrId.trim();
  if (/^006[a-zA-Z0-9]{12,15}$/.test(raw)) return raw;
  return raw.match(/\/(006[a-zA-Z0-9]{12,15})/)?.[1] ?? null;
}

registerTool({
  name: "salesforce.get_opportunity",
  description:
    "Load a Salesforce Opportunity by id or URL (/006…). Use to fill customer, amount, stage, account gaps.",
  agents: ["intake"],
  composioSlug: "SALESFORCE_GET_OPPORTUNITY",
  inputSchema: {
    type: "object",
    required: ["opportunity"],
    properties: {
      opportunity: { type: "string", description: "Opportunity Id (006…) or full Salesforce opportunity URL" },
      fields: { type: "string", description: "Optional comma-separated field list" },
    },
  },
  async execute(input: { opportunity: string; fields?: string }) {
    const opportunityId = parseOpportunityId(input.opportunity);
    if (!opportunityId) {
      throw new Error(`Could not parse Salesforce opportunity id from: ${input.opportunity}`);
    }
    return runComposioTool("salesforce", "SALESFORCE_GET_OPPORTUNITY", {
      opportunity_id: opportunityId,
      fields: input.fields || OPPORTUNITY_FIELDS,
    });
  },
});

registerTool({
  name: "salesforce.search_account",
  description: "Search Salesforce Accounts by name (SOQL LIKE) when no opportunity id is present.",
  agents: ["intake"],
  composioSlug: "SALESFORCE_EXECUTE_SOQL_QUERY",
  inputSchema: {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string", description: "Account / customer name fragment" },
      limit: { type: "integer", description: "Max rows (default 10)" },
    },
  },
  execute(input: { name: string; limit?: number }) {
    const name = input.name.replace(/'/g, "\\'");
    const limit = Math.min(Math.max(input.limit ?? 10, 1), 25);
    return runComposioTool("salesforce", "SALESFORCE_EXECUTE_SOQL_QUERY", {
      soql_query: `SELECT Id, Name, Industry, Website, Phone FROM Account WHERE Name LIKE '%${name}%' LIMIT ${limit}`,
    });
  },
});
