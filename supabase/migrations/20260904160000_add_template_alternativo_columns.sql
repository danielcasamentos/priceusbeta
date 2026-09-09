-- Migration to support Linked Alternative Quote Page ("Monte seu Pacote" / Exit-Intent Offer)
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS template_alternativo_id UUID REFERENCES templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS template_alternativo_ativo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS template_alternativo_titulo TEXT,
ADD COLUMN IF NOT EXISTS template_alternativo_subtitulo TEXT,
ADD COLUMN IF NOT EXISTS template_alternativo_botao_texto TEXT;
