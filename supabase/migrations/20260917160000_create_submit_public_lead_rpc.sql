-- ==========================================================
-- Migration: 20260917160000_create_submit_public_lead_rpc.sql
-- RPC pública e segura para captura imediata de leads e notificações
-- Funciona mesmo em navegadores in-app restritivos (Instagram, WhatsApp, TikTok)
-- ==========================================================

CREATE OR REPLACE FUNCTION public.submit_public_lead(
  p_template_id uuid,
  p_user_id uuid,
  p_form_data jsonb,
  p_orcamento_detalhe jsonb DEFAULT '{}'::jsonb,
  p_valor_total numeric DEFAULT 0,
  p_status text DEFAULT 'novo',
  p_session_id text DEFAULT NULL,
  p_url_origem text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_tempo_preenchimento integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_client_name text;
  v_client_email text;
  v_client_phone text;
  v_data_evento date;
  v_cidade_evento text;
  v_tipo_evento text;
  v_existing_lead_id uuid;
  v_result jsonb;
BEGIN
  -- Extrair campos essenciais do payload
  v_client_name := COALESCE(
    p_form_data->>'nome_cliente',
    p_form_data->>'nomeCliente',
    p_form_data->>'name',
    'Cliente'
  );
  v_client_email := COALESCE(
    p_form_data->>'email_cliente',
    p_form_data->>'emailCliente',
    p_form_data->>'email',
    ''
  );
  v_client_phone := COALESCE(
    p_form_data->>'telefone_cliente',
    p_form_data->>'telefoneCliente',
    p_form_data->>'phone',
    ''
  );
  v_cidade_evento := COALESCE(
    p_form_data->>'cidade_evento',
    p_form_data->>'cidadeEvento',
    p_form_data->>'city',
    ''
  );
  v_tipo_evento := COALESCE(
    p_form_data->>'tipo_evento',
    p_form_data->>'tipoEvento',
    ''
  );

  -- Tentar converter data_evento se presente
  BEGIN
    IF p_form_data->>'data_evento' IS NOT NULL AND p_form_data->>'data_evento' <> '' THEN
      v_data_evento := (p_form_data->>'data_evento')::date;
    ELSIF p_form_data->>'dataEvento' IS NOT NULL AND p_form_data->>'dataEvento' <> '' THEN
      v_data_evento := (p_form_data->>'dataEvento')::date;
    ELSE
      v_data_evento := NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_data_evento := NULL;
  END;

  -- Se houver session_id, verificar se já existe lead criado nesta sessão
  IF p_session_id IS NOT NULL AND p_session_id <> '' THEN
    SELECT id INTO v_existing_lead_id
    FROM public.leads
    WHERE session_id = p_session_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_existing_lead_id IS NOT NULL THEN
    -- Atualizar lead existente
    UPDATE public.leads
    SET
      nome_cliente = v_client_name,
      email_cliente = v_client_email,
      telefone_cliente = v_client_phone,
      dados_formulario = p_form_data,
      orcamento_detalhe = p_orcamento_detalhe,
      valor_total = p_valor_total,
      status = COALESCE(p_status, 'novo'),
      url_origem = p_url_origem,
      user_agent = p_user_agent,
      tempo_preenchimento_segundos = p_tempo_preenchimento,
      data_evento = v_data_evento,
      cidade_evento = v_cidade_evento,
      tipo_evento = v_tipo_evento,
      updated_at = NOW()
    WHERE id = v_existing_lead_id
    RETURNING id INTO v_lead_id;
  ELSE
    -- Inserir novo lead
    INSERT INTO public.leads (
      template_id,
      user_id,
      nome_cliente,
      email_cliente,
      telefone_cliente,
      dados_formulario,
      orcamento_detalhe,
      valor_total,
      status,
      session_id,
      url_origem,
      user_agent,
      tempo_preenchimento_segundos,
      data_evento,
      cidade_evento,
      tipo_evento,
      created_at,
      updated_at
    ) VALUES (
      p_template_id,
      p_user_id,
      v_client_name,
      v_client_email,
      v_client_phone,
      p_form_data,
      p_orcamento_detalhe,
      p_valor_total,
      COALESCE(p_status, 'novo'),
      p_session_id,
      p_url_origem,
      p_user_agent,
      p_tempo_preenchimento,
      v_data_evento,
      v_cidade_evento,
      v_tipo_evento,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_lead_id;
  END IF;

  -- Criar notificação para o fotógrafo/profissional
  IF p_user_id IS NOT NULL AND (p_status IS NULL OR p_status <> 'abandonado') THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      link,
      related_id,
      is_read,
      created_at
    ) VALUES (
      p_user_id,
      'Novo Lead Recebido',
      'Você recebeu um novo lead de ' || v_client_name || '!',
      'info',
      '/dashboard/leads',
      v_lead_id,
      false,
      NOW()
    );
  END IF;

  -- Retornar os dados do lead em formato json
  SELECT to_jsonb(l) INTO v_result
  FROM public.leads l
  WHERE l.id = v_lead_id;

  RETURN v_result;
END;
$$;

-- Permitir chamada pública por anon e authenticated
GRANT EXECUTE ON FUNCTION public.submit_public_lead(uuid, uuid, jsonb, jsonb, numeric, text, text, text, text, integer) TO anon, authenticated;
COMMENT ON FUNCTION public.submit_public_lead IS 'Captura pública e atômica de lead com notificação imediata do fotógrafo.';
