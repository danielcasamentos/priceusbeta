-- Migration: 20260612000000_add_upsell_layout.sql
-- Adiciona coluna para o layout do upsell (grid, carousel ou list)

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS upsell_layout TEXT
    DEFAULT 'grid'
    CONSTRAINT chk_upsell_layout CHECK (upsell_layout IN ('grid', 'carousel', 'list'));

COMMENT ON COLUMN public.templates.upsell_layout IS
  'Define o layout de exibição da seção de upsell: grid (tabela compacta de cards 2 colunas), carousel (carrossel horizontal de cards pequenos), ou list (lista minimalista com checkbox).';
