import { UserEntitlement, CustomerTier, SubscriptionStatus } from "./types";
import { getPlanConfig } from "./pricing";
import { dbService, supabase } from "@/services/supabase";

export class QuickSolvEntitlementService {
  /**
   * Derives trusted user entitlement server-side.
   * Client-supplied plan or credit overrides are strictly ignored.
   */
  async getEntitlement(userId: string): Promise<UserEntitlement> {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const billingPeriodStart = `${currentMonth}-01T00:00:00.000Z`;

    // Compute end of current month
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const billingPeriodEnd = endOfMonth.toISOString();

    let planTier: CustomerTier = "free";
    let subStatus: SubscriptionStatus = "active";
    let billingInterval: "monthly" | "yearly" = "monthly";

    // 1. Check Supabase Subscription / Profile if configured
    if (supabase) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tier, subscription_status, billing_interval")
        .eq("id", userId)
        .single();

      if (profile) {
        if (profile.tier === "plus" || profile.tier === "pro") {
          planTier = profile.tier as CustomerTier;
        }
        if (profile.subscription_status) {
          subStatus = profile.subscription_status as SubscriptionStatus;
        }
        if (profile.billing_interval) {
          billingInterval = profile.billing_interval;
        }
      }
    }

    const planConfig = getPlanConfig(planTier);

    // 2. Fetch Usage Credits
    const usage = await dbService.checkUsageLimit(userId);
    const creditsUsed = usage.count;

    // 3. Compute Remaining Credits
    let creditsRemaining: number | null = null;
    if (planConfig.creditMode === "FINITE" && planConfig.monthlyCredits !== null) {
      creditsRemaining = Math.max(0, planConfig.monthlyCredits - creditsUsed);
    }

    return {
      userId,
      plan: planTier,
      creditMode: planConfig.creditMode,
      monthlyCreditLimit: planConfig.monthlyCredits,
      creditsUsed,
      creditsRemaining,
      billingInterval,
      billingPeriodStart,
      billingPeriodEnd,
      subscriptionStatus: subStatus
    };
  }
}

export const quickSolvEntitlementService = new QuickSolvEntitlementService();
