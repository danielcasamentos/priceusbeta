-- ============================================================
-- Migration: Marketplace Ads System (PriceU$)
-- Created: 2026-11-16
-- ============================================================

-- ============================================================
-- 1. TABELA: marketplace_ads
-- ============================================================
CREATE TABLE IF NOT EXISTS marketplace_ads (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Campanha
  name                 TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','active','paused','ended','pending_payment')),
  tier                 TEXT NOT NULL DEFAULT 'basic'
                         CHECK (tier IN ('basic','pro','premium')),
  -- basic:   top 10 com badge  → R$97/mês
  -- pro:     top 5 garantido   → R$197/mês
  -- premium: top 1 + banner    → R$397/mês
  budget_total         NUMERIC(10,2) DEFAULT 0,
  start_date           DATE,
  end_date             DATE,

  -- Segmentação de público
  target_cities        TEXT[]       DEFAULT '{}',
  target_categories    TEXT[]       DEFAULT '{}',
  target_event_types   TEXT[]       DEFAULT '{}',
  target_budget_min    NUMERIC(10,2),
  target_budget_max    NUMERIC(10,2),

  -- Stripe
  stripe_session_id      TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id        TEXT,

  -- Métricas acumuladas (denormalizadas para performance)
  total_impressions    INT DEFAULT 0,
  total_clicks         INT DEFAULT 0,
  total_leads          INT DEFAULT 0,

  -- Timestamps
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Um tier por usuário ativo por vez
  UNIQUE (user_id, tier)
);

-- Trigger: mantém updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_marketplace_ads_updated_at
  BEFORE UPDATE ON marketplace_ads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 2. TABELA: marketplace_ad_daily_metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS marketplace_ad_daily_metrics (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id                UUID NOT NULL REFERENCES marketplace_ads(id) ON DELETE CASCADE,
  metric_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  impressions          INT DEFAULT 0,
  clicks               INT DEFAULT 0,
  leads_generated      INT DEFAULT 0,
  contracts_generated  INT DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (ad_id, metric_date)
);

-- ============================================================
-- 3. ALTER TABLE: marketplace_vendor_tags — colunas de destaque
-- ============================================================
ALTER TABLE marketplace_vendor_tags
  ADD COLUMN IF NOT EXISTS is_featured    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_tier  TEXT CHECK (featured_tier IN ('basic','pro','premium')),
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS boost_score    INT DEFAULT 0; -- recalculado diariamente

-- ============================================================
-- 4. ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_marketplace_ads_user_status
  ON marketplace_ads (user_id, status);

CREATE INDEX IF NOT EXISTS idx_marketplace_ads_status_end
  ON marketplace_ads (status, end_date);

CREATE INDEX IF NOT EXISTS idx_ad_metrics_ad_date
  ON marketplace_ad_daily_metrics (ad_id, metric_date);

CREATE INDEX IF NOT EXISTS idx_vendor_tags_featured
  ON marketplace_vendor_tags (is_featured, featured_tier);

-- ============================================================
-- 5. FUNÇÃO: calculate_vendor_boost_score
-- Retorna o boost_score do vendor com base no ad ativo.
-- premium=100 | pro=60 | basic=30 | sem ads=0
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_vendor_boost_score(vendor_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_tier TEXT;
BEGIN
  SELECT tier
  INTO   v_tier
  FROM   marketplace_ads
  WHERE  user_id  = vendor_user_id
    AND  status   = 'active'
    AND  end_date >= CURRENT_DATE
  ORDER BY
    CASE tier
      WHEN 'premium' THEN 1
      WHEN 'pro'     THEN 2
      WHEN 'basic'   THEN 3
    END
  LIMIT 1;

  RETURN CASE v_tier
    WHEN 'premium' THEN 100
    WHEN 'pro'     THEN 60
    WHEN 'basic'   THEN 30
    ELSE 0
  END;
END;
$$;

-- ============================================================
-- 6. FUNÇÃO: update_vendor_featured_status
-- Atualiza is_featured, featured_tier, featured_until e
-- boost_score para todos os vendors. Chame via cron job.
-- ============================================================
CREATE OR REPLACE FUNCTION update_vendor_featured_status()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE marketplace_vendor_tags mvt
  SET
    boost_score    = calculate_vendor_boost_score(mvt.user_id),
    is_featured    = EXISTS (
                       SELECT 1 FROM marketplace_ads
                       WHERE  user_id  = mvt.user_id
                         AND  status   = 'active'
                         AND  end_date >= CURRENT_DATE
                     ),
    featured_tier  = (
                       SELECT tier FROM marketplace_ads
                       WHERE  user_id  = mvt.user_id
                         AND  status   = 'active'
                         AND  end_date >= CURRENT_DATE
                       ORDER BY
                         CASE tier
                           WHEN 'premium' THEN 1
                           WHEN 'pro'     THEN 2
                           WHEN 'basic'   THEN 3
                         END
                       LIMIT 1
                     ),
    featured_until = (
                       SELECT end_date::TIMESTAMPTZ FROM marketplace_ads
                       WHERE  user_id  = mvt.user_id
                         AND  status   = 'active'
                         AND  end_date >= CURRENT_DATE
                       ORDER BY
                         CASE tier
                           WHEN 'premium' THEN 1
                           WHEN 'pro'     THEN 2
                           WHEN 'basic'   THEN 3
                         END
                       LIMIT 1
                     );
END;
$$;

-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- marketplace_ads -----------------------------------------
ALTER TABLE marketplace_ads ENABLE ROW LEVEL SECURITY;

-- Dono vê e gerencia apenas os seus
CREATE POLICY "ads_select_own"
  ON marketplace_ads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ads_insert_own"
  ON marketplace_ads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ads_update_own"
  ON marketplace_ads FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ads_delete_own"
  ON marketplace_ads FOR DELETE
  USING (auth.uid() = user_id);

-- marketplace_ad_daily_metrics ---------------------------
ALTER TABLE marketplace_ad_daily_metrics ENABLE ROW LEVEL SECURITY;

-- Dono das métricas acessa via JOIN com marketplace_ads
CREATE POLICY "metrics_select_own"
  ON marketplace_ad_daily_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_ads
      WHERE id      = marketplace_ad_daily_metrics.ad_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "metrics_insert_own"
  ON marketplace_ad_daily_metrics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM marketplace_ads
      WHERE id      = marketplace_ad_daily_metrics.ad_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "metrics_update_own"
  ON marketplace_ad_daily_metrics FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_ads
      WHERE id      = marketplace_ad_daily_metrics.ad_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "metrics_delete_own"
  ON marketplace_ad_daily_metrics FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_ads
      WHERE id      = marketplace_ad_daily_metrics.ad_id
        AND user_id = auth.uid()
    )
  );

-- marketplace_vendor_tags — novas colunas ----------------
-- Leitura pública já garantida pela política existente da tabela.
-- Escrita (UPDATE) nas colunas de destaque: apenas o próprio owner.
-- A tabela já deve ter RLS habilitado; apenas adicionamos a política
-- de UPDATE restritiva caso ainda não exista.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename  = 'marketplace_vendor_tags'
      AND policyname = 'vendor_tags_update_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "vendor_tags_update_own"
        ON marketplace_vendor_tags FOR UPDATE
        USING     (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id)
    $policy$;
  END IF;
END;
$$;
