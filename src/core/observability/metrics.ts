import { MetricCounters } from "./types";

export class QuickSolvMetricsCollector {
  private counters: MetricCounters = {
    requestCount: 0,
    successCount: 0,
    failureCount: 0,
    timeoutCount: 0,
    rateLimitCount: 0,
    authFailureCount: 0,
    providerFailureCount: 0,
    qualityGateFailureCount: 0,
    toolFailureCount: 0,
    billingCheckCount: 0,
    creditChargeCount: 0,
    creditExhaustedCount: 0,
    subscriptionActiveCount: 0,
    billingFailureCount: 0,
    webhookFailureCount: 0,
    idempotencyHitCount: 0
  };

  private latenciesMs: number[] = [];
  private readonly MAX_LATENCY_SAMPLES = 100;

  recordRequest(): void {
    this.counters.requestCount++;
  }

  recordSuccess(): void {
    this.counters.successCount++;
  }

  recordFailure(category?: string): void {
    this.counters.failureCount++;

    if (category === "TIMEOUT") {
      this.counters.timeoutCount++;
    } else if (category === "RATE_LIMIT") {
      this.counters.rateLimitCount++;
    } else if (category === "AUTH_ERROR" || category === "PERMISSION_ERROR") {
      this.counters.authFailureCount++;
    } else if (category === "PROVIDER_ERROR") {
      this.counters.providerFailureCount++;
    } else if (category === "QUALITY_GATE_FAILURE" || category === "QUALITY_GATE_ERROR") {
      this.counters.qualityGateFailureCount++;
    } else if (category === "TOOL_ERROR") {
      this.counters.toolFailureCount++;
    } else if (category === "BILLING_ERROR") {
      this.counters.billingFailureCount++;
    }
  }

  recordBillingMetrics(type: "BILLING_CHECK" | "CREDIT_CHARGE" | "CREDIT_EXHAUSTED" | "SUBSCRIPTION_ACTIVE" | "BILLING_FAILURE" | "WEBHOOK_FAILURE" | "IDEMPOTENCY_HIT"): void {
    switch (type) {
      case "BILLING_CHECK":
        this.counters.billingCheckCount++;
        break;
      case "CREDIT_CHARGE":
        this.counters.creditChargeCount++;
        break;
      case "CREDIT_EXHAUSTED":
        this.counters.creditExhaustedCount++;
        break;
      case "SUBSCRIPTION_ACTIVE":
        this.counters.subscriptionActiveCount++;
        break;
      case "BILLING_FAILURE":
        this.counters.billingFailureCount++;
        break;
      case "WEBHOOK_FAILURE":
        this.counters.webhookFailureCount++;
        break;
      case "IDEMPOTENCY_HIT":
        this.counters.idempotencyHitCount++;
        break;
    }
  }

  recordLatency(ms: number): void {
    if (typeof ms === "number" && !isNaN(ms) && ms >= 0) {
      this.latenciesMs.push(Math.round(ms));
      if (this.latenciesMs.length > this.MAX_LATENCY_SAMPLES) {
        this.latenciesMs.shift();
      }
    }
  }

  getSnapshot(): {
    counters: MetricCounters;
    avgLatencyMs: number;
  } {
    const totalLatency = this.latenciesMs.reduce((sum, v) => sum + v, 0);
    const avgLatencyMs = this.latenciesMs.length > 0 ? Math.round(totalLatency / this.latenciesMs.length) : 0;

    return {
      counters: { ...this.counters },
      avgLatencyMs
    };
  }
}

export const quickSolvMetricsCollector = new QuickSolvMetricsCollector();
