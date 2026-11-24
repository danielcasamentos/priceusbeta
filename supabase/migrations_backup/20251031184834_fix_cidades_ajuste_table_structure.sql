/*
  # Fix cidades_ajuste Table Structure
  
  ## Problem:
  - Table cidades_ajuste is missing columns that the frontend expects
  - Frontend tries to insert: ajuste_percentual, taxa_deslocamento
  - Table only has: valor_ajuste, multiplicador
  
  ## Solution:
  - Add missing columns with proper types
  - Keep existing columns for backward compatibility
  - Add proper defaults
*/

-- Add ajuste_percentual column (percentage adjustment for city)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'cidades_ajuste' 
    AND column_name = 'ajuste_percentual'
  ) THEN
    ALTER TABLE cidades_ajuste ADD COLUMN ajuste_percentual numeric(5,2) DEFAULT 0;
    COMMENT ON COLUMN cidades_ajuste.ajuste_percentual IS 'Percentage adjustment for this city (e.g., 15 = +15%)';
  END IF;
END $$;

-- Add taxa_deslocamento column (flat rate travel fee)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'cidades_ajuste' 
    AND column_name = 'taxa_deslocamento'
  ) THEN
    ALTER TABLE cidades_ajuste ADD COLUMN taxa_deslocamento numeric(10,2) DEFAULT 0;
    COMMENT ON COLUMN cidades_ajuste.taxa_deslocamento IS 'Flat rate travel fee for this city in currency';
  END IF;
END $$;

-- Ensure ativo column exists with proper default
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'cidades_ajuste' 
    AND column_name = 'ativo'
  ) THEN
    ALTER TABLE cidades_ajuste ADD COLUMN ativo boolean DEFAULT true;
  END IF;
END $$;

-- Set default for existing ativo column
ALTER TABLE cidades_ajuste ALTER COLUMN ativo SET DEFAULT true;

-- Migrate old data if needed (valor_ajuste -> ajuste_percentual)
UPDATE cidades_ajuste 
SET ajuste_percentual = valor_ajuste 
WHERE ajuste_percentual IS NULL AND valor_ajuste IS NOT NULL;

-- Add helpful comment to table
COMMENT ON TABLE cidades_ajuste IS 'Geographic pricing adjustments per city. ajuste_percentual = percentage adjustment, taxa_deslocamento = flat travel fee';

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ Table cidades_ajuste structure fixed successfully!';
  RAISE NOTICE '  - Added: ajuste_percentual (percentage adjustment)';
  RAISE NOTICE '  - Added: taxa_deslocamento (flat travel fee)';
  RAISE NOTICE '  - Ensured: ativo column with default true';
END $$;