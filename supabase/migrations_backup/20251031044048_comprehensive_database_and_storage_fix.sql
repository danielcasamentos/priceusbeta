/*
  # Comprehensive Database and Storage Fix
  
  ## Problem Analysis:
  
  1. CUSTOM FIELDS COLUMNS MISSING:
     - campos_cliente needs campoInserido01-10 columns
     - campos needs campoInserido01-10 columns
     - WhatsApp template editor depends on these for variable system
  
  2. STORAGE BUCKET CONFUSION:
     - 4 buckets: images, photos, product_images, profile_images (all public)
     - Products saved to both product_images AND images
     - Need clear consolidation strategy
  
  3. RLS POLICIES:
     - campos_cliente needs proper policies
     - campos policies need review
  
  4. GEOGRAPHIC/SEASONAL FEATURES:
     - Tables exist but may need enhancements
     - Integration with pricing system
  
  ## Solution Strategy:
  
  1. Add custom field columns (campoInserido01-10) to both tables
  2. Create/fix RLS policies
  3. Enhance geographic/seasonal tables
  4. Document bucket usage strategy
*/

-- =============================================
-- PART 1: ADD CUSTOM FIELD COLUMNS TO CAMPOS_CLIENTE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '📋 PART 1: Adding custom field columns to campos_cliente...';
  
  -- Add campoInserido columns (01 through 10)
  FOR i IN 1..10 LOOP
    DECLARE
      col_name text := 'campo_inserido_' || LPAD(i::text, 2, '0');
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campos_cliente' AND column_name = col_name
      ) THEN
        EXECUTE format('ALTER TABLE campos_cliente ADD COLUMN %I text', col_name);
        RAISE NOTICE '  ✅ Added %', col_name;
      ELSE
        RAISE NOTICE '  ⏭️  Column % already exists', col_name;
      END IF;
    END;
  END LOOP;
  
  -- Add metadata column for better tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campos_cliente' AND column_name = 'campos_metadata'
  ) THEN
    ALTER TABLE campos_cliente ADD COLUMN campos_metadata jsonb DEFAULT '{}'::jsonb;
    COMMENT ON COLUMN campos_cliente.campos_metadata IS 'Metadata about custom fields: labels, types, etc.';
    RAISE NOTICE '  ✅ Added campos_metadata';
  END IF;
  
  RAISE NOTICE '✅ campos_cliente columns updated!';
END $$;

-- =============================================
-- PART 2: ADD CUSTOM FIELD COLUMNS TO CAMPOS
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📝 PART 2: Adding custom field columns to campos...';
  
  -- Add campoInserido columns
  FOR i IN 1..10 LOOP
    DECLARE
      col_name text := 'campo_inserido_' || LPAD(i::text, 2, '0');
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campos' AND column_name = col_name
      ) THEN
        EXECUTE format('ALTER TABLE campos ADD COLUMN %I text', col_name);
        RAISE NOTICE '  ✅ Added %', col_name;
      END IF;
    END;
  END LOOP;
  
  -- Add valor_padrao for default values
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campos' AND column_name = 'valor_padrao'
  ) THEN
    ALTER TABLE campos ADD COLUMN valor_padrao text;
    COMMENT ON COLUMN campos.valor_padrao IS 'Default value for the field';
    RAISE NOTICE '  ✅ Added valor_padrao';
  END IF;
  
  -- Add opcoes for select/radio fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campos' AND column_name = 'opcoes'
  ) THEN
    ALTER TABLE campos ADD COLUMN opcoes jsonb;
    COMMENT ON COLUMN campos.opcoes IS 'Options for select, radio, checkbox fields';
    RAISE NOTICE '  ✅ Added opcoes';
  END IF;
  
  RAISE NOTICE '✅ campos columns updated!';
END $$;

-- =============================================
-- PART 3: FIX RLS POLICIES FOR CAMPOS_CLIENTE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔒 PART 3: Fixing RLS policies for campos_cliente...';
END $$;

-- Enable RLS
ALTER TABLE campos_cliente ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "campos_cliente_public_read" ON campos_cliente;
DROP POLICY IF EXISTS "campos_cliente_owner_all" ON campos_cliente;
DROP POLICY IF EXISTS "campos_cliente_insert" ON campos_cliente;
DROP POLICY IF EXISTS "campos_cliente_select" ON campos_cliente;

