/*
  # Optimize RLS Policies for Performance

  ## Changes
  1. Replace auth.uid() calls with (SELECT auth.uid()) in RLS policies
  2. This prevents re-evaluation of auth functions for each row
  3. Significant performance improvement at scale
  
  ## Tables Optimized
  - cidades_ajuste: "Authenticated users can view cities"
  - estados: "Authenticated users can view states"
  - paises: "Authenticated users can view countries"
  - profiles: "Users can read profiles"
  - temporadas: "Authenticated users can view seasons"
  - Plus all other tables with user_id or template_id relationships

  ## Performance Impact
  - auth.uid() called once per query instead of once per row
  - 10-100x faster for queries returning many rows
  - Reduces CPU usage on database
  - Essential for tables with thousands of rows

  ## Technical Details
  - auth.uid() is a STABLE function, not IMMUTABLE
  - PostgreSQL re-evaluates STABLE functions for each row
  - Wrapping in (SELECT ...) forces single evaluation and plan-time optimization
*/

-- ==============================================
-- OPTIMIZE POLICIES WITH USER_ID
-- ==============================================

-- 1. CIDADES_AJUSTE
DROP POLICY IF EXISTS "Authenticated users can view cities" ON cidades_ajuste;

CREATE POLICY "Authenticated users can view cities"
ON cidades_ajuste FOR SELECT
TO authenticated
USING (
  ativo = true OR 
  user_id = (SELECT auth.uid())
);

-- 2. ESTADOS
DROP POLICY IF EXISTS "Authenticated users can view states" ON estados;

CREATE POLICY "Authenticated users can view states"
ON estados FOR SELECT
TO authenticated
USING (
  ativo = true OR 
  user_id = (SELECT auth.uid())
);

-- 3. PAISES
DROP POLICY IF EXISTS "Authenticated users can view countries" ON paises;

CREATE POLICY "Authenticated users can view countries"
ON paises FOR SELECT
TO authenticated
USING (
  ativo = true OR 
  user_id = (SELECT auth.uid())
);

-- 4. PROFILES
DROP POLICY IF EXISTS "Users can read profiles" ON profiles;

CREATE POLICY "Users can read profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  id = (SELECT auth.uid()) OR TRUE
);

-- 5. TEMPORADAS
DROP POLICY IF EXISTS "Authenticated users can view seasons" ON temporadas;

CREATE POLICY "Authenticated users can view seasons"
ON temporadas FOR SELECT
TO authenticated
USING (
  ativo = true OR 
  user_id = (SELECT auth.uid())
);

-- 6. TEMPLATES
DROP POLICY IF EXISTS "Users can read own templates" ON templates;

CREATE POLICY "Users can read own templates"
ON templates FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- 7. LEADS
DROP POLICY IF EXISTS "Users can read own leads" ON leads;

CREATE POLICY "Users can read own leads"
ON leads FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- 8. FORMAS_PAGAMENTO
DROP POLICY IF EXISTS "Users can read own payment methods" ON formas_pagamento;

CREATE POLICY "Users can read own payment methods"
ON formas_pagamento FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- ==============================================
-- OPTIMIZE POLICIES WITH TEMPLATE_ID (via JOIN)
-- ==============================================

-- 9. PRODUTOS (uses template_id, needs to check via templates table)
DROP POLICY IF EXISTS "Users can read own products" ON produtos;

CREATE POLICY "Users can read own products"
ON produtos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM templates 
    WHERE templates.id = produtos.template_id 
    AND templates.user_id = (SELECT auth.uid())
  )
);

-- 10. CUPONS (uses template_id)
DROP POLICY IF EXISTS "Users can read own coupons" ON cupons;

CREATE POLICY "Users can read own coupons"
ON cupons FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM templates 
    WHERE templates.id = cupons.template_id 
    AND templates.user_id = (SELECT auth.uid())
  )
);

-- 11. ACRESCIMOS_LOCALIDADE (uses template_id)
DROP POLICY IF EXISTS "Users can read own location pricing" ON acrescimos_localidade;

CREATE POLICY "Users can read own location pricing"
ON acrescimos_localidade FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM templates 
    WHERE templates.id = acrescimos_localidade.template_id 
    AND templates.user_id = (SELECT auth.uid())
  )
);

-- 12. ACRESCIMOS_SAZONAIS (uses template_id)
DROP POLICY IF EXISTS "Users can read own seasonal pricing" ON acrescimos_sazonais;

CREATE POLICY "Users can read own seasonal pricing"
ON acrescimos_sazonais FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM templates 
    WHERE templates.id = acrescimos_sazonais.template_id 
    AND templates.user_id = (SELECT auth.uid())
  )
);

-- ==============================================
-- OPTIMIZE UPDATE/INSERT/DELETE POLICIES
-- ==============================================

-- Update policies for templates
DROP POLICY IF EXISTS "Users can update own templates" ON templates;

CREATE POLICY "Users can update own templates"
ON templates FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own templates" ON templates;

CREATE POLICY "Users can delete own templates"
ON templates FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Update policies for profiles
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- Update policies for leads
DROP POLICY IF EXISTS "Users can update own leads" ON leads;

CREATE POLICY "Users can update own leads"
ON leads FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own leads" ON leads;

CREATE POLICY "Users can delete own leads"
ON leads FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));