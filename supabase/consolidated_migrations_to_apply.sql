-- ==========================================
-- MIGRATION: 20260415_painel_flutuante.sql
-- ==========================================

-- Migration: Adicionar controle de exibição do painel flutuante de total

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS exibir_painel_flutuante boolean DEFAULT true;


-- ==========================================
-- MIGRATION: 20260416_fix_encoding_data_ocupada.sql
-- ==========================================

-- Fix: corrige encoding da mensagem de data ocupada na função check_date_availability
-- O problema: "J√° temos" em vez de "Já temos" — encoding Latin-1 na função salva no banco
-- Solução: recriar a função com encoding correto (UTF-8 nativo)

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
  v_dia_semana integer;
  v_dia_mes integer;
  v_num_semana integer;
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
      'agenda_ativa', true
    );
  END IF;

  -- 4. Regras de massa
  IF COALESCE(v_config.regras_massa_ativas, false) THEN

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
          'agenda_ativa', true
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
          'agenda_ativa', true
        );
      END IF;

    END IF;

  END IF;

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

-- Regarantir permissões após o replace
GRANT EXECUTE ON FUNCTION public.check_date_availability(uuid, date) TO anon;
GRANT EXECUTE ON FUNCTION public.check_date_availability(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_date_availability(uuid, date) TO service_role;


-- ==========================================
-- MIGRATION: 20260416_template_descricao_perfil.sql
-- ==========================================

-- 1. Campo de descrição curta exibida no perfil público (vitrine)
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS descricao_perfil varchar(200);

-- 2. Toggle para ocultar a data de criação nos cards do perfil público
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS ocultar_data_criacao boolean DEFAULT false;


-- ==========================================
-- MIGRATION: 20260423_darkstudio_check_constraint.sql
-- ==========================================

-- =============================================================
-- Migration: Adiciona 'darkstudio' aos CHECK constraints de tema
-- Data: 2026-04-23
-- Problema: templates_tema_check e profiles_tema_perfil_check
--   bloqueavam o valor 'darkstudio' com erro 400/23514.
-- Solução: Drop + recreate dos constraints incluindo o novo valor.
-- =============================================================

-- ── 1. templates.tema ────────────────────────────────────────
-- NOTE: The final constraint with ALL values is applied once at the bottom of this script.
-- Skipping intermediate constraint here to avoid violating rows with newer tema values.

-- ── 2. profiles.tema_perfil ──────────────────────────────────
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_tema_perfil_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_tema_perfil_check
  CHECK (tema_perfil IN (
    'original',
    'minimalist',
    'modern',
    'magazine',
    'darkstudio'
  ));


-- ==========================================
-- MIGRATION: 20260423_hour_value_config.sql
-- ==========================================

-- =============================================================
-- Migration: Configurações da Calculadora de Valor por Hora
-- Data: 2026-04-23
-- Descrição: Adiciona colunas na tabela profiles para persistir
--   as configurações da calculadora de valor/hora de trabalho,
--   eliminando a dependência do localStorage.
-- =============================================================

-- Adiciona as 3 colunas de configuração na tabela profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS horas_semana INTEGER NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS dias_semana  INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS lucro_desejado NUMERIC(12, 2) NOT NULL DEFAULT 3000;

-- Comentários descritivos
COMMENT ON COLUMN profiles.horas_semana    IS 'Horas de trabalho por semana definidas pelo usuário (calculadora de valor/hora)';
COMMENT ON COLUMN profiles.dias_semana     IS 'Dias úteis de trabalho por semana definidos pelo usuário (calculadora de valor/hora)';
COMMENT ON COLUMN profiles.lucro_desejado  IS 'Meta de lucro líquido mensal desejado pelo usuário (R$)';


-- ==========================================
-- MIGRATION: 20260427_tema_preferido.sql
-- ==========================================

-- Adiciona coluna de preferência de tema por usuário
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tema_preferido TEXT
  CHECK (tema_preferido IN ('light', 'dark'));

-- Índice não é necessário para coluna com 2 valores em tabela pequena


-- ==========================================
-- MIGRATION: 20260506_workflow_leads.sql
-- ==========================================

-- ==========================================================
-- PriceUs: Workflow de Leads
-- Adiciona campo workflow à tabela leads e cria tabela
-- de templates de workflow reutilizáveis.
-- ==========================================================

-- 1. Adicionar campo workflow ao leads (array de etapas em JSON)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS workflow JSONB DEFAULT '[]'::jsonb;

-- 2. Adicionar status 'finalizado' ao check constraint (se existir)
--    O campo status já é TEXT, então não precisa alterar enum.
--    Adicionamos apenas um comentário documentando o novo valor.
COMMENT ON COLUMN leads.status IS
  'Status do lead: novo, abandonado, contatado, convertido, perdido, em_negociacao, fazer_followup, finalizado';

-- 3. Criar tabela de templates de workflow reutilizáveis
CREATE TABLE IF NOT EXISTS workflow_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome        TEXT NOT NULL,
  etapas      JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS para workflow_templates
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workflow_templates'
    AND policyname = 'Users can manage own workflow_templates'
  ) THEN
    CREATE POLICY "Users can manage own workflow_templates"
      ON workflow_templates
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_workflow_templates_user_id
  ON workflow_templates(user_id);

