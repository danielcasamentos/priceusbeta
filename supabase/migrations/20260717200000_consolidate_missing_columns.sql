-- Migration: Consolidar todas as colunas novas que podem não ter sido aplicadas no banco remoto
-- Inclui: brindes, layout, brindes por produto, expiração, e texto_botao_submit

-- 1. Colunas de brindes no template
ALTER TABLE public.templates 
  ADD COLUMN IF NOT EXISTS brindes_ativo boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS brindes_template_id uuid REFERENCES public.templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS brindes_produtos_ids jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brindes_titulo text DEFAULT 'Brindes Gratuitos',
  ADD COLUMN IF NOT EXISTS brindes_subtitulo text DEFAULT '';

-- 2. Colunas de layout e aparência no template
ALTER TABLE public.templates 
  ADD COLUMN IF NOT EXISTS layout_produtos_desktop text DEFAULT 'linha',
  ADD COLUMN IF NOT EXISTS tamanho_imagem_grid text DEFAULT 'medio',
  ADD COLUMN IF NOT EXISTS texto_botao_submit text DEFAULT 'Negociar no WhatsApp';

-- 3. Colunas de configuração de brindes por produto
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS brindes_vinculados jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brindes_titulo_personalizado text DEFAULT 'Brindes Gratuitos',
  ADD COLUMN IF NOT EXISTS brindes_mostrar_valores boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS brindes_expira boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS brindes_expira_tipo text DEFAULT 'dias',
  ADD COLUMN IF NOT EXISTS brindes_expira_dias integer DEFAULT 7,
  ADD COLUMN IF NOT EXISTS brindes_expira_data timestamp with time zone DEFAULT NULL;
