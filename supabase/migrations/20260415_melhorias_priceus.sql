-- Migration: Melhorias Priceus: Agenda em Templates e Carrossel de Produtos
-- Data: 2026-04-15

-- 1. Adicionar coluna para ignorar a obrigatoriedade da data (Agenda Global) no Template
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS ignorar_agenda_global BOOLEAN DEFAULT false;

-- 2. Adicionar suporte a múltiplas imagens e carrossel automático no Produto
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS imagens TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS carrossel_automatico BOOLEAN DEFAULT false;
