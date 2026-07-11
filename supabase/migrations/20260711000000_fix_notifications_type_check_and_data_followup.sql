-- Adiciona a coluna data_followup na tabela de leads para evitar erro 400 no filtro de Meu Dia
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data_followup DATE DEFAULT null;

-- Remove a restrição do tipo de notificação para permitir a notificação única de resumo do Meu Dia
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
