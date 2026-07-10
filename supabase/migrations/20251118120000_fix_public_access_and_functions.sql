-- 1. Revogar políticas existentes na tabela configuracao_agenda
DROP POLICY IF EXISTS "Users can view own agenda config" ON configuracao_agenda;

-- 2. Conceder acesso público de leitura para configuracao_agenda
CREATE POLICY "Public can view agenda config"
  ON configuracao_agenda FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. Revogar políticas existentes na tabela datas_bloqueadas
DROP POLICY IF EXISTS "Users can view own blocked dates" ON datas_bloqueadas;

-- 4. Conceder acesso público de leitura para datas_bloqueadas
CREATE POLICY "Public can view blocked dates"
  ON datas_bloqueadas FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. Remover a função get_blocked_dates antiga, se existir
DROP FUNCTION IF EXISTS get_blocked_dates(p_user_id uuid);

-- 6. Criar a função get_blocked_dates corrigida
CREATE OR REPLACE FUNCTION get_blocked_dates(p_user_id uuid)
RETURNS SETOF date AS $$
  -- Corrige a coluna "data" para "data_bloqueada"
  SELECT data_bloqueada FROM datas_bloqueadas WHERE user_id = p_user_id;
$$ LANGUAGE sql STABLE;

-- 7. Conceder permissões de execução para a nova função
GRANT EXECUTE ON FUNCTION get_blocked_dates(uuid) TO anon, authenticated;
