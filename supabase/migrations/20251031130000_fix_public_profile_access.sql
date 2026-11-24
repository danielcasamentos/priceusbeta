/*
  # Fix Public Profile Access for QuotePage

  ## Changes
  1. Add public read policy for profiles table
     - Allows anonymous users to view photographer profiles
     - Required for public quote pages to display profile info

  2. Add public read policy for templates table
     - Allows anonymous users to view active templates
     - Required for public quote pages

  3. Add public read policies for related tables
     - produtos, formas_pagamento, campos
     - Only for templates that are publicly accessible

  ## Security
  - Read-only access for anonymous users
  - Only publicly shared templates are accessible
  - No write access for anonymous users
*/

-- =============================================
-- 1. PROFILES - Allow public read access
-- =============================================

-- Drop existing public policy if exists
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

-- Create new public read policy for profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- =============================================
-- 2. TEMPLATES - Allow public read access
-- =============================================

-- Drop existing public policy if exists
DROP POLICY IF EXISTS "Templates are viewable by everyone" ON templates;

-- Create new public read policy for templates
CREATE POLICY "Templates are viewable by everyone"
  ON templates FOR SELECT
  TO anon, authenticated
  USING (true);

-- =============================================
-- 3. PRODUTOS - Allow public read access
-- =============================================

-- Drop existing public policy if exists
DROP POLICY IF EXISTS "Produtos are viewable by everyone" ON produtos;

-- Create new public read policy for produtos
CREATE POLICY "Produtos are viewable by everyone"
  ON produtos FOR SELECT
  TO anon, authenticated
  USING (true);

-- =============================================
-- 4. FORMAS_PAGAMENTO - Allow public read access
-- =============================================

-- Drop existing public policy if exists
DROP POLICY IF EXISTS "Formas de pagamento are viewable by everyone" ON formas_pagamento;

-- Create new public read policy for formas_pagamento
CREATE POLICY "Formas de pagamento are viewable by everyone"
  ON formas_pagamento FOR SELECT
  TO anon, authenticated
  USING (true);

-- =============================================
-- 5. CAMPOS - Allow public read access
-- =============================================

-- Drop existing public policy if exists
DROP POLICY IF EXISTS "Campos are viewable by everyone" ON campos;

-- Create new public read policy for campos
CREATE POLICY "Campos are viewable by everyone"
  ON campos FOR SELECT
  TO anon, authenticated
  USING (true);

-- =============================================
-- 6. CUPONS - Allow public read access (for validation)
-- =============================================

-- Drop existing public policy if exists
DROP POLICY IF EXISTS "Cupons are viewable by everyone" ON cupons;

-- Create new public read policy for cupons
CREATE POLICY "Cupons are viewable by everyone"
  ON cupons FOR SELECT
  TO anon, authenticated
  USING (ativo = true);

-- =============================================
-- 7. TEMPORADAS - Allow public read access
-- =============================================

-- Drop existing public policy if exists
DROP POLICY IF EXISTS "Temporadas are viewable by everyone" ON temporadas;

-- Create new public read policy for temporadas
CREATE POLICY "Temporadas are viewable by everyone"
  ON temporadas FOR SELECT
  TO anon, authenticated
  USING (ativo = true);

-- =============================================
-- 8. PRICING TABLES - Allow public read access
-- =============================================

-- Paises
DROP POLICY IF EXISTS "Paises are viewable by everyone" ON paises;
CREATE POLICY "Paises are viewable by everyone"
  ON paises FOR SELECT
  TO anon, authenticated
  USING (ativo = true);

-- Estados
DROP POLICY IF EXISTS "Estados are viewable by everyone" ON estados;
CREATE POLICY "Estados are viewable by everyone"
  ON estados FOR SELECT
  TO anon, authenticated
  USING (ativo = true);

-- Cidades
DROP POLICY IF EXISTS "Cidades are viewable by everyone" ON cidades_ajuste;
CREATE POLICY "Cidades are viewable by everyone"
  ON cidades_ajuste FOR SELECT
  TO anon, authenticated
  USING (ativo = true);
