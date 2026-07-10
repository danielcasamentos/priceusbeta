/*
  # Add Indexes for Foreign Keys

  ## Changes
  1. Add covering indexes for all unindexed foreign keys
  2. Improves JOIN performance and referential integrity checks
  
  ## Indexes Added
  - idx_acrescimos_localidade_template_id (acrescimos_localidade.template_id)
  - idx_acrescimos_sazonais_template_id (acrescimos_sazonais.template_id)
  - idx_cidades_ajuste_estado_id (cidades_ajuste.estado_id)
  - idx_estados_pais_id (estados.pais_id)
  - idx_formas_pagamento_user_id (formas_pagamento.user_id)
  - idx_temporadas_user_id (temporadas.user_id)

  ## Performance Impact
  - Significantly improves JOIN operations
  - Faster foreign key constraint checks
  - Better query planner decisions
  - Essential for tables with many rows
*/

-- Create indexes for foreign keys (IF NOT EXISTS to be safe)

-- 1. acrescimos_localidade.template_id
CREATE INDEX IF NOT EXISTS idx_acrescimos_localidade_template_id 
ON acrescimos_localidade(template_id);

-- 2. acrescimos_sazonais.template_id
CREATE INDEX IF NOT EXISTS idx_acrescimos_sazonais_template_id 
ON acrescimos_sazonais(template_id);

-- 3. cidades_ajuste.estado_id
CREATE INDEX IF NOT EXISTS idx_cidades_ajuste_estado_id 
ON cidades_ajuste(estado_id);

-- 4. estados.pais_id
CREATE INDEX IF NOT EXISTS idx_estados_pais_id 
ON estados(pais_id);

-- 5. formas_pagamento.user_id
CREATE INDEX IF NOT EXISTS idx_formas_pagamento_user_id 
ON formas_pagamento(user_id);

-- 6. temporadas.user_id
CREATE INDEX IF NOT EXISTS idx_temporadas_user_id 
ON temporadas(user_id);

-- Add comments explaining the indexes
COMMENT ON INDEX idx_acrescimos_localidade_template_id IS 'Improves JOIN performance with templates table';
COMMENT ON INDEX idx_acrescimos_sazonais_template_id IS 'Improves JOIN performance with templates table';
COMMENT ON INDEX idx_cidades_ajuste_estado_id IS 'Improves JOIN performance with estados table';
COMMENT ON INDEX idx_estados_pais_id IS 'Improves JOIN performance with paises table';
COMMENT ON INDEX idx_formas_pagamento_user_id IS 'Improves filtering by user_id and JOIN performance';
COMMENT ON INDEX idx_temporadas_user_id IS 'Improves filtering by user_id and JOIN performance';