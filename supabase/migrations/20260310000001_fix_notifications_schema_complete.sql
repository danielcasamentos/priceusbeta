-- =============================================
-- MIGRAÇÃO COMPLETA PARA CORRIGIR TABELA DE NOTIFICATIONS
-- Problema: Código usa is_read, link, related_id mas tabela tem read, title, data
-- =============================================

-- 1. Adicionar coluna is_read se não existir (mapear de read)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
        ALTER TABLE notifications ADD COLUMN is_read boolean DEFAULT false;
        -- Copiar dados de read para is_read
        UPDATE notifications SET is_read = read WHERE is_read IS NULL OR is_read = false;
    END IF;
END $$;

-- 2. Adicionar coluna link se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'link') THEN
        ALTER TABLE notifications ADD COLUMN link text;
    END IF;
END $$;

-- 3. Adicionar coluna related_id se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'related_id') THEN
        ALTER TABLE notifications ADD COLUMN related_id uuid;
    END IF;
END $$;

-- 4. Remover coluna title se não for necessária (manter para compatibilidade)
-- A tabela original tinha title, mas o código novo usa só message

-- 5. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_related_id ON notifications(related_id);

-- 6. Atualizar políticas RLS
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Garantir que anon e service_role possam inserir via functions
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 8. Atualizar trigger de updated_at (se necessário)
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notifications_updated_at_trigger ON notifications;
CREATE TRIGGER update_notifications_updated_at_trigger
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- 9. Criar view para compatibilidade (opcional - mapeia read para is_read)
-- DROP VIEW IF EXISTS notifications_view;
-- CREATE VIEW notifications_view AS
-- SELECT 
--   id,
--   user_id,
--   COALESCE(title, message) as title,
--   message,
--   type,
--   COALESCE(read, false) as is_read,
--   created_at,
--   updated_at,
--   data,
--   link,
--   related_id
-- FROM notifications;

