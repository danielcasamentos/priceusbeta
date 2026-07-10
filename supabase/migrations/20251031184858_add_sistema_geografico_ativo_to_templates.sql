/*
  # Add Independent Geographic System Toggle
  
  ## Problem:
  - Currently only sistema_sazonal_ativo exists
  - Both seasonal and geographic pricing controlled by same toggle
  - User needs separate control for each system
  
  ## Solution:
  - Add sistema_geografico_ativo column to templates table
  - Allow independent activation of seasonal vs geographic pricing
  - Default to false for new templates
*/

-- Add sistema_geografico_ativo column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'templates' 
    AND column_name = 'sistema_geografico_ativo'
  ) THEN
    ALTER TABLE templates ADD COLUMN sistema_geografico_ativo boolean DEFAULT false;
    COMMENT ON COLUMN templates.sistema_geografico_ativo IS 'Enable/disable geographic pricing adjustments (cities, states, countries)';
  END IF;
END $$;

-- Update existing templates to enable geographic system if seasonal was enabled
-- (backward compatibility - if they had seasonal active, they probably want geographic too)
UPDATE templates 
SET sistema_geografico_ativo = sistema_sazonal_ativo 
WHERE sistema_geografico_ativo IS NULL;

-- Add comment to seasonal column for clarity
COMMENT ON COLUMN templates.sistema_sazonal_ativo IS 'Enable/disable seasonal pricing adjustments (date-based pricing)';

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ Added sistema_geografico_ativo to templates table!';
  RAISE NOTICE '  - Templates can now independently control:';
  RAISE NOTICE '    • sistema_sazonal_ativo (seasonal/date-based pricing)';
  RAISE NOTICE '    • sistema_geografico_ativo (geographic/location-based pricing)';
END $$;