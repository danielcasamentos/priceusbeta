-- =============================================================================
-- Migration: 20260611000004_profile_portfolio.sql
-- Etapa 4 – Features 10 e 11: Adiciona colunas de portfólio na tabela profiles.
--
--   portfolio_link  → URL externa (Behance, site pessoal, etc.)
--   portfolio_fotos → Array de até 3 URLs de imagens hospedadas no Storage
--
-- As fotos aparecerão no cabeçalho dos orçamentos públicos (/username/slug).
-- O perfil público (/username) NÃO exibirá as fotos de portfólio.
--
-- Testado em: Docker local antes de aplicar em produção.
-- =============================================================================

-- Adiciona a coluna de link externo
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS portfolio_link TEXT;

-- Adiciona o array de até 3 fotos de portfólio (URLs)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS portfolio_fotos TEXT[] DEFAULT '{}';

-- Comentários de documentação
COMMENT ON COLUMN public.profiles.portfolio_link IS
  'URL do portfólio externo do fotógrafo (Behance, site, etc.). Aparece no cabeçalho dos orçamentos.';

COMMENT ON COLUMN public.profiles.portfolio_fotos IS
  'Array de até 3 URLs de fotos de portfólio. Armazenadas no Storage bucket "images" em portfolio/{user_id}/. Aparecem no cabeçalho dos orçamentos.';

-- Verificação (rodar após aplicar para confirmar):
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name   = 'profiles'
--   AND column_name  IN ('portfolio_link', 'portfolio_fotos');
