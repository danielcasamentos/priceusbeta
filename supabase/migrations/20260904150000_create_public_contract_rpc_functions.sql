-- ==========================================================
-- Migration: RPCs públicas e seguras para assinatura de contrato
-- 1. insert_public_transactions: Cria transações financeiras vinculadas ao contrato assinado
-- 2. notify_public_contract_signed: Registra notificação para o fotógrafo/empresa
-- 3. RLS permissivo para INSERT na tabela notifications (anon & authenticated)
-- ==========================================================

-- 1. RPC para inserção de transações financeiras do contrato por cliente público
CREATE OR REPLACE FUNCTION public.insert_public_transactions(
  p_token uuid,
  p_transactions jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract record;
  v_transaction jsonb;
  v_count integer := 0;
BEGIN
  -- 1. Validar o token e recuperar os dados do contrato
  SELECT id, user_id, lead_id INTO v_contract
  FROM public.contracts
  WHERE token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato não encontrado para o token fornecido.';
  END IF;

  -- 2. Inserir cada transação financeira com os dados de segurança do contrato
  IF p_transactions IS NOT NULL AND jsonb_typeof(p_transactions) = 'array' THEN
    FOR v_transaction IN SELECT * FROM jsonb_array_elements(p_transactions)
    LOOP
      INSERT INTO public.company_transactions (
        user_id,
        lead_id,
        contract_id,
        tipo,
        origem,
        descricao,
        valor,
        data,
        status,
        forma_pagamento,
        is_installment,
        installment_number,
        total_installments,
        documento_fiscal,
        created_at,
        updated_at
      ) VALUES (
        v_contract.user_id,
        v_contract.lead_id,
        v_contract.id,
        COALESCE(v_transaction->>'tipo', 'receita'),
        COALESCE(v_transaction->>'origem', 'contrato'),
        COALESCE(v_transaction->>'descricao', 'Contrato - ' || COALESCE(v_transaction->>'documento_fiscal', 'Cliente')),
        COALESCE((v_transaction->>'valor')::numeric, 0),
        COALESCE((v_transaction->>'data')::date, CURRENT_DATE),
        COALESCE(v_transaction->>'status', 'pendente'),
        COALESCE(v_transaction->>'forma_pagamento', 'Não especificado'),
        COALESCE((v_transaction->>'is_installment')::boolean, false),
        CASE WHEN (v_transaction->>'is_installment')::boolean = true THEN (v_transaction->>'installment_number')::integer ELSE NULL END,
        CASE WHEN (v_transaction->>'is_installment')::boolean = true THEN (v_transaction->>'total_installments')::integer ELSE NULL END,
        NULLIF(v_transaction->>'documento_fiscal', ''),
        NOW(),
        NOW()
      );
      v_count := v_count + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_public_transactions(uuid, jsonb) TO anon, authenticated;
COMMENT ON FUNCTION public.insert_public_transactions(uuid, jsonb) IS 'Permite que um cliente público registre as transações financeiras geradas pela assinatura do contrato.';


-- 2. RPC para notificar o fotógrafo/profissional quando o contrato for assinado
CREATE OR REPLACE FUNCTION public.notify_public_contract_signed(
  p_token uuid,
  p_client_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract record;
BEGIN
  SELECT id, user_id INTO v_contract
  FROM public.contracts
  WHERE token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato não encontrado para o token fornecido.';
  END IF;

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
    v_contract.user_id,
    '📝 Contrato Assinado!',
    'O contrato do evento de ' || COALESCE(p_client_name, 'Cliente') || ' foi assinado digitalmente com sucesso.',
    'payment',
    '/dashboard/contracts',
    v_contract.id,
    false,
    NOW()
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_public_contract_signed(uuid, text) TO anon, authenticated;
COMMENT ON FUNCTION public.notify_public_contract_signed(uuid, text) IS 'Dispara notificação para o usuário do sistema quando o contrato for assinado pelo cliente.';


-- 3. Garantir políticas de RLS na tabela notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
