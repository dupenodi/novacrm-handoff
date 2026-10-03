import { jsonOk } from "@/lib/server/http";
import { listClients } from "@/lib/server/clients-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonOk({ clients: await listClients() });
}
