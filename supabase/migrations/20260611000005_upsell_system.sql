-- =============================================================================
-- Migration: 20260611000005_upsell_system.sql
-- Etapa 5 – Feature 9: Sistema de Upselling Inteligente.
--
-- Adiciona suporte a upselling nos templates. O fotógrafo configura qual
-- template secundário serve como fonte dos produtos de upsell, pré-seleciona
-- quais produtos oferecer, e o sistema filtra automaticamente produtos que o
-- cliente já tem no pacote (por palavras-chave).
--
-- Colunas adicionadas na tabela templates:
--   upsell_ativo           → boolean – ativa/desativa o upsell para este template
--   upsell_template_id     → uuid FK → templates.id (template fonte dos produtos)
--   upsell_produtos_ids    → text[] – IDs pré-selecionados pelo fotógrafo
--   upsell_titulo          → text – título da seção de upsell no orçamento
--   upsell_subtitulo       → text – subtítulo da seção de upsell
--
-- Estrutura esperada do orcamento_detalhe após upsell (JSON):
-- {
--   "produtos": [...],
--   "upsell_produtos": [
--     { "id": "...", "nome": "...", "valor": 500, "desconto_percentual": 10, "imagem_url": "..." }
--   ],
--   "valor_base": 1500.00,
--   "valor_upsell": 450.00,
--   "valor_total": 1950.00
-- }
--
-- Testado em: Docker local antes de aplicar em produção.
-- =============================================================================

-- ── Colunas de configuração do upsell ────────────────────────────────────────

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS upsell_ativo BOOLEAN DEFAULT false;

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS upsell_template_id UUID
    REFERENCES public.templates(id) ON DELETE SET NULL;

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS upsell_produtos_ids TEXT[] DEFAULT '{}';

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS upsell_titulo TEXT
    DEFAULT 'Aproveite estas ofertas especiais! 🎁';

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS upsell_subtitulo TEXT
    DEFAULT 'Itens exclusivos para complementar seu pacote';

-- ── Índice de performance ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_templates_upsell_template_id
  ON public.templates(upsell_template_id)
  WHERE upsell_template_id IS NOT NULL;

-- ── Comentários de documentação ───────────────────────────────────────────────

COMMENT ON COLUMN public.templates.upsell_ativo IS
  'Quando true, exibe seção de upsell no orçamento público do cliente.';

COMMENT ON COLUMN public.templates.upsell_template_id IS
  'FK para o template cujos produtos serão oferecidos como upsell. O fotógrafo escolhe um template secundário (ex: "Promoções de Ensaio").';

COMMENT ON COLUMN public.templates.upsell_produtos_ids IS
  'Array de IDs de produtos do template secundário pré-selecionados pelo fotógrafo. O sistema filtra por palavras-chave antes de exibir ao cliente.';

COMMENT ON COLUMN public.templates.upsell_titulo IS
  'Título customizável da seção de upsell exibida no orçamento público.';

COMMENT ON COLUMN public.templates.upsell_subtitulo IS
  'Subtítulo customizável da seção de upsell exibida no orçamento público.';

-- ── Verificação (rodar após aplicar para confirmar) ───────────────────────────
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name   = 'templates'
--   AND column_name  LIKE 'upsell_%'
-- ORDER BY column_name;
