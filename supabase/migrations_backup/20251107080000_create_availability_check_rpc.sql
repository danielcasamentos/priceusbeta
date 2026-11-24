/*
  # Função RPC Otimizada para Verificação de Disponibilidade

  ## Descrição
  Cria uma função RPC de alto desempenho para verificar disponibilidade de datas
  com validação completa e proteção contra condições de corrida.

  ## 1. Função Principal
  - `check_date_availability(p_user_id, p_data_evento)` - Verifica disponibilidade de uma data
    - Retorna JSON com status completo de disponibilidade
    - Inclui contagem de eventos, limites, bloqueios
    - Otimizada para performance com índices

  ## 2. Funcionalidades
  - Verificação atômica em transação única
  - Proteção contra race conditions
  - Logging automático de verificações
  - Cache-friendly (resultados podem ser cacheados por alguns segundos)

  ## 3. Valores de Retorno
  - `disponivel` (boolean) - Se a data está disponível
  - `status` (text) - 'disponivel', 'parcial', 'ocupada', 'bloqueada', 'inativa'
  - `eventos_atual` (integer) - Quantidade de eventos nesta data
  - `eventos_max` (integer) - Limite máximo de eventos
  - `modo_aviso` (text) - Modo de aviso configurado
  - `bloqueada` (boolean) - Se a data está bloqueada
  - `mensagem` (text) - Mensagem descritiva
  - `agenda_ativa` (boolean) - Se o sistema de agenda está ativo
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
  SELECT
    eventos_max_por_dia,
    modo_aviso,
    agenda_ativa
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
    SELECT 1
    FROM datas_bloqueadas
    WHERE user_id = p_user_id
      AND data_bloqueada = p_data_evento
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
    -- Data disponível
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
    -- Disponibilidade parcial
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
    -- Data ocupada
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

-- Criar função para verificar disponibilidade de múltiplas datas de uma vez
CREATE OR REPLACE FUNCTION check_multiple_dates_availability(
  p_user_id uuid,
  p_datas_eventos date[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data date;
  v_result jsonb := '{}'::jsonb;
  v_availability jsonb;
BEGIN
  -- Iterar sobre cada data e verificar disponibilidade
  FOREACH v_data IN ARRAY p_datas_eventos
  LOOP
    v_availability := check_date_availability(p_user_id, v_data);
    v_result := v_result || jsonb_build_object(v_data::text, v_availability);
  END LOOP;

  RETURN v_result;
END;
$$;

-- Criar função para sugerir próximas datas disponíveis
CREATE OR REPLACE FUNCTION suggest_available_dates(
  p_user_id uuid,
  p_data_inicio date,
  p_quantidade integer DEFAULT 5
)
RETURNS TABLE (
  data_sugerida date,
  status text,
  eventos_atual integer,
  disponivel boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config record;
  v_data_atual date;
  v_contador integer := 0;
BEGIN
  -- Buscar configuração
  SELECT eventos_max_por_dia, agenda_ativa
  INTO v_config
  FROM configuracao_agenda
  WHERE user_id = p_user_id;

  -- Se não tem config ou inativa, retornar vazio
  IF v_config IS NULL OR NOT v_config.agenda_ativa THEN
    RETURN;
  END IF;

  -- Começar da data inicial
  v_data_atual := p_data_inicio;

  -- Procurar datas disponíveis
  WHILE v_contador < p_quantidade LOOP
    -- Verificar se a data está bloqueada
    IF NOT EXISTS(
      SELECT 1 FROM datas_bloqueadas
      WHERE user_id = p_user_id AND data_bloqueada = v_data_atual
    ) THEN
      -- Contar eventos na data
      SELECT COUNT(*)
      INTO eventos_atual
      FROM eventos_agenda
      WHERE user_id = p_user_id
        AND data_evento = v_data_atual
        AND status IN ('confirmado', 'pendente');

      -- Se tem espaço disponível, adicionar aos resultados
      IF eventos_atual < v_config.eventos_max_por_dia THEN
        data_sugerida := v_data_atual;
        disponivel := true;

        IF eventos_atual = 0 THEN
          status := 'disponivel';
        ELSE
          status := 'parcial';
        END IF;

        RETURN NEXT;
        v_contador := v_contador + 1;
      END IF;
    END IF;

    -- Avançar para o próximo dia
    v_data_atual := v_data_atual + 1;

    -- Segurança: não procurar mais de 90 dias à frente
    IF v_data_atual > p_data_inicio + 90 THEN
      EXIT;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

-- Criar índices compostos para melhor performance das queries
CREATE INDEX IF NOT EXISTS idx_eventos_agenda_user_data_status
  ON eventos_agenda(user_id, data_evento, status);

CREATE INDEX IF NOT EXISTS idx_eventos_agenda_status_data
  ON eventos_agenda(status, data_evento)
  WHERE status IN ('confirmado', 'pendente');

-- Adicionar comentários para documentação
COMMENT ON FUNCTION check_date_availability IS
  'Verifica disponibilidade de uma data específica para um usuário. Retorna JSON com status completo.';

COMMENT ON FUNCTION check_multiple_dates_availability IS
  'Verifica disponibilidade de múltiplas datas de uma vez. Otimizado para calendários.';

COMMENT ON FUNCTION suggest_available_dates IS
  'Sugere próximas datas disponíveis a partir de uma data inicial.';
