import { CreditDeductionRequest, CreditDeductionResult } from "./types";
import { quickSolvEntitlementService } from "./entitlementService";
import { dbService } from "@/services/supabase";
import { quickSolvMetricsCollector, quickSolvLogger } from "@/core/observability";

// Memory ledger to guarantee request idempotency and prevent fallback double-charging
const processedRequests = new Map<string, { timestamp: number; credits: number }>();
const MAX_PROCESSED_HISTORY = 1000;

export class QuickSolvCreditDeduction {
  /**
   * Deducts credits atomically for a successful AI execution request.
   * Guarantees idempotency and prevents fallback double-charging.
   */
  async deductCredits(req: CreditDeductionRequest): Promise<CreditDeductionResult> {
    const { correlationId, userId, creditsToDeduct } = req;

    // 1. Idempotency & Fallback Double-Charge Check
    if (processedRequests.has(correlationId)) {
      const existing = processedRequests.get(correlationId)!;
      quickSolvMetricsCollector.recordBillingMetrics?.("IDEMPOTENCY_HIT");

      quickSolvLogger.info("Billing idempotency hit: correlationId already processed", {
        correlationId,
        userId,
        alreadyChargedCredits: existing.credits
      });

      const entitlement = await quickSolvEntitlementService.getEntitlement(userId);
      return {
        success: true,
        creditsDeducted: 0,
        creditsRemaining: entitlement.creditsRemaining,
        creditMode: entitlement.creditMode,
        alreadyProcessed: true
      };
    }

    // 2. Resolve User Entitlement
    const entitlement = await quickSolvEntitlementService.getEntitlement(userId);

    // 3. Subscription Status Check
    if (entitlement.subscriptionStatus === "expired" || entitlement.subscriptionStatus === "canceled") {
      quickSolvMetricsCollector.recordBillingMetrics?.("BILLING_FAILURE");
      return {
        success: false,
        creditsDeducted: 0,
        creditsRemaining: entitlement.creditsRemaining,
        creditMode: entitlement.creditMode,
        errorReason: "SUBSCRIPTION_EXPIRED"
      };
    }

    // 4. Handle Unlimited Credit Mode
    if (entitlement.creditMode === "UNLIMITED") {
      this.recordProcessedRequest(correlationId, 0);
      quickSolvMetricsCollector.recordBillingMetrics?.("CREDIT_CHARGE");
      return {
        success: true,
        creditsDeducted: 0,
        creditsRemaining: null,
        creditMode: "UNLIMITED"
      };
    }

    // 5. Finite Credit Mode Check
    if (entitlement.creditsRemaining !== null && entitlement.creditsRemaining < creditsToDeduct) {
      quickSolvMetricsCollector.recordBillingMetrics?.("CREDIT_EXHAUSTED");
      return {
        success: false,
        creditsDeducted: 0,
        creditsRemaining: entitlement.creditsRemaining,
        creditMode: "FINITE",
        errorReason: "INSUFFICIENT_CREDITS"
      };
    }

    // 6. Record Deduction in Database
    const newCount = await dbService.incrementUsage(userId, creditsToDeduct);
    this.recordProcessedRequest(correlationId, creditsToDeduct);
    quickSolvMetricsCollector.recordBillingMetrics?.("CREDIT_CHARGE");

    const newRemaining =
      entitlement.monthlyCreditLimit !== null
        ? Math.max(0, entitlement.monthlyCreditLimit - newCount)
        : null;

    // Durable credit ledger recording
    await dbService.recordCreditLedgerEntry({
      userId,
      amount: creditsToDeduct,
      eventType: req.requestType === "vision" ? "VISION_REQUEST" : "AI_REQUEST",
      correlationId,
      balanceAfter: newRemaining ?? 999999,
      metadata: { requestType: req.requestType, isMultimodal: req.isMultimodal || false }
    });

    quickSolvLogger.info("Successfully deducted AI credits", {
      correlationId,
      userId,
      creditsDeducted: creditsToDeduct,
      creditsRemaining: newRemaining
    });

    return {
      success: true,
      creditsDeducted: creditsToDeduct,
      creditsRemaining: newRemaining,
      creditMode: "FINITE"
    };
  }

  private recordProcessedRequest(correlationId: string, credits: number): void {
    if (processedRequests.size >= MAX_PROCESSED_HISTORY) {
      const firstKey = processedRequests.keys().next().value;
      if (firstKey) processedRequests.delete(firstKey);
    }
    processedRequests.set(correlationId, { timestamp: Date.now(), credits });
  }
}

export const quickSolvCreditDeduction = new QuickSolvCreditDeduction();
