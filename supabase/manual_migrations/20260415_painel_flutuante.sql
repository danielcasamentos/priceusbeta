-- Migration: Adicionar controle de exibição do painel flutuante de total

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS exibir_painel_flutuante boolean DEFAULT true;
