/*
  # Add ativo column to geographic tables
  
  ## Problem:
  - Frontend queries paises and estados with filter ativo=eq.true
  - Column 'ativo' does not exist in these tables
  - Causing 400 errors: "column paises.ativo does not exist"
  
  ## Solution:
  - Add ativo column to paises table
  - Add ativo column to estados table
  - Set default to true for new records
*/

-- Add ativo column to paises table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'paises' 
    AND column_name = 'ativo'
  ) THEN
    ALTER TABLE paises ADD COLUMN ativo boolean DEFAULT true;
    
    -- Update existing records to be active by default
    UPDATE paises SET ativo = true WHERE ativo IS NULL;
    
    -- Make it NOT NULL after setting defaults
    ALTER TABLE paises ALTER COLUMN ativo SET NOT NULL;
    
    COMMENT ON COLUMN paises.ativo IS 'Whether this country is active/enabled';
    
    RAISE NOTICE '✅ Column ativo added to paises table';
  END IF;
END $$;

-- Add ativo column to estados table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'estados' 
    AND column_name = 'ativo'
  ) THEN
    ALTER TABLE estados ADD COLUMN ativo boolean DEFAULT true;
    
    -- Update existing records to be active by default
    UPDATE estados SET ativo = true WHERE ativo IS NULL;
    
    -- Make it NOT NULL after setting defaults
    ALTER TABLE estados ALTER COLUMN ativo SET NOT NULL;
    
    COMMENT ON COLUMN estados.ativo IS 'Whether this state/province is active/enabled';
    
    RAISE NOTICE '✅ Column ativo added to estados table';
  END IF;
END $$;