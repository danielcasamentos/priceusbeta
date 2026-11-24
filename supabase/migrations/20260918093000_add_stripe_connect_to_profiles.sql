-- ==========================================================
-- Migration: 20260918093000_add_stripe_connect_to_profiles.sql
-- Adiciona a coluna stripe_connect_account_id na tabela profiles
-- Para permitir que fotógrafos recebam repasses automáticos de fotos extras
-- ==========================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT DEFAULT NULL;

COMMENT ON COLUMN public.profiles.stripe_connect_account_id IS 'ID da conta Stripe Connect Express vinculada ao fotógrafo para repasses automáticos de vendas de fotos.';
