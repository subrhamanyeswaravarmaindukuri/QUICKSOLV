-- Migration: Create Production Billing, Subscription & Credit Ledger Tables

-- 1. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'plus', 'pro')),
  billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly')),
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired', 'incomplete')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  provider_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for Subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_id ON public.subscriptions (provider_subscription_id);

-- Enable RLS for Subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- 2. Billing Transactions Table
CREATE TABLE IF NOT EXISTS public.billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  plan TEXT NOT NULL,
  billing_interval TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  provider TEXT NOT NULL,
  provider_tx_id TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for Billing Transactions
CREATE INDEX IF NOT EXISTS idx_billing_tx_user ON public.billing_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_billing_tx_provider_tx ON public.billing_transactions (provider_tx_id);

-- Enable RLS for Billing Transactions
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own billing transactions" ON public.billing_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- 3. Credit Ledger Table
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('SUBSCRIPTION_GRANT', 'MONTHLY_RESET', 'AI_REQUEST', 'VISION_REQUEST', 'REFUND', 'ADMIN_ADJUSTMENT')),
  correlation_id TEXT UNIQUE,
  balance_after INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for Credit Ledger
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON public.credit_ledger (user_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_correlation ON public.credit_ledger (correlation_id);

-- Enable RLS for Credit Ledger
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit ledger" ON public.credit_ledger
  FOR SELECT USING (auth.uid() = user_id);
