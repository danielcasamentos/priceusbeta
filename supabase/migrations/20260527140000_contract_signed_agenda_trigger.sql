-- ==========================================================
-- Migration: trigger para criar evento na agenda automaticamente
--   ao ter um contrato assinado pelo cliente.
-- Data: 2026-05-27
-- ==========================================================

CREATE OR REPLACE FUNCTION public.handle_contract_signed()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_nome text;
  v_tipo_evento text;
  v_cidade text;
  v_data_evento date;
BEGIN
  -- Só dispara se o status mudou para 'signed'
  IF NEW.status = 'signed' AND (OLD.status IS NULL OR OLD.status != 'signed') THEN
    
    -- Tenta pegar a data do evento do client_data_json ou lead_data_json
    v_data_evento := COALESCE(
      (NEW.client_data_json->>'data_evento')::date,
      (NEW.lead_data_json->>'data_evento')::date
    );

    IF v_data_evento IS NOT NULL THEN
      -- Evitar duplicados para o mesmo lead_id na agenda
      IF NOT EXISTS (
        SELECT 1 FROM public.eventos_agenda 
        WHERE lead_id = NEW.lead_id AND data_evento = v_data_evento
      ) THEN
        
        v_lead_nome := COALESCE(NEW.lead_data_json->>'nome_cliente', NEW.client_data_json->>'nome_completo', 'Cliente');
        v_tipo_evento := COALESCE(NEW.lead_data_json->>'tipo_evento', 'Evento');
        v_cidade := COALESCE(NEW.client_data_json->>'cidade_evento', NEW.lead_data_json->>'cidade_evento', '');

        INSERT INTO public.eventos_agenda (
          user_id,
          lead_id,
          data_evento,
          tipo_evento,
          cliente_nome,
          cidade,
          status,
          origem,
          observacoes
        ) VALUES (
          NEW.user_id,
          NEW.lead_id,
          v_data_evento,
          v_tipo_evento,
          v_lead_nome,
          v_cidade,
          'confirmado',
          'lead_convertido',
          'Gerado via assinatura do contrato pelo cliente'
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_contract_signed ON public.contracts;
CREATE TRIGGER trg_contract_signed
  AFTER UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_contract_signed();