CREATE INDEX IF NOT EXISTS idx_leads_workflow
  ON leads USING GIN (workflow)
  WHERE workflow IS NOT NULL AND workflow != '[]'::jsonb;

-- 6. Trigger para atualizar updated_at dos workflow_templates
CREATE OR REPLACE FUNCTION update_workflow_templates_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workflow_templates_updated_at ON workflow_templates;
CREATE TRIGGER trg_workflow_templates_updated_at
  BEFORE UPDATE ON workflow_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_templates_updated_at();

-- 7. Documentação
COMMENT ON TABLE workflow_templates IS
  'Templates de workflow reutilizáveis por profissional (fotógrafos, videomakers, etc.)';
COMMENT ON COLUMN workflow_templates.etapas IS
  'Array de etapas: [{label, description, deadline_offset_days}]';
COMMENT ON COLUMN leads.workflow IS
  'Array de etapas do workflow: [{id, label, description, deadline, status}]';


-- ==========================================
-- MIGRATION: 20260507_product_features.sql
-- ==========================================

-- Migration: Novas features de produto
-- 1. permite_multiplas_unidades: toggle vs contador de quantidade no quote
-- 2. desconto_percentual: desconto por produto (badge + preço riscado)

ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS permite_multiplas_unidades BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS desconto_percentual NUMERIC(5,2) DEFAULT 0
    CHECK (desconto_percentual >= 0 AND desconto_percentual <= 100);

-- Garante que produtos existentes herdam o comportamento atual (multiplas unidades)
UPDATE produtos SET permite_multiplas_unidades = TRUE WHERE permite_multiplas_unidades IS NULL;
UPDATE produtos SET desconto_percentual = 0 WHERE desconto_percentual IS NULL;


-- ==========================================
-- MIGRATION: 20260515150000_add_installments_company_transactions.sql
-- ==========================================

ALTER TABLE company_transactions 
ADD COLUMN IF NOT EXISTS is_installment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS installment_number INTEGER,
ADD COLUMN IF NOT EXISTS total_installments INTEGER;


-- ==========================================
-- MIGRATION: 20260519152600_add_data_nascimento_and_uid_externo.sql
-- ==========================================

-- Add data_nascimento to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS data_nascimento DATE;

-- Add uid_externo to eventos_agenda
ALTER TABLE eventos_agenda ADD COLUMN IF NOT EXISTS uid_externo TEXT;

-- Create index for faster sync lookups
CREATE INDEX IF NOT EXISTS idx_eventos_agenda_uid_externo ON eventos_agenda(uid_externo);


-- ==========================================
-- MIGRATION: 20260519161000_add_documento_fiscal_to_transactions.sql
-- ==========================================

-- Migration: Adicionar coluna documento_fiscal na tabela de transações
ALTER TABLE company_transactions ADD COLUMN IF NOT EXISTS documento_fiscal TEXT;


-- ==========================================
-- MIGRATION: 20260519163000_backfill_documento_fiscal.sql
-- ==========================================

-- Backfill existing transactions with documento_fiscal from contracts and leads
-- 1. Backfill from contracts
UPDATE company_transactions t
SET documento_fiscal = COALESCE(
  c.client_data_json->>'cpf',
  c.client_data_json->>'documento'
)
FROM contracts c
WHERE t.contract_id = c.id
  AND (t.documento_fiscal IS NULL OR t.documento_fiscal = '');

