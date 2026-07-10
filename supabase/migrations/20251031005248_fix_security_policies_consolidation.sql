/*
  # Fix Security Issues - Consolidate Multiple Permissive Policies

  ## Changes
  1. Remove duplicate permissive policies for SELECT operations
  2. Keep only one comprehensive policy per table per action
  
  ## Tables Fixed
  - cidades_ajuste: Consolidated SELECT policies
  - estados: Consolidated SELECT policies
  - paises: Consolidated SELECT policies
  - profiles: Consolidated SELECT policies
  - temporadas: Consolidated SELECT policies

  ## Security Impact
  - Simplifies policy evaluation (better performance)
  - Maintains same access level
  - Reduces policy conflicts
  - Improves maintainability
*/

-- ==============================================
-- 1. CIDADES_AJUSTE: Consolidate SELECT policies
-- ==============================================
DROP POLICY IF EXISTS "Anyone can view active cities with pricing" ON cidades_ajuste;
DROP POLICY IF EXISTS "Usuários podem ver próprias cidades" ON cidades_ajuste;

CREATE POLICY "Authenticated users can view cities"
ON cidades_ajuste FOR SELECT
TO authenticated
USING (
  ativo = true OR 
  user_id = auth.uid()
);

-- ==============================================
-- 2. ESTADOS: Consolidate SELECT policies
-- ==============================================
DROP POLICY IF EXISTS "Anyone can view active states" ON estados;
DROP POLICY IF EXISTS "Usuários podem ver próprios estados" ON estados;

CREATE POLICY "Authenticated users can view states"
ON estados FOR SELECT
TO authenticated
USING (
  ativo = true OR 
  user_id = auth.uid()
);

-- ==============================================
-- 3. PAISES: Consolidate SELECT policies
-- ==============================================
DROP POLICY IF EXISTS "Anyone can view active countries" ON paises;
DROP POLICY IF EXISTS "Usuários podem ver próprios países" ON paises;

CREATE POLICY "Authenticated users can view countries"
ON paises FOR SELECT
TO authenticated
USING (
  ativo = true OR 
  user_id = auth.uid()
);

-- ==============================================
-- 4. PROFILES: Consolidate SELECT policies
-- ==============================================
DROP POLICY IF EXISTS "Anyone can view public profile data" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

CREATE POLICY "Users can read profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  -- Users can see their own profile
  id = auth.uid() OR
  -- OR they can see public profile data (for quote pages)
  TRUE
);

-- ==============================================
-- 5. TEMPORADAS: Consolidate SELECT policies
-- ==============================================
DROP POLICY IF EXISTS "Anyone can view active seasons" ON temporadas;
DROP POLICY IF EXISTS "Usuários podem ver próprias temporadas" ON temporadas;

CREATE POLICY "Authenticated users can view seasons"
ON temporadas FOR SELECT
TO authenticated
USING (
  ativo = true OR 
  user_id = auth.uid()
);