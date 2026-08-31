import { NextResponse } from "next/server";
import { quickSolvEntitlementService } from "@/core/billing/entitlementService";
import { dbService } from "@/services/supabase";

export const dynamic = "force-static";

export async function GET(request: Request) {
  try {
    let userId = "demo-user-123";
    try {
      if (request && request.url) {
        const { searchParams } = new URL(request.url);
        userId = searchParams.get("userId") || userId;
      }
    } catch (e) {
      // static export fallback
    }

    const entitlement = await quickSolvEntitlementService.getEntitlement(userId);
    const subscription = await dbService.getUserSubscription(userId);

    return NextResponse.json({
      success: true,
      subscription: {
        userId,
        plan: entitlement.plan,
        status: entitlement.subscriptionStatus,
        billingInterval: entitlement.billingInterval,
        credits: {
          mode: entitlement.creditMode,
          monthly: entitlement.monthlyCreditLimit,
          used: entitlement.creditsUsed,
          remaining: entitlement.creditsRemaining
        },
        currentPeriodStart: entitlement.billingPeriodStart,
        currentPeriodEnd: entitlement.billingPeriodEnd,
        cancelAtPeriodEnd: subscription?.cancel_at_period_end || false
      }
    });
  } catch (err: any) {
    console.error("API GET subscription failed:", err);
    return NextResponse.json({ error: "Failed to retrieve subscription status" }, { status: 500 });
  }
}
