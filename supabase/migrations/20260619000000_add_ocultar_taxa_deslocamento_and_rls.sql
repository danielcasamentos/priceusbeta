-- Migration: 20260619000000_add_ocultar_taxa_deslocamento_and_rls.sql
-- 1. Adiciona coluna ocultar_taxa_deslocamento na tabela templates
-- 2. Adiciona coluna agendamento_config na tabela leads
-- 3. Adiciona colunas fonte_personalizada e tema_personalizado_id na tabela profiles
-- 4. Cria políticas de RLS para permitir leitura/escrita anônima de Leads e Eventos de Agenda

-- 1. Alterações na tabela templates
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS ocultar_taxa_deslocamento BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.templates.ocultar_taxa_deslocamento IS 'Indica se a taxa de deslocamento deve ser oculta nos detalhes, mas mantida no total do orçamento.';

-- 2. Alterações na tabela leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS agendamento_config JSONB DEFAULT '{"modo": "dinamico", "datas_sugeridas": [], "mes_referencia": null}'::jsonb;

COMMENT ON COLUMN public.leads.agendamento_config IS 'Configurações de agendamento online do cliente: modo (avulso/dinamico), datas sugeridas e mes de referencia.';

-- 3. Alterações na tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fonte_personalizada TEXT DEFAULT 'Inter';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tema_personalizado_id UUID REFERENCES public.temas_personalizados(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profiles.fonte_personalizada IS 'Define a fonte de texto personalizada do perfil público.';
COMMENT ON COLUMN public.profiles.tema_personalizado_id IS 'Chave estrangeira para o tema de cores personalizado do perfil.';

-- 4. Criação de políticas de RLS no Supabase

-- Drop policies se já existirem para evitar erro de duplicação
DROP POLICY IF EXISTS "Permitir leitura publica de lead por ID" ON public.leads;
DROP POLICY IF EXISTS "Permitir update publico por token de avaliacao" ON public.leads;
DROP POLICY IF EXISTS "Permitir cliente inserir agendamento" ON public.eventos_agenda;

-- SELECT público na tabela leads para a página pública de agendamento
CREATE POLICY "Permitir leitura publica de lead por ID"
  ON public.leads
  FOR SELECT
  TO anon
  USING (true);

-- UPDATE público na tabela leads para que o cliente anônimo possa finalizar sua avaliação
CREATE POLICY "Permitir update publico por token de avaliacao"
  ON public.leads
  FOR UPDATE
  TO anon
  USING (token_avaliacao IS NOT NULL AND pode_avaliar = true)
  WITH CHECK (true);

-- INSERT público na tabela eventos_agenda para gravar o agendamento
CREATE POLICY "Permitir cliente inserir agendamento"
  ON public.eventos_agenda
  FOR INSERT
  TO anon
  WITH CHECK (true);
