/*
  # Fix Critical Missing Columns
  
  Adds missing columns identified from console errors:
  - profiles.data_expiracao_trial
  - campos.ordem
  - produtos.ordem
  - templates.ocultar_valores_intermediarios
  - templates.texto_whatsapp
  - cupons.ativo
*/

-- Add data_expiracao_trial to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'data_expiracao_trial'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN data_expiracao_trial timestamptz;
    
    UPDATE profiles 
    SET data_expiracao_trial = created_at + INTERVAL '14 days'
    WHERE data_expiracao_trial IS NULL;
    
    RAISE NOTICE '✅ Added data_expiracao_trial to profiles';
  ELSE
    RAISE NOTICE '⏭️ Column data_expiracao_trial already exists in profiles';
  END IF;
END $$;

-- Add ordem to campos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campos' AND column_name = 'ordem'
  ) THEN
    ALTER TABLE campos 
    ADD COLUMN ordem integer DEFAULT 0;
    
    RAISE NOTICE '✅ Added ordem to campos';
  ELSE
    RAISE NOTICE '⏭️ Column ordem already exists in campos';
  END IF;
END $$;

-- Add ordem to produtos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' AND column_name = 'ordem'
  ) THEN
    ALTER TABLE produtos 
    ADD COLUMN ordem integer DEFAULT 0;
    
    RAISE NOTICE '✅ Added ordem to produtos';
  ELSE
    RAISE NOTICE '⏭️ Column ordem already exists in produtos';
  END IF;
END $$;

-- Add ocultar_valores_intermediarios to templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'templates' AND column_name = 'ocultar_valores_intermediarios'
  ) THEN
    ALTER TABLE templates 
    ADD COLUMN ocultar_valores_intermediarios boolean DEFAULT false;
    
    RAISE NOTICE '✅ Added ocultar_valores_intermediarios to templates';
  ELSE
    RAISE NOTICE '⏭️ Column ocultar_valores_intermediarios already exists in templates';
  END IF;
END $$;

-- Add texto_whatsapp to templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'templates' AND column_name = 'texto_whatsapp'
  ) THEN
    ALTER TABLE templates 
    ADD COLUMN texto_whatsapp text;
    
    RAISE NOTICE '✅ Added texto_whatsapp to templates';
  ELSE
    RAISE NOTICE '⏭️ Column texto_whatsapp already exists in templates';
  END IF;
END $$;

-- Add ativo to cupons
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cupons' AND column_name = 'ativo'
  ) THEN
    ALTER TABLE cupons 
    ADD COLUMN ativo boolean DEFAULT true;
    
    RAISE NOTICE '✅ Added ativo to cupons';
  ELSE
    RAISE NOTICE '⏭️ Column ativo already exists in cupons';
  END IF;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ All missing columns have been added!';
  RAISE NOTICE '🔄 Schema cache refreshed';
END $$;