-- =============================================
-- Migration: Photo Delivery Terms (Termo de Entrega de Fotos)
-- =============================================

CREATE TABLE IF NOT EXISTS public.photo_delivery_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id uuid NULL REFERENCES public.leads(id) ON DELETE SET NULL,
  gallery_id uuid NULL,
  token text NOT NULL UNIQUE,
  client_name text NOT NULL,
  client_cpf text,
  client_email text,
  delivery_items text NOT NULL,
  delivery_date date NOT NULL DEFAULT CURRENT_DATE,
  content_text text NOT NULL,
  observacoes text,
  signature_base64 text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed')),
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photo_delivery_terms_user ON public.photo_delivery_terms(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_delivery_terms_token ON public.photo_delivery_terms(token);

ALTER TABLE public.photo_delivery_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dono gerencia seus termos de entrega" ON public.photo_delivery_terms;
CREATE POLICY "Dono gerencia seus termos de entrega"
ON public.photo_delivery_terms FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Leitura pública do termo por token" ON public.photo_delivery_terms;
CREATE POLICY "Leitura pública do termo por token"
ON public.photo_delivery_terms FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Assinatura pública do termo pendente" ON public.photo_delivery_terms;
CREATE POLICY "Assinatura pública do termo pendente"
ON public.photo_delivery_terms FOR UPDATE
TO anon, authenticated
USING (status = 'pending')
WITH CHECK (status = 'signed');

