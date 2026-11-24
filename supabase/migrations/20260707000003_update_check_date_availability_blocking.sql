-- ==========================================================
-- Migration: Update check_date_availability to support blocking tasks
-- Date: 2026-07-07
-- ==========================================================

DROP FUNCTION IF EXISTS public.check_date_availability(uuid, date, integer);

CREATE OR REPLACE FUNCTION public.check_date_availability(
  p_user_id uuid,
  p_data_evento date,
  p_duracao_minutos integer DEFAULT 60
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_config record;
  v_eventos_count integer;
  v_bloqueada boolean;
  v_em_periodo boolean;
  v_eh_feriado boolean;
  v_dia_semana integer;      -- 0=Dom, 6=Sab
  v_dia_mes integer;         -- 1-31
  v_num_semana integer;
  v_diff_dias integer;
  v_eh_semana_par boolean;
  
  -- Para agendamento por hora
  v_slots_list jsonb;
  v_slot_text text;
  v_start_time time;
  v_end_time time;
  v_slot_disponivel boolean;
  v_slots_avail_count integer := 0;
  v_slots_total_count integer := 0;
  v_slot_result jsonb;
  v_slots_array jsonb := '[]'::jsonb;
  v_conflito_evento boolean;
  v_conflito_bloqueio boolean;
  v_dia_semana_key text;
  v_motivo text;
BEGIN

  -- 1. Buscar configuração da agenda
  SELECT *
  INTO v_config
  FROM configuracao_agenda
  WHERE user_id = p_user_id;

  -- Agenda inexistente ou inativa → disponível
  IF v_config IS NULL OR NOT v_config.agenda_ativa THEN
    RETURN jsonb_build_object(
      'disponivel', true,
      'status', 'inativa',
      'eventos_atual', 0,
      'eventos_max', 999,
      'modo_aviso', 'informativo',
      'bloqueada', false,
      'mensagem', 'Sistema de agenda não está ativo',
      'agenda_ativa', false,
      'modo_agendamento', 'dia',
      'slots', '[]'::jsonb
    );
  END IF;

  -- 2. Data bloqueada manualmente (dia inteiro)
  SELECT EXISTS(
    SELECT 1 FROM datas_bloqueadas
    WHERE user_id = p_user_id 
      AND data_bloqueada = p_data_evento 
      AND horario_bloqueado IS NULL
  ) INTO v_bloqueada;

  IF v_bloqueada THEN
    RETURN jsonb_build_object(
      'disponivel', false,
      'status', 'bloqueada',
      'eventos_atual', 0,
      'eventos_max', v_config.eventos_max_por_dia,
      'modo_aviso', v_config.modo_aviso,
      'bloqueada', true,
      'mensagem', 'Esta data está bloqueada pelo fotógrafo.',
      'agenda_ativa', true,
      'modo_agendamento', v_config.modo_agendamento,
      'slots', '[]'::jsonb
    );
  END IF;

  -- 3. Períodos de bloqueio (férias)
  SELECT EXISTS(
    SELECT 1 FROM periodos_bloqueados
    WHERE user_id = p_user_id
      AND p_data_evento BETWEEN data_inicio AND data_fim
  ) INTO v_em_periodo;

  IF v_em_periodo THEN
    RETURN jsonb_build_object(
      'disponivel', false,
      'status', 'bloqueada',
      'eventos_atual', 0,
      'eventos_max', v_config.eventos_max_por_dia,
      'modo_aviso', v_config.modo_aviso,
      'bloqueada', true,
      'mensagem', 'Data dentro de um período de férias ou bloqueio.',
      'agenda_ativa', true,
      'modo_agendamento', v_config.modo_agendamento,
      'slots', '[]'::jsonb
    );
  END IF;

  -- 4. Regras de massa (somente se ativas)
  IF COALESCE(v_config.regras_massa_ativas, false) THEN

    -- 4a. Dias da semana bloqueados (0=Dom, 1=Seg...6=Sab)
    v_dia_semana := EXTRACT(DOW FROM p_data_evento)::integer;
    IF v_config.dias_semana_bloqueados IS NOT NULL
       AND v_dia_semana = ANY(v_config.dias_semana_bloqueados) THEN
      RETURN jsonb_build_object(
        'disponivel', false,
        'status', 'bloqueada',
        'eventos_atual', 0,
        'eventos_max', v_config.eventos_max_por_dia,
        'modo_aviso', v_config.modo_aviso,
        'bloqueada', true,
        'mensagem', 'Este dia da semana está bloqueado.',
        'agenda_ativa', true,
        'modo_agendamento', v_config.modo_agendamento,
        'slots', '[]'::jsonb
      );
    END IF;

    -- 4b. Dias pares/ímpares do mês
    v_dia_mes := EXTRACT(DAY FROM p_data_evento)::integer;

    IF v_config.regra_par_impar = 'pares' AND v_dia_mes % 2 = 0 THEN
      RETURN jsonb_build_object(
        'disponivel', false,
        'status', 'bloqueada',
        'eventos_atual', 0,
        'eventos_max', v_config.eventos_max_por_dia,
        'modo_aviso', v_config.modo_aviso,
        'bloqueada', true,
        'mensagem', 'Datas pares estão bloqueadas.',
        'agenda_ativa', true,
        'modo_agendamento', v_config.modo_agendamento,
        'slots', '[]'::jsonb
      );
    END IF;

    IF v_config.regra_par_impar = 'impares' AND v_dia_mes % 2 != 0 THEN
      RETURN jsonb_build_object(
        'disponivel', false,
        'status', 'bloqueada',
        'eventos_atual', 0,
        'eventos_max', v_config.eventos_max_por_dia,
        'modo_aviso', v_config.modo_aviso,
        'bloqueada', true,
        'mensagem', 'Datas ímpares estão bloqueadas.',
        'agenda_ativa', true,
        'modo_agendamento', v_config.modo_agendamento,
        'slots', '[]'::jsonb
      );
    END IF;

    -- 4c. Feriados (nacionais e personalizados)
    IF COALESCE(v_config.bloquear_feriados, false) THEN
      SELECT EXISTS(
        SELECT 1 FROM feriados
        WHERE user_id = p_user_id
          AND data = p_data_evento
      ) INTO v_eh_feriado;

      IF v_eh_feriado THEN
        RETURN jsonb_build_object(
          'disponivel', false,
          'status', 'bloqueada',
          'eventos_atual', 0,
          'eventos_max', v_config.eventos_max_por_dia,
          'modo_aviso', v_config.modo_aviso,
          'bloqueada', true,
          'mensagem', 'Esta data é um feriado bloqueado.',
          'agenda_ativa', true,
          'modo_agendamento', v_config.modo_agendamento,
          'slots', '[]'::jsonb
        );
      END IF;
    END IF;

    -- 4d. Semanas alternadas
    IF v_config.regra_semanal IS NOT NULL
       AND v_config.regra_semanal != 'nenhum'
       AND v_config.regra_semanal_inicio IS NOT NULL THEN

      v_diff_dias := (p_data_evento - v_config.regra_semanal_inicio)::integer;
      v_num_semana := v_diff_dias / 7;
      v_eh_semana_par := (v_num_semana % 2 = 0);

      IF v_config.regra_semanal = 'trabalha_pares' AND NOT v_eh_semana_par THEN
        RETURN jsonb_build_object(
          'disponivel', false,
          'status', 'bloqueada',
          'eventos_atual', 0,
          'eventos_max', v_config.eventos_max_por_dia,
          'modo_aviso', v_config.modo_aviso,
          'bloqueada', true,
          'mensagem', 'Semana bloqueada (disponível apenas semanas alternadas).',
          'agenda_ativa', true,
          'modo_agendamento', v_config.modo_agendamento,
          'slots', '[]'::jsonb
        );
      END IF;

      IF v_config.regra_semanal = 'trabalha_impares' AND v_eh_semana_par THEN
        RETURN jsonb_build_object(
          'disponivel', false,
          'status', 'bloqueada',
          'eventos_atual', 0,
          'eventos_max', v_config.eventos_max_por_dia,
          'modo_aviso', v_config.modo_aviso,
          'bloqueada', true,
          'mensagem', 'Semana bloqueada (disponível apenas semanas alternadas).',
          'agenda_ativa', true,
          'modo_agendamento', v_config.modo_agendamento,
          'slots', '[]'::jsonb
        );
      END IF;

    END IF;

  END IF; -- fim regras_massa_ativas

  -- 5. Modo de Agendamento por Dia (padrão)
  IF COALESCE(v_config.modo_agendamento, 'dia') = 'dia' THEN
    SELECT COUNT(*)
    INTO v_eventos_count
    FROM eventos_agenda
    WHERE user_id = p_user_id
      AND data_evento = p_data_evento
      AND status IN ('confirmado', 'pendente')
      -- Se bloquear_agenda_workflow for falso, ignorar eventos de origem 'workflow'
      AND (COALESCE(v_config.bloquear_agenda_workflow, false) OR origem != 'workflow')
      -- Filtrar por ambiente (tarefas internas e externas) conforme configurações
      AND (
        (ambiente = 'interno' AND COALESCE(v_config.bloquear_tarefas_internas, NOT COALESCE(v_config.permitir_conflito_interno, false))) OR
        (ambiente = 'externo' AND COALESCE(v_config.bloquear_tarefas_externas, true))
      );

    IF v_eventos_count = 0 THEN
      RETURN jsonb_build_object(
        'disponivel', true,
        'status', 'disponivel',
        'eventos_atual', v_eventos_count,
        'eventos_max', v_config.eventos_max_por_dia,
        'modo_aviso', v_config.modo_aviso,
        'bloqueada', false,
        'mensagem', 'Data disponível!',
        'agenda_ativa', true,
        'modo_agendamento', 'dia',
        'slots', '[]'::jsonb
      );
    ELSIF v_eventos_count < v_config.eventos_max_por_dia THEN
      RETURN jsonb_build_object(
        'disponivel', true,
        'status', 'parcial',
        'eventos_atual', v_eventos_count,
        'eventos_max', v_config.eventos_max_por_dia,
        'modo_aviso', v_config.modo_aviso,
        'bloqueada', false,
        'mensagem', format('Disponibilidade limitada: %s de %s vagas preenchidas',
          v_eventos_count, v_config.eventos_max_por_dia),
        'agenda_ativa', true,
        'modo_agendamento', 'dia',
        'slots', '[]'::jsonb
      );
    ELSE
      RETURN jsonb_build_object(
        'disponivel', false,
        'status', 'ocupada',
        'eventos_atual', v_eventos_count,
        'eventos_max', v_config.eventos_max_por_dia,
        'modo_aviso', v_config.modo_aviso,
        'bloqueada', false,
        'mensagem', 'Já temos um evento para esta data.',
        'agenda_ativa', true,
        'modo_agendamento', 'dia',
        'slots', '[]'::jsonb
      );
    END IF;
  END IF;

  -- 6. Modo de Agendamento por Hora (Slots)
  -- Determinar a lista de slots para o dia da semana atual
  v_dia_semana := EXTRACT(DOW FROM p_data_evento)::integer;
  v_dia_semana_key := v_dia_semana::text;

  -- Pegar a configuração de horários do banco
  IF v_config.config_horarios_trabalho IS NOT NULL AND jsonb_typeof(v_config.config_horarios_trabalho) = 'object' THEN
    v_slots_list := v_config.config_horarios_trabalho->v_dia_semana_key;
  END IF;

  -- Se não configurou, usar slots padrão de hora em hora das 08h às 20h
  IF v_slots_list IS NULL OR jsonb_typeof(v_slots_list) != 'array' THEN
    v_slots_list := '["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"]'::jsonb;
  END IF;

  -- Iterar sobre cada slot e avaliar disponibilidade
  FOR v_slot_text IN SELECT jsonb_array_elements_text(v_slots_list) LOOP
    v_start_time := v_slot_text::time;
    -- O fim do evento depende da duração calculada
    v_end_time := (v_start_time + (p_duracao_minutos || ' minutes')::interval)::time;
    v_slot_disponivel := true;
    v_motivo := NULL;

    -- A. Verificar se há algum evento de DIA INTEIRO registrado no dia
    -- Ou se a política for 'dia_inteiro' e houver pelo menos um evento qualquer confirmado/pendente
    SELECT EXISTS (
      SELECT 1 FROM eventos_agenda
      WHERE user_id = p_user_id
        AND data_evento = p_data_evento
        AND status IN ('confirmado', 'pendente')
        AND (COALESCE(v_config.bloquear_agenda_workflow, false) OR origem != 'workflow')
        -- Filtrar por ambiente (tarefas internas e externas) conforme configurações
        AND (
          (ambiente = 'interno' AND COALESCE(v_config.bloquear_tarefas_internas, NOT COALESCE(v_config.permitir_conflito_interno, false))) OR
          (ambiente = 'externo' AND COALESCE(v_config.bloquear_tarefas_externas, true))
        )
        AND (
          horario_inicio IS NULL OR 
          v_config.politica_bloqueio = 'dia_inteiro'
        )
    ) INTO v_conflito_evento;

    IF v_conflito_evento THEN
      v_slot_disponivel := false;
      v_motivo := 'dia_ocupado';
    ELSE
      -- B. Verificar sobreposição com eventos específicos neste horário
      -- (p_start < e.horario_fim) AND (e.horario_inicio < p_end)
      SELECT EXISTS (
        SELECT 1 FROM eventos_agenda
        WHERE user_id = p_user_id
          AND data_evento = p_data_evento
          AND status IN ('confirmado', 'pendente')
          AND (COALESCE(v_config.bloquear_agenda_workflow, false) OR origem != 'workflow')
          -- Filtrar por ambiente (tarefas internas e externas) conforme configurações
          AND (
            (ambiente = 'interno' AND COALESCE(v_config.bloquear_tarefas_internas, NOT COALESCE(v_config.permitir_conflito_interno, false))) OR
            (ambiente = 'externo' AND COALESCE(v_config.bloquear_tarefas_externas, true))
          )
          AND horario_inicio IS NOT NULL
          AND horario_fim IS NOT NULL
          AND (v_start_time < horario_fim AND horario_inicio < v_end_time)
      ) INTO v_conflito_evento;

      IF v_conflito_evento THEN
        v_slot_disponivel := false;
        v_motivo := 'conflito_horario';
      ELSE
        -- C. Verificar se há bloqueios manuais específicos de horário
        SELECT EXISTS (
          SELECT 1 FROM datas_bloqueadas
          WHERE user_id = p_user_id
            AND data_bloqueada = p_data_evento
            AND horario_bloqueado IS NOT NULL
            -- Para simplificar: colide se o horário do slot for igual ao horário bloqueado
            -- ou se estiver dentro do intervalo (assumindo duração padrão de 60m para bloqueio)
            AND (v_start_time < (horario_bloqueado + '60 minutes'::interval)::time AND horario_bloqueado < v_end_time)
        ) INTO v_conflito_bloqueio;

        IF v_conflito_bloqueio THEN
          v_slot_disponivel := false;
          v_motivo := 'horario_bloqueado';
        END IF;
      END IF;
    END IF;

    -- Construir o objeto do slot
    v_slot_result := jsonb_build_object(
      'horario', v_slot_text,
      'disponivel', v_slot_disponivel,
      'motivo', v_motivo
    );
    
    v_slots_array := v_slots_array || v_slot_result;
    v_slots_total_count := v_slots_total_count + 1;
    IF v_slot_disponivel THEN
      v_slots_avail_count := v_slots_avail_count + 1;
    END IF;
  END LOOP;

  -- 7. Retornar resultado da disponibilidade
  IF v_slots_avail_count = 0 THEN
    RETURN jsonb_build_object(
      'disponivel', false,
      'status', 'ocupada',
      'eventos_atual', v_slots_total_count - v_slots_avail_count,
      'eventos_max', v_slots_total_count,
      'modo_aviso', v_config.modo_aviso,
      'bloqueada', false,
      'mensagem', 'Não há horários disponíveis para este dia.',
      'agenda_ativa', true,
      'modo_agendamento', 'hora',
      'slots', v_slots_array
    );
  ELSIF v_slots_avail_count < v_slots_total_count THEN
    RETURN jsonb_build_object(
      'disponivel', true,
      'status', 'parcial',
      'eventos_atual', v_slots_total_count - v_slots_avail_count,
      'eventos_max', v_slots_total_count,
      'modo_aviso', v_config.modo_aviso,
      'bloqueada', false,
      'mensagem', format('Temos %s horários disponíveis para este dia.', v_slots_avail_count),
      'agenda_ativa', true,
      'modo_agendamento', 'hora',
      'slots', v_slots_array
    );
  ELSE
    RETURN jsonb_build_object(
      'disponivel', true,
      'status', 'disponivel',
      'eventos_atual', 0,
      'eventos_max', v_slots_total_count,
      'modo_aviso', v_config.modo_aviso,
      'bloqueada', false,
      'mensagem', 'Todos os horários estão disponíveis!',
      'agenda_ativa', true,
      'modo_agendamento', 'hora',
      'slots', v_slots_array
    );
  END IF;

END;
$$;

-- Garantir permissões de execução
GRANT EXECUTE ON FUNCTION public.check_date_availability(uuid, date, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.check_date_availability(uuid, date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_date_availability(uuid, date, integer) TO service_role;
