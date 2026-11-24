-- =============================================================================
-- Migration: 20260611000003_add_seasonal_themes.sql
-- Etapa 3 – Feature 5: Expande o CHECK constraint da coluna `tema` na tabela
--            `templates` para suportar 26 novos temas sazonais/temáticos.
--
-- IMPORTANTE: Este script REMOVE e RECRIA o constraint completo para incluir
-- todos os valores antigos + os novos. Sempre verifique que os valores antigos
-- estão todos listados antes de aplicar.
--
-- Temas existentes antes desta migration:
--   'moderno','classico','romantico','vibrante','natural','minimalista',
--   'pretoebranco','escuro','studio','darkstudio','promocional','oferta','pdf-elegante'
--
-- Testado em: Docker local antes de aplicar em produção.
-- =============================================================================

ALTER TABLE public.templates
  DROP CONSTRAINT IF EXISTS templates_tema_check;

ALTER TABLE public.templates
  ADD CONSTRAINT templates_tema_check
  CHECK (tema IN (
    -- ── Temas clássicos (existentes) ────────────────────────────────────────
    'moderno',
    'classico',
    'romantico',
    'vibrante',
    'natural',
    'minimalista',
    'pretoebranco',
    'escuro',
    'studio',
    'darkstudio',
    'promocional',
    'oferta',
    'pdf-elegante',

    -- ── Temas sazonais – Datas comemorativas ────────────────────────────────
    'ano-novo',           -- Réveillon / Ano Novo
    'ferias',             -- Férias escolares
    'carnaval',           -- Carnaval
    'valentines-day',     -- Dia dos Namorados Internacional (14/fev)
    'mes-da-mulher',      -- Março – Mês da Mulher
    'mes-do-consumidor',  -- Março – Mês do Consumidor
    'pascoa',             -- Páscoa
    'dia-das-maes',       -- Dia das Mães (2º domingo de maio)
    'mes-das-noivas',     -- Junho – Mês das Noivas
    'dia-dos-namorados',  -- 12 de Junho (Brasil)
    'sao-joao',           -- São João / Festa Junina
    'orgulho-lgbt',       -- 28 de Junho – Dia Internacional do Orgulho LGBT
    'dia-do-amigo',       -- 20 de Julho
    'dia-dos-avos',       -- 26 de Julho
    'dia-dos-pais',       -- 2º domingo de Agosto
    'dia-do-irmao',       -- 6 de Outubro
    'dia-do-cliente',     -- 15 de Setembro
    'dia-das-criancas',   -- 12 de Outubro
    'halloween',          -- 31 de Outubro
    'black-friday',       -- Última sexta de Novembro
    'natal',              -- Natal (componente QuoteNatal já existe)
    'revellon',           -- Réveillon (componente QuoteRevellon já existe)

    -- ── Temas sazonais – Estações ────────────────────────────────────────────
    'oferta-primavera',   -- Setembro–Novembro
    'oferta-verao',       -- Dezembro–Fevereiro
    'oferta-outono',      -- Março–Maio
    'oferta-inverno'      -- Junho–Agosto
  ));

-- Verificação (rodar após aplicar para confirmar):
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.templates'::regclass AND conname = 'templates_tema_check';
