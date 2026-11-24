-- =============================================================================
-- Migration: 20260611000002_review_token_public_select.sql
-- Etapa 2 – Bug 6 (Parte A): Cria política RLS que permite ao usuário anônimo
--            ler um lead pelo token de avaliação. Necessário para que a
--            ReviewPage.tsx funcione sem login.
-- Testado em: Docker local antes de aplicar em produção.
-- =============================================================================

-- Cria a política somente se ainda não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'leads'
      AND policyname = 'Leitura publica por token de avaliacao'
  ) THEN
    CREATE POLICY "Leitura publica por token de avaliacao"
      ON public.leads
      FOR SELECT
      TO anon
      USING (
        token_avaliacao IS NOT NULL
        AND pode_avaliar = true
      );
  END IF;
END $$;

-- Verificação (rodar após aplicar para confirmar):
-- SELECT policyname, cmd, roles, qual
-- FROM pg_policies
-- WHERE tablename = 'leads' AND 'anon' = ANY(roles)
-- ORDER BY policyname;
