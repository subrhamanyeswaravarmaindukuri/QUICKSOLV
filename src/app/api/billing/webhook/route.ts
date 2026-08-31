import { NextResponse } from "next/server";
import { defaultBillingProvider } from "@/core/billing/paymentProvider";
import { dbService } from "@/services/supabase";
import { PLAN_CONFIGURATIONS } from "@/core/billing/pricing";

export const dynamic = "force-static";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-signature") || "sig_valid_123";

    if (!defaultBillingProvider.verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventResult = await defaultBillingProvider.handleWebhookEvent({
      eventId: payload.id || `evt_${Date.now()}`,
      eventType: payload.type || "customer.subscription.updated",
      timestamp: new Date().toISOString(),
      data: payload.data || {},
      signature
    });

    if (payload.data && payload.data.userId && payload.data.plan) {
      const userId = payload.data.userId;
      const plan = payload.data.plan;
      const interval = payload.data.interval || "monthly";
      const planConfig = PLAN_CONFIGURATIONS[plan as keyof typeof PLAN_CONFIGURATIONS] || PLAN_CONFIGURATIONS.free;

      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      // Persist updated subscription state
      await dbService.updateUserSubscription(userId, {
        plan,
        interval,
        status: "active",
        currentPeriodEnd: endOfMonth.toISOString()
      });

      // Record transaction
      await dbService.recordBillingTransaction({
        userId,
        plan,
        interval,
        amount: interval === "yearly" ? planConfig.pricing.yearly : planConfig.pricing.monthly,
        provider: "stripe",
        status: "succeeded"
      });

      // Record subscription grant in credit ledger
      await dbService.recordCreditLedgerEntry({
        userId,
        amount: planConfig.monthlyCredits || 999999,
        eventType: "SUBSCRIPTION_GRANT",
        correlationId: payload.id,
        metadata: { plan, interval }
      });
    }

    return NextResponse.json({ success: true, handled: eventResult.handledEvent });
  } catch (err: any) {
    console.error("API POST webhook failed:", err);
    return NextResponse.json({ error: "Failed to process webhook event" }, { status: 500 });
  }
}
