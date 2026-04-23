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
