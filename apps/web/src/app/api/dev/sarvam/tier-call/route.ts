import { NextResponse } from "next/server";
import { SARVAM_TEST_AE_NUMBER } from "@/lib/server/config";
import {
  confirmPlanTier,
  createTierConfirmCall,
  isSarvamConfigured,
  missingSarvamEnv,
  nextStepFor,
} from "@/lib/server/sarvam";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Body = {
  aePhone?: string;
  aeName?: string;
  customerName?: string;
  /** When false, return immediately after create (no poll). Default true. */
  wait?: boolean;
  /** Which attempt this is (1–3), for the retry policy. Default 1. */
  attempt?: number;
};

/**
 * Dev smoke test for the Sarvam tier-confirm building block.
 * POST { aePhone?, aeName?, customerName?, wait?, attempt? }
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  if (!isSarvamConfigured()) {
    return NextResponse.json(
      { error: `Sarvam not configured. Missing: ${missingSarvamEnv().join(", ") || "SARVAM_APP_VERSION"}` },
      { status: 503 },
    );
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const aePhone = body.aePhone?.trim() || SARVAM_TEST_AE_NUMBER;
  if (!aePhone) {
    return NextResponse.json(
      { error: "Pass aePhone or set SARVAM_TEST_AE_NUMBER in .env" },
      { status: 400 },
    );
  }

  const aeName = body.aeName?.trim() || "Dana Reyes";
  const customerName = body.customerName?.trim() || "Acme Logistics";
  const wait = body.wait !== false;
  const attempt = Number.isInteger(body.attempt) && body.attempt! > 0 ? body.attempt! : 1;

  try {
    if (!wait) {
      const { attemptId } = await createTierConfirmCall({ aePhone, aeName, customerName });
      return NextResponse.json({ attemptId, waited: false });
    }

    const result = await confirmPlanTier({ aePhone, aeName, customerName });

    return NextResponse.json({
      ...result,
      // Drop the raw attempt row from the HTTP response.
      raw: undefined,
      nextStep: nextStepFor(result, attempt),
      waited: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sarvam call failed" },
      { status: 502 },
    );
  }
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  return NextResponse.json({
    configured: isSarvamConfigured(),
    missing: missingSarvamEnv(),
    hint: 'POST { "aePhone": "+91…", "aeName": "Dana", "customerName": "Acme" }',
  });
}
