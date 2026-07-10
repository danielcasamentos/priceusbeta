/*
  # Enhance Cupons Table
  
  ## Changes
  
  1. Add New Columns
    - tipo_desconto: ENUM to specify if discount is percentage or fixed value
    - valor_fixo: Fixed discount value (when tipo_desconto = 'valor_fixo')
    - limite_uso: Maximum number of times coupon can be used
    - uso_atual: Current usage count
    - descricao: Optional description for the coupon
  
  2. Modify Existing Columns
    - Make porcentagem nullable (only used when tipo_desconto = 'percentual')
  
  ## Notes
  - Preserves all existing data and logic
  - Maintains backwards compatibility
  - tipo_desconto defaults to 'percentual' for existing coupons
*/

-- Create ENUM type for discount type
DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('percentual', 'valor_fixo');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to cupons table
ALTER TABLE cupons 
  ADD COLUMN IF NOT EXISTS tipo_desconto discount_type DEFAULT 'percentual',
  ADD COLUMN IF NOT EXISTS valor_fixo NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS limite_uso INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS uso_atual INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descricao TEXT DEFAULT '';

-- Make porcentagem nullable for valor_fixo coupons
ALTER TABLE cupons 
  ALTER COLUMN porcentagem DROP NOT NULL;

-- Update existing cupons to have tipo_desconto = 'percentual'
UPDATE cupons 
SET tipo_desconto = 'percentual'
WHERE tipo_desconto IS NULL;

-- Add check constraint to ensure either porcentagem or valor_fixo is set
ALTER TABLE cupons
  DROP CONSTRAINT IF EXISTS cupons_discount_check;

ALTER TABLE cupons
  ADD CONSTRAINT cupons_discount_check CHECK (
    (tipo_desconto = 'percentual' AND porcentagem > 0) OR
    (tipo_desconto = 'valor_fixo' AND valor_fixo > 0)
  );

-- Add check constraint for usage limit
ALTER TABLE cupons
  DROP CONSTRAINT IF EXISTS cupons_usage_check;

ALTER TABLE cupons
  ADD CONSTRAINT cupons_usage_check CHECK (
    limite_uso IS NULL OR uso_atual <= limite_uso
  );

-- Create index for faster coupon lookups by code
CREATE INDEX IF NOT EXISTS idx_cupons_codigo_ativo 
ON cupons(codigo, ativo) 
WHERE ativo = true;

-- Create index for coupon usage tracking
CREATE INDEX IF NOT EXISTS idx_cupons_template_ativo 
ON cupons(template_id, ativo) 
WHERE ativo = true;
