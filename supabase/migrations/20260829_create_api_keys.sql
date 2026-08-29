-- Migration: Create api_keys table and Row Level Security policies
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  rate_limit_rpm INTEGER DEFAULT 60,
  monthly_credit_limit INTEGER DEFAULT 1000,
  scopes TEXT[] DEFAULT ARRAY['solve:read', 'chat:write']
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys (key_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys (user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own API keys
CREATE POLICY "Users can view own api keys" ON public.api_keys
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own API keys
CREATE POLICY "Users can insert own api keys" ON public.api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update/revoke their own API keys
CREATE POLICY "Users can update own api keys" ON public.api_keys
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own API keys
CREATE POLICY "Users can delete own api keys" ON public.api_keys
  FOR DELETE USING (auth.uid() = user_id);
