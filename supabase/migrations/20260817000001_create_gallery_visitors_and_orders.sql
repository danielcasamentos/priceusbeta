-- Migration: Create gallery_visitors and gallery_orders tables
-- These tables track client access stats and proofing orders for each gallery.

-- ============================================================
-- 1. gallery_visitors
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gallery_visitors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gallery_id      UUID NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
    lead_id         UUID,                          -- vinculado ao lead do CRM se houver
    name            TEXT NOT NULL,
    email           TEXT,
    whatsapp        TEXT,
    accessed_at     TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    downloads_count INTEGER DEFAULT 0
);

ALTER TABLE public.gallery_visitors ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante (anônimo) pode registrar e atualizar seus dados
DROP POLICY IF EXISTS "Visitantes podem registrar seus dados"     ON public.gallery_visitors;
DROP POLICY IF EXISTS "Permitir leitura publica de visitantes"    ON public.gallery_visitors;
DROP POLICY IF EXISTS "Fotógrafos veem visitantes das suas galerias" ON public.gallery_visitors;
DROP POLICY IF EXISTS "Visitantes podem atualizar dados de acesso" ON public.gallery_visitors;

CREATE POLICY "Visitantes podem registrar seus dados" ON public.gallery_visitors
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir leitura publica de visitantes" ON public.gallery_visitors
    FOR SELECT USING (true);

CREATE POLICY "Visitantes podem atualizar dados de acesso" ON public.gallery_visitors
    FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_gallery_visitors_gallery_id ON public.gallery_visitors(gallery_id);
CREATE INDEX IF NOT EXISTS idx_gallery_visitors_email      ON public.gallery_visitors(email);

-- ============================================================
-- 2. gallery_orders
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gallery_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gallery_id      UUID NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
    visitor_id      UUID REFERENCES public.gallery_visitors(id) ON DELETE SET NULL,
    buyer_name      TEXT NOT NULL,
    buyer_email     TEXT,
    buyer_whatsapp  TEXT,
    photo_count     INTEGER NOT NULL DEFAULT 0,
    total_price     NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_status  TEXT DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
    payment_method  TEXT DEFAULT 'pix',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gallery_orders ENABLE ROW LEVEL SECURITY;

-- Fotógrafo dono da galeria pode ver seus pedidos
DROP POLICY IF EXISTS "Fotógrafos veem pedidos das suas galerias" ON public.gallery_orders;
CREATE POLICY "Fotógrafos veem pedidos das suas galerias" ON public.gallery_orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.galleries g
            WHERE g.id = gallery_orders.gallery_id
              AND g.user_id = auth.uid()
        )
    );

-- Visitantes (anônimos) podem registrar pedidos
DROP POLICY IF EXISTS "Visitantes podem registrar pedidos" ON public.gallery_orders;
CREATE POLICY "Visitantes podem registrar pedidos" ON public.gallery_orders
    FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_gallery_orders_gallery_id ON public.gallery_orders(gallery_id);
CREATE INDEX IF NOT EXISTS idx_gallery_orders_visitor_id ON public.gallery_orders(visitor_id);
