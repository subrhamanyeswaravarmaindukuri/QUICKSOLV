export type CustomerTier = "free" | "plus" | "pro";

export type CreditMode = "FINITE" | "UNLIMITED";

export type BillingInterval = "monthly" | "yearly";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "expired"
  | "incomplete";

export interface PlanConfig {
  tier: CustomerTier;
  name: string;
  creditMode: CreditMode;
  monthlyCredits: number | null; // null for UNLIMITED
  pricing: {
    monthly: number; // in USD or target currency
    yearly: number;  // total yearly price
    yearlyEffectiveMonthly: number;
  };
  features: string[];
}

export interface UserEntitlement {
  userId: string;
  plan: CustomerTier;
  creditMode: CreditMode;
  monthlyCreditLimit: number | null;
  creditsUsed: number;
  creditsRemaining: number | null; // null for UNLIMITED
  billingInterval: BillingInterval;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  subscriptionStatus: SubscriptionStatus;
}

export interface CreditDeductionRequest {
  correlationId: string;
  userId: string;
  creditsToDeduct: number;
  requestType: "chat" | "solve" | "vision" | "tool";
  isMultimodal?: boolean;
}

export interface CreditDeductionResult {
  success: boolean;
  creditsDeducted: number;
  creditsRemaining: number | null;
  creditMode: CreditMode;
  alreadyProcessed?: boolean;
  errorReason?: "INSUFFICIENT_CREDITS" | "SUBSCRIPTION_EXPIRED" | "FAIR_USE_EXCEEDED" | "BILLING_ERROR";
}

export interface CheckoutSessionRequest {
  userId: string;
  targetTier: CustomerTier;
  interval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  checkoutUrl: string;
  provider: string;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  plan: CustomerTier;
  interval: BillingInterval;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface WebhookEventPayload {
  eventId: string;
  eventType: string;
  timestamp: string;
  data: Record<string, any>;
  signature: string;
}
