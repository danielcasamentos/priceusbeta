-- Migration: Consolidate missing columns, contract fixes, gifts, and notifications
-- Date: 2026-07-13

-- 1. Coluna multiplicador em temporadas
ALTER TABLE public.temporadas 
  ADD COLUMN IF NOT EXISTS multiplicador numeric(5,2) DEFAULT 1.0;

COMMENT ON COLUMN public.temporadas.multiplicador IS 'Multiplicador de preço para ajustes sazonais (ex: 1.15 = +15%, 0.90 = -10%)';

-- 2. Coluna regras_massa_ativas em configuracao_agenda
ALTER TABLE public.configuracao_agenda 
  ADD COLUMN IF NOT EXISTS regras_massa_ativas boolean DEFAULT false;

COMMENT ON COLUMN public.configuracao_agenda.regras_massa_ativas IS 'Define se as regras de bloqueio em massa na agenda estão ativas';

-- 3. Coluna content_override e payment_details_json em contracts (Corrige erro 400 ao salvar contrato)
ALTER TABLE public.contracts 
  ADD COLUMN IF NOT EXISTS content_override text,
  ADD COLUMN IF NOT EXISTS payment_details_json jsonb DEFAULT null;

COMMENT ON COLUMN public.contracts.content_override IS 'Conteúdo personalizado do contrato assinado pelo user';
COMMENT ON COLUMN public.contracts.payment_details_json IS 'Detalhes da forma de pagamento selecionada no orçamento';

-- 4. Coluna usar_termo_investimento em templates
ALTER TABLE public.templates 
  ADD COLUMN IF NOT EXISTS usar_termo_investimento boolean DEFAULT false;

COMMENT ON COLUMN public.templates.usar_termo_investimento IS 'Define se usa termo Investimento ao invés de Valor';

-- 5. Coluna brindes_vinculados em produtos
ALTER TABLE public.produtos 
  ADD COLUMN IF NOT EXISTS brindes_vinculados jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.produtos.brindes_vinculados IS 'Lista de IDs de produtos de upsell vinculados como brinde gratuito';

-- 6. Colunas de notificação (mapear read para is_read se necessário)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
        ALTER TABLE notifications ADD COLUMN is_read boolean DEFAULT false;
        UPDATE notifications SET is_read = read WHERE is_read IS NULL OR is_read = false;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'link') THEN
        ALTER TABLE notifications ADD COLUMN link text;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'related_id') THEN
        ALTER TABLE notifications ADD COLUMN related_id uuid;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_related_id ON notifications(related_id);

-- 7. Excluir a constraint que impede o tipo 'new_lead'
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 8. Coluna data_followup em leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data_followup DATE DEFAULT null;

-- 9. Recarregar o cache do PostgREST
NOTIFY pgrst, 'reload schema';