-- Policy 1: Template owners can view client data for their templates
CREATE POLICY "campos_cliente_owner_select"
  ON campos_cliente FOR SELECT
  TO authenticated
  USING (
    user_owner_id = (SELECT auth.uid()) OR
    template_id IN (
      SELECT id FROM templates WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy 2: Anyone can INSERT client data (for public quote forms)
CREATE POLICY "campos_cliente_public_insert"
  ON campos_cliente FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy 3: Template owners can UPDATE client data
CREATE POLICY "campos_cliente_owner_update"
  ON campos_cliente FOR UPDATE
  TO authenticated
  USING (
    user_owner_id = (SELECT auth.uid()) OR
    template_id IN (
      SELECT id FROM templates WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    user_owner_id = (SELECT auth.uid()) OR
    template_id IN (
      SELECT id FROM templates WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy 4: Template owners can DELETE client data
CREATE POLICY "campos_cliente_owner_delete"
  ON campos_cliente FOR DELETE
  TO authenticated
  USING (
    user_owner_id = (SELECT auth.uid()) OR
    template_id IN (
      SELECT id FROM templates WHERE user_id = (SELECT auth.uid())
    )
  );

-- =============================================
-- PART 4: ENHANCE GEOGRAPHIC TABLES
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🌍 PART 4: Enhancing geographic tables...';
END $$;

-- Add template_id to cidades_ajuste for template-specific pricing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cidades_ajuste' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE cidades_ajuste ADD COLUMN template_id uuid REFERENCES templates(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_cidades_ajuste_template ON cidades_ajuste(template_id);
    RAISE NOTICE '  ✅ Added template_id to cidades_ajuste';
  END IF;
  
  -- Add multiplicador (percentage adjustment)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cidades_ajuste' AND column_name = 'multiplicador'
  ) THEN
    ALTER TABLE cidades_ajuste ADD COLUMN multiplicador numeric(5,2) DEFAULT 1.0;
    COMMENT ON COLUMN cidades_ajuste.multiplicador IS 'Price multiplier (e.g., 1.15 = 15% increase)';
    RAISE NOTICE '  ✅ Added multiplicador to cidades_ajuste';
  END IF;
  
  -- Add ativo flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cidades_ajuste' AND column_name = 'ativo'
  ) THEN
    ALTER TABLE cidades_ajuste ADD COLUMN ativo boolean DEFAULT true;
    RAISE NOTICE '  ✅ Added ativo to cidades_ajuste';
  END IF;
END $$;

-- Fix RLS for geographic tables
ALTER TABLE cidades_ajuste ENABLE ROW LEVEL SECURITY;
ALTER TABLE estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE paises ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can manage their own data" ON cidades_ajuste;
DROP POLICY IF EXISTS "Users can manage their own data" ON estados;
DROP POLICY IF EXISTS "Users can manage their own data" ON paises;

-- Public read for geographic data (needed for quote forms)
CREATE POLICY "geographic_public_read" ON paises FOR SELECT TO public USING (true);
CREATE POLICY "geographic_public_read" ON estados FOR SELECT TO public USING (true);
CREATE POLICY "geographic_public_read" ON cidades_ajuste FOR SELECT TO public USING (true);

-- Authenticated users can manage their data
CREATE POLICY "paises_owner_all" ON paises FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "estados_owner_all" ON estados FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "cidades_owner_all" ON cidades_ajuste FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- =============================================
-- PART 5: ENHANCE SEASONAL PRICING
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📅 PART 5: Enhancing seasonal pricing...';
END $$;

-- Add columns to temporadas if missing
DO $$
BEGIN
  -- Add ativo flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'temporadas' AND column_name = 'ativo'
  ) THEN
    ALTER TABLE temporadas ADD COLUMN ativo boolean DEFAULT true;
    RAISE NOTICE '  ✅ Added ativo to temporadas';
  END IF;
  
  -- Add descricao
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'temporadas' AND column_name = 'descricao'
  ) THEN
    ALTER TABLE temporadas ADD COLUMN descricao text;
    RAISE NOTICE '  ✅ Added descricao to temporadas';
  END IF;
  
  -- Add cor for visual display
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'temporadas' AND column_name = 'cor'
  ) THEN
    ALTER TABLE temporadas ADD COLUMN cor text DEFAULT '#3B82F6';
    COMMENT ON COLUMN temporadas.cor IS 'Hex color for visual display';
    RAISE NOTICE '  ✅ Added cor to temporadas';
  END IF;
