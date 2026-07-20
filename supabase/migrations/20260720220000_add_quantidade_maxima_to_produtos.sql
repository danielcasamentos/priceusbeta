-- Adiciona coluna quantidade_maxima na tabela produtos
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS quantidade_maxima integer DEFAULT NULL;
