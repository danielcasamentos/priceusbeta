-- Adiciona colunas para controle visual de expiração de brindes nos produtos
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS brindes_expira boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS brindes_expira_tipo text DEFAULT 'dias',
  ADD COLUMN IF NOT EXISTS brindes_expira_dias integer DEFAULT 7,
  ADD COLUMN IF NOT EXISTS brindes_expira_data timestamp with time zone DEFAULT NULL;
