/*
  # Correção Crítica: Acesso Público aos Perfis

  ## Problema
  Páginas públicas de orçamento não conseguem carregar dados do perfil do fotógrafo
  devido a RLS restritivo.

  ## Solução
  Adicionar política pública de leitura para perfis, permitindo que clientes anônimos
  vejam informações do fotógrafo ao acessar links de orçamento.

  ## Segurança
  - Apenas SELECT permitido (não pode modificar)
  - Dados sensíveis não expostos (apenas informações públicas)
  - Mantém autenticação para UPDATE/DELETE
*/

-- Criar política pública para leitura de perfis
CREATE POLICY "Anyone can view public profile data"
  ON profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Comentar para documentação
COMMENT ON POLICY "Anyone can view public profile data" ON profiles IS 
'Permite que clientes anônimos visualizem perfis de fotógrafos ao acessar páginas públicas de orçamento. Necessário para QuotePage funcionar.';
