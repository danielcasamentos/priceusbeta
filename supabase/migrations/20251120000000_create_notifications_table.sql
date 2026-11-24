/*
  # Sistema de Notificações

  ## Objetivo
  Criar tabela de notificações para o sistema Priceus, permitindo notificações personalizadas
  para usuários sobre eventos importantes da plataforma.

  ## Tabela Criada

  ### notifications
  - Notificações personalizadas para usuários
  - Tipos: info, warning, success, error, trial
  - Controle de leitura
  - Dados adicionais opcionais em JSON

  ## Segurança
  - RLS habilitado
  - Usuários só acessam suas próprias notificações
*/

-- =============================================
-- TABELA DE NOTIFICAÇÕES
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error', 'trial')),
  read boolean DEFAULT false,
  data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver suas próprias notificações
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política: Sistema pode inserir notificações (para funções)
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Usuários podem atualizar suas próprias notificações (marcar como lida)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem deletar suas próprias notificações
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- TRIGGER PARA UPDATED_AT
-- =============================================
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

-- =============================================
-- FUNÇÃO PARA MARCAR NOTIFICAÇÃO COMO LIDA
-- =============================================
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id_param uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE notifications
  SET read = true, updated_at = now()
  WHERE id = notification_id_param
    AND user_id = auth.uid();

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNÇÃO PARA MARCAR TODAS AS NOTIFICAÇÕES COMO LIDAS
-- =============================================
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS integer AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE notifications
  SET read = true, updated_at = now()
  WHERE user_id = auth.uid()
    AND read = false;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNÇÃO PARA CRIAR NOTIFICAÇÃO
-- =============================================
CREATE OR REPLACE FUNCTION create_notification(
  user_id_param uuid,
  title_param text,
  message_param text,
  type_param text DEFAULT 'info',
  data_param jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (user_id_param, title_param, message_param, type_param, data_param)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
