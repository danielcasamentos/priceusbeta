-- =============================================================================
-- Migration: 20260703000001_fix_leads_insert_block_policy.sql
-- Remove a política "Bloquear inserções diretas de leads" que impede
-- qualquer INSERT autenticado na tabela leads, incluindo a importação
-- manual de leads via código compartilhado entre parceiros PriceUs.
-- =============================================================================

-- Remove a política restritiva que tem WITH CHECK = false (bloqueia tudo)
DROP POLICY IF EXISTS "Bloquear inserções diretas de leads" ON public.leads;

-- Garante que a política permissiva para usuários autenticados existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'leads'
      AND policyname = 'Fotografos podem inserir seus proprios leads'
  ) THEN
    CREATE POLICY "Fotografos podem inserir seus proprios leads"
      ON public.leads
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
