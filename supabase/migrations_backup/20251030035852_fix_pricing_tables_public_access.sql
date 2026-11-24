/*
  # Correção: Acesso Público às Tabelas de Preços

  ## Problema
  Sistema de preços geográficos e sazonais não pode ser consultado por usuários anônimos
  que acessam páginas de orçamento.

  ## Solução
  Adicionar políticas SELECT públicas para tabelas de preços

  ## Segurança
  - Apenas leitura (SELECT)
  - Somente dados ativos
  - Modificações requerem autenticação
*/

-- Drop políticas existentes se houver conflito
DROP POLICY IF EXISTS "Anyone can view active countries" ON paises;
DROP POLICY IF EXISTS "Anyone can view active states" ON estados;
DROP POLICY IF EXISTS "Anyone can view active cities with pricing" ON cidades_ajuste;
DROP POLICY IF EXISTS "Anyone can view active seasons" ON temporadas;

-- Políticas para países
CREATE POLICY "Anyone can view active countries"
  ON paises
  FOR SELECT
  TO anon, authenticated
  USING (ativo = true);

-- Políticas para estados
CREATE POLICY "Anyone can view active states"
  ON estados
  FOR SELECT
  TO anon, authenticated
  USING (ativo = true);

-- Políticas para cidades com ajustes
CREATE POLICY "Anyone can view active cities with pricing"
  ON cidades_ajuste
  FOR SELECT
  TO anon, authenticated
  USING (ativo = true);

-- Políticas para temporadas
CREATE POLICY "Anyone can view active seasons"
  ON temporadas
  FOR SELECT
  TO anon, authenticated
  USING (ativo = true);
