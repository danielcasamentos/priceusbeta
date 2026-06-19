-- =============================================================================
-- Migration: 20260615000001_add_pdf_elegante_2_theme.sql
-- Adiciona o tema 'pdf-elegante-2' ao CHECK constraint da tabela `templates`.
--
-- Este tema é uma variação do 'pdf-elegante' sem a barra preta superior,
-- com imagem de capa full-bleed e texto "PROPOSTA" sobreposto com contraste
-- automático (texto branco sobre gradiente escuro).
-- =============================================================================

ALTER TABLE public.templates
  DROP CONSTRAINT IF EXISTS templates_tema_check;

ALTER TABLE public.templates
  ADD CONSTRAINT templates_tema_check
  CHECK (tema IN (
    -- ── Temas clássicos ──────────────────────────────────────────────────────
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
    'pdf-elegante-2',    -- ← NOVO: variação sem barra preta, capa full-bleed

    -- ── Temas sazonais – Datas comemorativas ────────────────────────────────
    'ano-novo',
    'ferias',
    'carnaval',
    'valentines-day',
    'mes-da-mulher',
    'mes-do-consumidor',
    'pascoa',
    'dia-das-maes',
    'mes-das-noivas',
    'dia-dos-namorados',
    'sao-joao',
    'orgulho-lgbt',
    'dia-do-amigo',
    'dia-dos-avos',
    'dia-dos-pais',
    'dia-do-irmao',
    'dia-do-cliente',
    'dia-das-criancas',
    'halloween',
    'black-friday',
    'natal',
    'revellon',

    -- ── Temas sazonais – Estações ────────────────────────────────────────────
    'oferta-primavera',
    'oferta-verao',
    'oferta-outono',
    'oferta-inverno'
  ));

-- Verificação (rodar após aplicar para confirmar):
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.templates'::regclass AND conname = 'templates_tema_check';