-- 2. Backfill from leads
UPDATE company_transactions t
SET documento_fiscal = COALESCE(
  l.dados_formulario->>'cpf',
  l.dados_formulario->>'documento'
)
FROM leads l
WHERE t.lead_id = l.id
  AND (t.documento_fiscal IS NULL OR t.documento_fiscal = '');


-- ==========================================
-- MIGRATION: 20260520110000_update_handle_new_user_trial_30_days.sql
-- ==========================================

-- Update handle_new_user to set the trial expiration to 30 days
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
INSERT INTO public.profiles (id, created_at, updated_at, data_expiracao_trial)
VALUES (
NEW.id,
now(),
now(),
now() + INTERVAL '30 days'
);
RETURN NEW;
END;
$$;


-- ==========================================
-- MIGRATION: 20260521220000_expand_eventos_agenda_origem_constraint.sql
-- ==========================================

-- Expand the origem CHECK constraint on eventos_agenda to include all values
-- currently used in the codebase (sync, lead conversion, ICS import, etc.)
--
-- Original constraint only allowed: 'manual', 'csv_import', 'lead_confirmado'
-- This caused 400 errors when inserting events via iCalendar sync.

ALTER TABLE eventos_agenda
  DROP CONSTRAINT IF EXISTS eventos_agenda_origem_check;

ALTER TABLE eventos_agenda
  ADD CONSTRAINT eventos_agenda_origem_check
  CHECK (origem IN (
    'manual',            -- Criado manualmente pelo usuário
    'csv_import',        -- Importado via arquivo CSV
    'lead_confirmado',   -- Legado: gerado via conversão de lead (nome antigo)
    'lead_convertido',   -- Gerado via conversão de lead no painel Clientes
    'ics_sync',          -- Sincronizado via link iCalendar (iPhone, Google, etc.)
    'google-calendar-sync' -- Alias legado para ics_sync (manter compatibilidade)
  ));

-- Also add uid_externo column if not yet applied (idempotent)
ALTER TABLE eventos_agenda
  ADD COLUMN IF NOT EXISTS uid_externo TEXT;

CREATE INDEX IF NOT EXISTS idx_eventos_agenda_uid_externo
  ON eventos_agenda(uid_externo);

-- Add data_nascimento to profiles if not yet applied (idempotent)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS data_nascimento DATE;


-- ==========================================
-- MIGRATION: 20260525093000_add_location_and_weekday_block.sql
-- ==========================================

-- Migration: Add location fields and weekday blocking
-- Data: 2026-05-25

-- ── 1. Adicionar campos de localização ao profile ───────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'Brasil';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS estado TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cidade TEXT;

-- ── 2. Adicionar dias_semana_bloqueados ao templates ───────────────────────
ALTER TABLE templates ADD COLUMN IF NOT EXISTS dias_semana_bloqueados INTEGER[] DEFAULT '{}'::INTEGER[];

-- ── 3. Atualizar check constraint de temas do template ──────────────────────
-- NOTE: Constraint final aplicado uma única vez no final do script.


-- ==========================================
-- MIGRATION: 20260525141500_add_limit_installments_by_event.sql
-- ==========================================

-- Adiciona campo para controlar se o número de parcelas deve ser limitado pela data do evento
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS limitar_parcelas_pelo_evento BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN templates.limitar_parcelas_pelo_evento IS 
  'Quando ativo, o limite máximo de parcelas é dinamicamente reduzido de acordo com a quantidade de meses restantes até a data do evento selecionado.';


-- ==========================================
-- MIGRATION: 20260526100000_add_oferta_theme_check_constraint.sql
-- ==========================================
-- NOTE: Constraint com 'oferta' aplicado uma única vez no final do script.


-- ==========================================
-- MIGRATION: 20260526110000_add_pdf_elegant_theme_and_images.sql
-- ==========================================

-- Migration: Add cover/footer image columns and 'pdf-elegante' to templates_tema_check constraint
-- Date: 2026-05-26

-- Add columns for cover and footer images to templates table
ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS cover_image_url text,
ADD COLUMN IF NOT EXISTS footer_image_url text;

