/*
  # Optimize Mobile Performance

  ## Changes
  - Add composite indexes for common mobile query patterns
  - Optimize template lookups by UUID and slug
  - Speed up profile queries for public pages

  ## Performance Impact
  - Faster template loading on mobile devices
  - Reduced query time for Instagram/mobile browsers
  - Better response times on slow connections
*/

-- Add index for template UUID lookups (most common on mobile)
CREATE INDEX IF NOT EXISTS idx_templates_uuid
  ON templates(uuid)
  WHERE uuid IS NOT NULL;

-- Add composite index for slug-based lookups
CREATE INDEX IF NOT EXISTS idx_templates_user_slug
  ON templates(user_id, slug_template)
  WHERE slug_template IS NOT NULL;

-- Add index for public profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_slug_usuario
  ON profiles(slug_usuario)
  WHERE slug_usuario IS NOT NULL;

-- Add index for active profiles with public flag
CREATE INDEX IF NOT EXISTS idx_profiles_public_active
  ON profiles(id, slug_usuario)
  WHERE perfil_publico = true;

-- Optimize produto queries for templates
CREATE INDEX IF NOT EXISTS idx_produtos_template_ordem
  ON produtos(template_id, ordem);

-- Optimize formas_pagamento queries
CREATE INDEX IF NOT EXISTS idx_formas_pagamento_template
  ON formas_pagamento(template_id);

-- Optimize campos queries
CREATE INDEX IF NOT EXISTS idx_campos_template_ordem
  ON campos(template_id, ordem);

-- Optimize geographic pricing queries
CREATE INDEX IF NOT EXISTS idx_cidades_estado_ativo
  ON cidades_ajuste(estado_id, ativo)
  WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_estados_pais_ativo
  ON estados(pais_id, ativo)
  WHERE ativo = true;

-- Optimize seasonal pricing queries
CREATE INDEX IF NOT EXISTS idx_temporadas_template_dates
  ON temporadas(template_id, data_inicio, data_fim)
  WHERE ativo = true;

-- Add analytics optimization
CREATE INDEX IF NOT EXISTS idx_analytics_template_created
  ON analytics_orcamentos(template_id, created_at DESC);
