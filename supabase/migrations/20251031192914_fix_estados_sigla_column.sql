/*
  # Fix estados table - Add sigla column
  
  ## Problem:
  - Frontend expects 'sigla' column in estados table
  - Table only has 'codigo' column
  - Causing PGRST204 errors
  
  ## Solution:
  - Add 'sigla' column as alias/copy of 'codigo'
  - Or rename 'codigo' to 'sigla' (safer to add new column)
  - Migrate existing data
*/

-- Add sigla column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'estados' 
    AND column_name = 'sigla'
  ) THEN
    -- Add sigla column
    ALTER TABLE estados ADD COLUMN sigla varchar(10);
    
    -- Copy data from codigo to sigla for existing records
    UPDATE estados SET sigla = codigo WHERE sigla IS NULL;
    
    -- Make sigla NOT NULL after migration
    ALTER TABLE estados ALTER COLUMN sigla SET NOT NULL;
    
    -- Add comment
    COMMENT ON COLUMN estados.sigla IS 'State/Province abbreviation (e.g., SP, RJ, CA)';
    
    RAISE NOTICE '✅ Column sigla added to estados table and data migrated';
  ELSE
    RAISE NOTICE 'ℹ️ Column sigla already exists in estados table';
  END IF;
END $$;