END $$;

-- Fix RLS for temporadas
ALTER TABLE temporadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own data" ON temporadas;
DROP POLICY IF EXISTS "temporadas_public_read" ON temporadas;

-- Public can read active seasons
CREATE POLICY "temporadas_public_read"
  ON temporadas FOR SELECT
  TO public
  USING (ativo = true);

-- Template owners can manage seasons
CREATE POLICY "temporadas_owner_all"
  ON temporadas FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM templates WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT id FROM templates WHERE user_id = (SELECT auth.uid())
    )
  );

-- =============================================
-- PART 6: CREATE LEADS TABLE ENHANCEMENT
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 PART 6: Enhancing leads table...';
END $$;

-- Check if leads table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'leads'
  ) THEN
    -- Create leads table
    CREATE TABLE leads (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id uuid REFERENCES templates(id) ON DELETE CASCADE,
      user_owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
      
      -- Contact info
      nome text NOT NULL,
      email text,
      telefone text,
      
      -- Quote data
      valor_orcamento numeric,
      produtos_selecionados jsonb DEFAULT '[]'::jsonb,
      campos_preenchidos jsonb DEFAULT '{}'::jsonb,
      
      -- Status tracking
      status text DEFAULT 'novo' CHECK (status IN ('novo', 'contatado', 'negociacao', 'convertido', 'perdido')),
      origem text DEFAULT 'orcamento_online',
      
      -- Metadata
      ip_address inet,
      user_agent text,
      utm_source text,
      utm_medium text,
      utm_campaign text,
      
      -- Timestamps
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      contatado_em timestamptz,
      convertido_em timestamptz
    );
    
    -- Indexes for performance
    CREATE INDEX idx_leads_template ON leads(template_id);
    CREATE INDEX idx_leads_owner ON leads(user_owner_id);
    CREATE INDEX idx_leads_status ON leads(status);
    CREATE INDEX idx_leads_created ON leads(created_at DESC);
    
    -- RLS
    ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
    
    -- Anyone can INSERT leads (from public forms)
    CREATE POLICY "leads_public_insert"
      ON leads FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
    
    -- Owners can view their leads
    CREATE POLICY "leads_owner_select"
      ON leads FOR SELECT
      TO authenticated
      USING (
        user_owner_id = (SELECT auth.uid()) OR
        template_id IN (
          SELECT id FROM templates WHERE user_id = (SELECT auth.uid())
        )
      );
    
    -- Owners can update their leads
    CREATE POLICY "leads_owner_update"
      ON leads FOR UPDATE
      TO authenticated
      USING (
        user_owner_id = (SELECT auth.uid()) OR
        template_id IN (
          SELECT id FROM templates WHERE user_id = (SELECT auth.uid())
        )
      )
      WITH CHECK (
        user_owner_id = (SELECT auth.uid()) OR
        template_id IN (
          SELECT id FROM templates WHERE user_id = (SELECT auth.uid())
        )
      );
    
    -- Owners can delete their leads
    CREATE POLICY "leads_owner_delete"
      ON leads FOR DELETE
      TO authenticated
      USING (
        user_owner_id = (SELECT auth.uid()) OR
        template_id IN (
          SELECT id FROM templates WHERE user_id = (SELECT auth.uid())
        )
      );
    
    RAISE NOTICE '  ✅ Created leads table with full functionality';
  ELSE
    RAISE NOTICE '  ⏭️  Leads table already exists';
    
    -- Add missing columns to existing table
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'leads' AND column_name = 'campos_preenchidos'
    ) THEN
      ALTER TABLE leads ADD COLUMN campos_preenchidos jsonb DEFAULT '{}'::jsonb;
      RAISE NOTICE '  ✅ Added campos_preenchidos to leads';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'leads' AND column_name = 'utm_source'
    ) THEN
      ALTER TABLE leads ADD COLUMN utm_source text;
      ALTER TABLE leads ADD COLUMN utm_medium text;
      ALTER TABLE leads ADD COLUMN utm_campaign text;
      RAISE NOTICE '  ✅ Added UTM tracking columns to leads';
    END IF;
  END IF;
END $$;

