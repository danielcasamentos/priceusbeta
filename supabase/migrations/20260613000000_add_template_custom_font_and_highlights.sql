-- Migration: 20260613000000_add_template_custom_font_and_highlights.sql
-- 1. Adds custom font column to templates table
-- 2. Adds product highlight configurations to products table

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS fonte_personalizada TEXT DEFAULT 'Inter';

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS destacar_produto BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS destaque_texto TEXT DEFAULT NULL;

COMMENT ON COLUMN public.templates.fonte_personalizada IS 'Define a fonte de texto personalizada escolhida pelo usuário para a sua página de orçamento.';
COMMENT ON COLUMN public.produtos.destacar_produto IS 'Indica se este produto deve receber destaque visual no orçamento.';
COMMENT ON COLUMN public.produtos.destaque_texto IS 'Texto de destaque para o produto (ex: Mais Vendido, Mais Popular, Recomendado).';
