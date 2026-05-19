-- Migration: Adicionar coluna documento_fiscal na tabela de transações
ALTER TABLE company_transactions ADD COLUMN IF NOT EXISTS documento_fiscal TEXT;
