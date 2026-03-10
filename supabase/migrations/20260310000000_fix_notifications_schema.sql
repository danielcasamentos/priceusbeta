-- Migração para corrigir a tabela de notifications
-- Problema: O código frontend usa is_read, link, related_id mas a tabela usa read, title, data

-- 1. Adicionar colunas que faltam (se não existirem)
-- Migração para corrigir a tabela de notifications
-- Versão simplificada - garante índices e políticas RLS corretos

-- Criar índice para o campo is_read (se não existir)
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Atualizar políticas RLS
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