-- NOTE: Constraint com 'pdf-elegante' aplicado uma única vez no final do script.


-- ==========================================
-- MIGRATION: 20260526130000_fix_storage_profile_uploads.sql
-- ==========================================

-- =====================================================
-- FIX: Storage Upload Policies para Profile Images
-- Problema: ProfileEditor usava path ${userId}/... sem prefixo de pasta,
-- mas a policy só permite 'produtos', 'uploads', 'thumbnails', 'temp'
-- Solução: Adicionar 'profile' à lista de pastas permitidas
-- =====================================================

-- Remover políticas de upload/delete antigas do bucket 'images'
DROP POLICY IF EXISTS "images_allow_uploads" ON storage.objects;
DROP POLICY IF EXISTS "images_allow_deletes" ON storage.objects;
DROP POLICY IF EXISTS "images_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "images_authenticated_delete" ON storage.objects;

-- Política de UPLOAD atualizada: inclui 'profile' + remove 'templates' como pasta válida
CREATE POLICY "images_allow_uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images'
  AND (storage.foldername(name))[1] IN (
    'produtos',
    'uploads',
    'thumbnails',
    'temp',
    'profile'
  )
);

-- Política de DELETE atualizada: inclui 'profile'
CREATE POLICY "images_allow_deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'images'
  AND (storage.foldername(name))[1] IN (
    'produtos',
    'uploads',
    'thumbnails',
    'temp',
    'profile'
  )
);

-- Garantir que a policy de UPDATE esteja correta
DROP POLICY IF EXISTS "images_allow_updates" ON storage.objects;
CREATE POLICY "images_allow_updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

-- Garantir que a policy de leitura pública esteja correta
DROP POLICY IF EXISTS "images_public_read" ON storage.objects;
CREATE POLICY "images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

-- Forçar recarregamento de políticas
NOTIFY storage_objects, 'reload';

-- Verificar políticas atuais
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;



-- ==========================================
-- FINAL: templates_tema_check com TODOS os valores
-- (Aplicado uma única vez para evitar violação por rows existentes)
-- ==========================================

ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_tema_check;

ALTER TABLE templates
  ADD CONSTRAINT templates_tema_check
  CHECK (tema IN (
    'moderno',
    'classico',
    'romantico',
    'vibrante',
    'natural',
    'minimalista',
    'pretoebranco',
    'escuro',
    'studio',
    'darkstudio',
    'promocional',
    'oferta',
    'pdf-elegante'
  ));


-- ==========================================
-- UPDATE MIGRATION HISTORY (Pre-new migrations)
-- ==========================================
INSERT INTO supabase_migrations.schema_migrations (version) VALUES
('20260416'),
('20260423'),
('20260427'),
('20260506'),
('20260507'),
('20260515150000'),
('20260519152600'),
('20260519161000'),
('20260519163000'),
('20260520110000'),
('20260521220000'),
('20260525093000'),
('20260525141500'),
('20260526100000'),
('20260526110000'),
('20260526130000')
ON CONFLICT (version) DO NOTHING;


-- ==========================================
-- Migration: 20260527140000_contract_signed_agenda_trigger
-- ==========================================

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


-- ==========================================
-- Migration: 20260527150000_create_company_tasks
-- ==========================================

CREATE TABLE IF NOT EXISTS public.company_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  descricao    TEXT NOT NULL,
  prioridade   TEXT CHECK (prioridade IN ('baixa', 'media', 'alta')) NOT NULL DEFAULT 'media',
  data_limite  DATE,
  concluida    BOOLEAN NOT NULL DEFAULT false,
  concluida_em TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.company_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company tasks"
  ON public.company_tasks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_company_tasks_user_id
  ON public.company_tasks(user_id);

CREATE INDEX IF NOT EXISTS idx_company_tasks_concluida
  ON public.company_tasks(user_id, concluida);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.set_company_tasks_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_tasks_updated_at ON public.company_tasks;
CREATE TRIGGER trg_company_tasks_updated_at
  BEFORE UPDATE ON public.company_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_company_tasks_updated_at();


-- ==========================================
-- UPDATE NEW MIGRATIONS HISTORY
-- ==========================================
INSERT INTO supabase_migrations.schema_migrations (version) VALUES
('20260527140000'),
('20260527150000')
ON CONFLICT (version) DO NOTHING;

