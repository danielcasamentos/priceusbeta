-- =============================================================================
-- Migration: 20260611000001_fix_leads_insert_rls.sql
-- Etapa 1 – Bug 2: Corrige política RLS que bloqueava todos os INSERTs na
--            tabela leads para usuários autenticados.
-- Testado em: Docker local antes de aplicar em produção.
-- =============================================================================

-- 1. Remove a política restritiva que bloqueia TODOS os inserts autenticados
DROP POLICY IF EXISTS "Nenhuma insercao direta permitida" ON public.leads;

-- 2. Garante que existe a política permissiva para fotógrafos inserirem seus próprios leads
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

-- Verificação (rodar após aplicar para confirmar):
-- SELECT policyname, cmd, roles, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'leads'
-- ORDER BY policyname;
