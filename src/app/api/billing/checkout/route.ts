import { NextResponse } from "next/server";
import { defaultBillingProvider } from "@/core/billing/paymentProvider";

export const dynamic = "force-static";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, targetTier, interval, successUrl, cancelUrl } = body;

    if (!targetTier || !["plus", "pro"].includes(targetTier)) {
      return NextResponse.json({ error: "Invalid target plan tier" }, { status: 400 });
    }

    const activeUserId = userId || "demo-user-123";
    const session = await defaultBillingProvider.createCheckoutSession({
      userId: activeUserId,
      targetTier,
      interval: interval === "yearly" ? "yearly" : "monthly",
      successUrl: successUrl || "https://quicksolv.edu/developer/usage?checkout=success",
      cancelUrl: cancelUrl || "https://quicksolv.edu/developer/usage?checkout=cancel"
    });

    return NextResponse.json({ success: true, ...session });
  } catch (err: any) {
    console.error("API POST checkout failed:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
