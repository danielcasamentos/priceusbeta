-- Colunas para a nova funcionalidade de Brindes em templates
ALTER TABLE public.templates 
  ADD COLUMN IF NOT EXISTS brindes_ativo boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS brindes_template_id uuid REFERENCES public.templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS brindes_produtos_ids jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brindes_titulo text DEFAULT 'Brindes Gratuitos',
  ADD COLUMN IF NOT EXISTS brindes_subtitulo text DEFAULT '';

-- Colunas de layout em templates
ALTER TABLE public.templates 
  ADD COLUMN IF NOT EXISTS layout_produtos_desktop text DEFAULT 'linha',
  ADD COLUMN IF NOT EXISTS tamanho_imagem_grid text DEFAULT 'medio';

-- Colunas de configuração de brindes por produto
ALTER TABLE public.produtos 
  ADD COLUMN IF NOT EXISTS brindes_titulo_personalizado text DEFAULT 'Brindes Gratuitos',
  ADD COLUMN IF NOT EXISTS brindes_mostrar_valores boolean DEFAULT true;
