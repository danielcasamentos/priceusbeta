-- Adiciona suporte a quantidades de brindes por produto
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS brindes_quantidades jsonb DEFAULT '{}'::jsonb;
