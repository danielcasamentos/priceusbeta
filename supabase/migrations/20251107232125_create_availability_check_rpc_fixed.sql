/*
  # Função RPC Otimizada para Verificação de Disponibilidade
  
  Cria função RPC para verificar disponibilidade de datas com validação completa.
*/

-- Criar função RPC para verificação de disponibilidade
CREATE OR REPLACE FUNCTION check_date_availability(
  p_user_id uuid,
  p_data_evento date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config record;
  v_eventos_count integer;
  v_bloqueada boolean;
  v_result jsonb;
BEGIN
  -- Buscar configuração da agenda
  SELECT eventos_max_por_dia, modo_aviso, agenda_ativa
  INTO v_config
  FROM configuracao_agenda
  WHERE user_id = p_user_id;

  -- Se não tem configuração ou agenda inativa, retornar disponível
  IF v_config IS NULL OR NOT v_config.agenda_ativa THEN
    RETURN jsonb_build_object(
      'disponivel', true,
      'status', 'inativa',
      'eventos_atual', 0,
      'eventos_max', 999,
      'modo_aviso', 'informativo',
      'bloqueada', false,
      'mensagem', 'Sistema de agenda não está ativo',
      'agenda_ativa', false
    );
  END IF;

  -- Verificar se a data está bloqueada
  SELECT EXISTS(
    SELECT 1 FROM datas_bloqueadas
    WHERE user_id = p_user_id AND data_bloqueada = p_data_evento
  ) INTO v_bloqueada;

  IF v_bloqueada THEN
    RETURN jsonb_build_object(
      'disponivel', false,
      'status', 'bloqueada',
      'eventos_atual', 0,
      'eventos_max', v_config.eventos_max_por_dia,
      'modo_aviso', v_config.modo_aviso,
      'bloqueada', true,
      'mensagem', 'Esta data está bloqueada e não está disponível.',
      'agenda_ativa', true
    );
  END IF;

  -- Contar eventos confirmados e pendentes nesta data
  SELECT COUNT(*)
  INTO v_eventos_count
  FROM eventos_agenda
  WHERE user_id = p_user_id
    AND data_evento = p_data_evento
    AND status IN ('confirmado', 'pendente');

  -- Determinar status com base no número de eventos
  IF v_eventos_count = 0 THEN
    v_result := jsonb_build_object(
      'disponivel', true,
      'status', 'disponivel',
      'eventos_atual', v_eventos_count,
      'eventos_max', v_config.eventos_max_por_dia,
      'modo_aviso', v_config.modo_aviso,
      'bloqueada', false,
      'mensagem', 'Data disponível!',
      'agenda_ativa', true
    );
  ELSIF v_eventos_count < v_config.eventos_max_por_dia THEN
    v_result := jsonb_build_object(
      'disponivel', true,
      'status', 'parcial',
      'eventos_atual', v_eventos_count,
      'eventos_max', v_config.eventos_max_por_dia,
      'modo_aviso', v_config.modo_aviso,
      'bloqueada', false,
      'mensagem', format('Disponibilidade limitada: %s de %s vagas preenchidas',
                        v_eventos_count, v_config.eventos_max_por_dia),
      'agenda_ativa', true
    );
  ELSE
    v_result := jsonb_build_object(
      'disponivel', false,
      'status', 'ocupada',
      'eventos_atual', v_eventos_count,
      'eventos_max', v_config.eventos_max_por_dia,
      'modo_aviso', v_config.modo_aviso,
      'bloqueada', false,
      'mensagem', 'Já temos um evento para esta data.',
      'agenda_ativa', true
    );
  END IF;

  RETURN v_result;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION check_date_availability(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION limpar_todos_eventos(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION rollback_importacao(uuid, uuid) TO authenticated;

-- Criar índices compostos para performance
CREATE INDEX IF NOT EXISTS idx_eventos_agenda_user_data_status
  ON eventos_agenda(user_id, data_evento, status);

CREATE INDEX IF NOT EXISTS idx_eventos_agenda_status_data
  ON eventos_agenda(status, data_evento)
  WHERE status IN ('confirmado', 'pendente');
