import { CustomerTier, PlanConfig } from "./types";

export const PLAN_CONFIGURATIONS: Record<CustomerTier, PlanConfig> = {
  free: {
    tier: "free",
    name: "Free Plan",
    creditMode: "FINITE",
    monthlyCredits: 150,
    pricing: {
      monthly: 0,
      yearly: 0,
      yearlyEffectiveMonthly: 0
    },
    features: [
      "150 monthly AI credits",
      "Standard Chat & Solve access",
      "Basic study explainers",
      "Fair-use rate limits"
    ]
  },
  plus: {
    tier: "plus",
    name: "QuickSolv Plus",
    creditMode: "FINITE",
    monthlyCredits: 600,
    pricing: {
      monthly: 9.99,
      yearly: 99.99,
      yearlyEffectiveMonthly: 8.33
    },
    features: [
      "600 monthly AI credits",
      "Priority response speed",
      "Multimodal Vision solver (2 credits/solve)",
      "Patent & research workflows"
    ]
  },
  pro: {
    tier: "pro",
    name: "QuickSolv Pro",
    creditMode: "UNLIMITED",
    monthlyCredits: null,
    pricing: {
      monthly: 29.99,
      yearly: 299.99,
      yearlyEffectiveMonthly: 24.99
    },
    features: [
      "Unlimited AI chat & problem solving",
      "High-throughput fair-use quota",
      "All task workflows & vision capabilities",
      "Developer platform playground access"
    ]
  }
};

/**
 * Resolves plan configuration by tier slug. Defaults to 'free' if tier is unrecognized.
 */
export function getPlanConfig(tier?: string): PlanConfig {
  const cleanTier = (tier || "free").toLowerCase() as CustomerTier;
  return PLAN_CONFIGURATIONS[cleanTier] || PLAN_CONFIGURATIONS.free;
}
