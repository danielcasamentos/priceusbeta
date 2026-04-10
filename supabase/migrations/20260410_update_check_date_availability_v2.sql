-- ============================================================
-- Migration: Atualiza check_date_availability com regras avançadas
-- Versão: 2.0
-- Data: 2026-04-10
-- 
-- Adiciona verificação de:
--   1. Períodos de bloqueio (férias)
--   2. Regras de massa: dias da semana, pares/ímpares, feriados, semanas alternadas
-- ============================================================

CREATE OR REPLACE FUNCTION "public"."check_date_availability"("p_user_id" "uuid", "p_data_evento" "date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_config record;
  v_eventos_count integer;
  v_bloqueada boolean;
  v_motivo_bloqueio text;
  v_result jsonb;
  v_dia_semana integer;      -- 0=Dom, 6=Sab (EXTRACT DOW)
  v_dia_mes integer;         -- 1-31
  v_num_semana integer;      -- semana relativa à data de início
  v_diff_dias integer;
  v_eh_semana_par boolean;
  v_em_periodo boolean;
  v_eh_feriado boolean;
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
      'agenda_ativa', false
    );
  END IF;

  -- 2. Data bloqueada manualmente (prioridade máxima)
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
      'mensagem', 'Esta data está bloqueada pelo fotógrafo.',
      'agenda_ativa', true
    );
  END IF;

  -- 3. Períodos de bloqueio (férias) — independente de regras_massa_ativas
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
      'agenda_ativa', true
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
        'agenda_ativa', true
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
        'agenda_ativa', true
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
        'agenda_ativa', true
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
          'agenda_ativa', true
        );
      END IF;
    END IF;

    -- 4d. Semanas alternadas (trabalha semanas pares ou ímpares)
    IF v_config.regra_semanal IS NOT NULL
       AND v_config.regra_semanal != 'nenhum'
       AND v_config.regra_semanal_inicio IS NOT NULL THEN

      v_diff_dias := (p_data_evento - v_config.regra_semanal_inicio)::integer;
      v_num_semana := v_diff_dias / 7;
      v_eh_semana_par := (v_num_semana % 2 = 0);

      -- "trabalha_pares" = bloqueia semanas ímpares
      IF v_config.regra_semanal = 'trabalha_pares' AND NOT v_eh_semana_par THEN
        RETURN jsonb_build_object(
          'disponivel', false,
          'status', 'bloqueada',
          'eventos_atual', 0,
          'eventos_max', v_config.eventos_max_por_dia,
          'modo_aviso', v_config.modo_aviso,
          'bloqueada', true,
          'mensagem', 'Semana bloqueada (disponível apenas semanas alternadas).',
          'agenda_ativa', true
        );
      END IF;

      -- "trabalha_impares" = bloqueia semanas pares
      IF v_config.regra_semanal = 'trabalha_impares' AND v_eh_semana_par THEN
        RETURN jsonb_build_object(
          'disponivel', false,
          'status', 'bloqueada',
          'eventos_atual', 0,
          'eventos_max', v_config.eventos_max_por_dia,
          'modo_aviso', v_config.modo_aviso,
          'bloqueada', true,
          'mensagem', 'Semana bloqueada (disponível apenas semanas alternadas).',
          'agenda_ativa', true
        );
      END IF;

    END IF;

  END IF; -- fim regras_massa_ativas

  -- 5. Verificar ocupação por eventos
  SELECT COUNT(*)
  INTO v_eventos_count
  FROM eventos_agenda
  WHERE user_id = p_user_id
    AND data_evento = p_data_evento
    AND status IN ('confirmado', 'pendente');

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
GRANT EXECUTE ON FUNCTION public.check_date_availability(uuid, date) TO anon;
GRANT EXECUTE ON FUNCTION public.check_date_availability(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_date_availability(uuid, date) TO service_role;
