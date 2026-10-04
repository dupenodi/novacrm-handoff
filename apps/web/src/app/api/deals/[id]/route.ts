import { jsonError, jsonOk } from "@/lib/server/http";
import { getDealView } from "@/lib/server/store";
import { errorMessage } from "@/lib/server/util";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const view = await getDealView(id);
    return view ? jsonOk(view) : jsonError("This onboarding doesn't exist.", 404, "not_found");
  } catch (error) {
    return jsonError(errorMessage(error, "Couldn't load this onboarding"), 500);
  }
}
