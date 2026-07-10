/*
  # Fix Security Issues - Remove Unused Indexes

  ## Changes
  1. Remove unused indexes that are not being utilized by queries
  
  ## Indexes Removed
  - idx_profiles_trial_expiration (profiles table)
  - idx_leads_data_orcamento (leads table)
  - idx_cookies_session_id (cookies_consent table)
  - idx_formas_pagamento_entrada_tipo (formas_pagamento table)
  - idx_acrescimos_localidade_template_id (acrescimos_localidade table)
  - idx_acrescimos_sazonais_template_id (acrescimos_sazonais table)
  - idx_formas_pagamento_user_id (formas_pagamento table)
  - idx_estados_pais_id (estados table)
  - idx_cidades_estado_id (cidades_ajuste table)
  - idx_temporadas_user_id (temporadas table)
  - idx_temporadas_datas (temporadas table)
  - idx_cupons_codigo_ativo (cupons table)
  - idx_cupons_template_ativo (cupons table)

  ## Performance Impact
  - Reduces storage overhead
  - Improves write performance (INSERT, UPDATE, DELETE)
  - No impact on read performance as these indexes were not being used
*/

-- Drop unused indexes if they exist
DROP INDEX IF EXISTS idx_profiles_trial_expiration;
DROP INDEX IF EXISTS idx_leads_data_orcamento;
DROP INDEX IF EXISTS idx_cookies_session_id;
DROP INDEX IF EXISTS idx_formas_pagamento_entrada_tipo;
DROP INDEX IF EXISTS idx_acrescimos_localidade_template_id;
DROP INDEX IF EXISTS idx_acrescimos_sazonais_template_id;
DROP INDEX IF EXISTS idx_formas_pagamento_user_id;
DROP INDEX IF EXISTS idx_estados_pais_id;
DROP INDEX IF EXISTS idx_cidades_estado_id;
DROP INDEX IF EXISTS idx_temporadas_user_id;
DROP INDEX IF EXISTS idx_temporadas_datas;
DROP INDEX IF EXISTS idx_cupons_codigo_ativo;
DROP INDEX IF EXISTS idx_cupons_template_ativo;