-- =============================================
-- PART 7: CREATE HELPER FUNCTIONS
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '⚙️  PART 7: Creating helper functions...';
END $$;

-- Function to calculate price with geographic adjustment
CREATE OR REPLACE FUNCTION calcular_preco_com_ajuste_geografico(
  preco_base numeric,
  cidade_nome text,
  template_id_param uuid
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  multiplicador_cidade numeric := 1.0;
BEGIN
  -- Get city multiplier if exists
  SELECT COALESCE(multiplicador, 1.0) INTO multiplicador_cidade
  FROM cidades_ajuste
  WHERE nome ILIKE cidade_nome
    AND (template_id IS NULL OR template_id = template_id_param)
    AND ativo = true
  LIMIT 1;
  
  RETURN preco_base * multiplicador_cidade;
END;
$$;

-- Function to calculate price with seasonal adjustment
CREATE OR REPLACE FUNCTION calcular_preco_com_ajuste_sazonal(
  preco_base numeric,
  data_evento date,
  template_id_param uuid
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  multiplicador_temporada numeric := 1.0;
BEGIN
  -- Get seasonal multiplier if exists
  SELECT COALESCE(multiplicador, 1.0) INTO multiplicador_temporada
  FROM temporadas
  WHERE template_id = template_id_param
    AND data_evento BETWEEN data_inicio AND data_fim
    AND ativo = true
  LIMIT 1;
  
  RETURN preco_base * multiplicador_temporada;
END;
$$;

-- Function to calculate final price with all adjustments
CREATE OR REPLACE FUNCTION calcular_preco_final(
  preco_base numeric,
  cidade_nome text DEFAULT NULL,
  data_evento date DEFAULT NULL,
  template_id_param uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  preco_final numeric := preco_base;
BEGIN
  -- Apply geographic adjustment
  IF cidade_nome IS NOT NULL AND template_id_param IS NOT NULL THEN
    preco_final := calcular_preco_com_ajuste_geografico(preco_final, cidade_nome, template_id_param);
  END IF;
  
  -- Apply seasonal adjustment
  IF data_evento IS NOT NULL AND template_id_param IS NOT NULL THEN
    preco_final := calcular_preco_com_ajuste_sazonal(preco_final, data_evento, template_id_param);
  END IF;
  
  RETURN ROUND(preco_final, 2);
END;
$$;

-- =============================================
-- PART 8: REFRESH SCHEMA AND SUMMARY
-- =============================================

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ COMPREHENSIVE DATABASE FIX COMPLETE!';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 CUSTOM FIELDS:';
  RAISE NOTICE '  ✓ campos_cliente: 10 custom field columns added';
  RAISE NOTICE '  ✓ campos: 10 custom field columns + valor_padrao + opcoes';
  RAISE NOTICE '  ✓ WhatsApp variable system: {{campoInserido01-10}}';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS POLICIES:';
  RAISE NOTICE '  ✓ campos_cliente: 4 policies (public insert + owner access)';
  RAISE NOTICE '  ✓ Geographic tables: Public read + owner management';
  RAISE NOTICE '  ✓ temporadas: Public read active + owner management';
  RAISE NOTICE '  ✓ leads: Public insert + owner full access';
  RAISE NOTICE '';
  RAISE NOTICE '🌍 GEOGRAPHIC FEATURES:';
  RAISE NOTICE '  ✓ cidades_ajuste: template_id, multiplicador, ativo';
  RAISE NOTICE '  ✓ Function: calcular_preco_com_ajuste_geografico()';
  RAISE NOTICE '';
  RAISE NOTICE '📅 SEASONAL FEATURES:';
  RAISE NOTICE '  ✓ temporadas: ativo, descricao, cor';
  RAISE NOTICE '  ✓ Function: calcular_preco_com_ajuste_sazonal()';
  RAISE NOTICE '';
  RAISE NOTICE '📊 LEADS:';
  RAISE NOTICE '  ✓ Full lead tracking system';
  RAISE NOTICE '  ✓ UTM tracking support';
  RAISE NOTICE '  ✓ Status pipeline (novo → convertido)';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️  HELPER FUNCTIONS:';
  RAISE NOTICE '  ✓ calcular_preco_final() - Combined price calculation';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'NEXT: See STORAGE_CONSOLIDATION.md for bucket strategy';
  RAISE NOTICE '====================================================';
END $$;