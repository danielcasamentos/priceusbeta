-- Tabela de Add-ons modulares para contas Free no Marketplace e assinantes
CREATE TABLE IF NOT EXISTS public.user_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addon_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
  stripe_session_id TEXT,
  stripe_subscription_id TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, addon_key)
);

CREATE INDEX IF NOT EXISTS idx_user_addons_user_status
  ON public.user_addons (user_id, status);

ALTER TABLE public.user_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own addons" ON public.user_addons;
CREATE POLICY "Users can view their own addons"
  ON public.user_addons
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

