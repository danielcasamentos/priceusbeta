-- Adiciona coluna de preferência de tema por usuário
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tema_preferido TEXT
  CHECK (tema_preferido IN ('light', 'dark'));

-- Índice não é necessário para coluna com 2 valores em tabela pequena
