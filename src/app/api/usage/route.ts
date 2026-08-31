import { NextResponse } from "next/server";
import { dbService } from "@/services/supabase";
import { quickSolvEntitlementService } from "@/core/billing/entitlementService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "demo-user-123";

    const usage = await dbService.checkUsageLimit(userId);
    const entitlement = await quickSolvEntitlementService.getEntitlement(userId);

    return NextResponse.json({
      success: true,
      count: usage.count,
      max: entitlement.monthlyCreditLimit || 999999,
      plan: entitlement.plan,
      creditMode: entitlement.creditMode,
      monthlyCreditLimit: entitlement.monthlyCreditLimit,
      creditsUsed: entitlement.creditsUsed,
      creditsRemaining: entitlement.creditsRemaining,
      subscriptionStatus: entitlement.subscriptionStatus
    });
  } catch (err: any) {
    console.error("API GET usage failed:", err);
    return NextResponse.json({ error: "Failed to retrieve usage stats" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, subject, topic, score, total } = body;

    if (score === undefined || total === undefined) {
      return NextResponse.json({ error: "Score and total are required" }, { status: 400 });
    }

    const activeUserId = userId || "demo-user-123";
    const result = await dbService.saveQuizResult(activeUserId, subject || "General", topic || "Quiz", score, total);

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error("API POST quiz results failed:", err);
    return NextResponse.json({ error: "Failed to save quiz result" }, { status: 500 });
  }
}
