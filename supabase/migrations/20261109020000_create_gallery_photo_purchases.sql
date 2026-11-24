-- Migration: Create gallery_photo_purchases table with Row Level Security (RLS) for Stripe extra photo sales
CREATE TABLE IF NOT EXISTS public.gallery_photo_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  photographer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  visitor_id uuid REFERENCES public.gallery_visitors(id) ON DELETE SET NULL,
  buyer_name text NOT NULL DEFAULT 'Cliente',
  buyer_email text,
  buyer_whatsapp text,
  photo_ids text[] DEFAULT '{}',
  photo_count integer NOT NULL DEFAULT 1,
  amount_total numeric(12,2) NOT NULL DEFAULT 0,
  platform_fee numeric(12,2) DEFAULT 0,
  photographer_share numeric(12,2) DEFAULT 0,
  stripe_session_id text UNIQUE,
  payment_intent_id text,
  payment_status text NOT NULL DEFAULT 'paid',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gallery_photo_purchases_gallery_id
  ON public.gallery_photo_purchases(gallery_id);

CREATE INDEX IF NOT EXISTS idx_gallery_photo_purchases_photographer_id
  ON public.gallery_photo_purchases(photographer_id);

ALTER TABLE public.gallery_photo_purchases ENABLE ROW LEVEL SECURITY;

-- Policy: Photographers can view purchases for their own galleries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'gallery_photo_purchases'
      AND policyname = 'Fotografos visualizam compras de suas galerias'
  ) THEN
    CREATE POLICY "Fotografos visualizam compras de suas galerias"
      ON public.gallery_photo_purchases
      FOR SELECT
      TO authenticated
      USING (
        photographer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.galleries g
          WHERE g.id = gallery_photo_purchases.gallery_id
            AND g.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Policy: Photographers can manage purchases for their own galleries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'gallery_photo_purchases'
      AND policyname = 'Fotografos gerenciam compras de suas galerias'
  ) THEN
    CREATE POLICY "Fotografos gerenciam compras de suas galerias"
      ON public.gallery_photo_purchases
      FOR ALL
      TO authenticated
      USING (
        photographer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.galleries g
          WHERE g.id = gallery_photo_purchases.gallery_id
            AND g.user_id = auth.uid()
        )
      )
      WITH CHECK (
        photographer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.galleries g
          WHERE g.id = gallery_photo_purchases.gallery_id
            AND g.user_id = auth.uid()
        )
      );
  END IF;
END $$;

