-- ============================================================
-- View: dias_ocupados_publicos
-- Propósito: Expõe APENAS user_id e data_evento para usuários
--            anônimos (clientes na página pública de agendamento).
--
-- PRIVACIDADE: Clientes nunca veem nome dos outros clientes,
-- tipo de evento, observações ou qualquer outro dado sensível.
-- A tabela original (eventos_agenda) permanece acessível
-- apenas para usuários autenticados.
-- ============================================================

CREATE OR REPLACE VIEW public.dias_ocupados_publicos AS
  SELECT user_id, data_evento
  FROM public.eventos_agenda
  WHERE status != 'cancelado';

-- Permite que usuários anônimos (clientes no link público) leiam a view
GRANT SELECT ON public.dias_ocupados_publicos TO anon;
