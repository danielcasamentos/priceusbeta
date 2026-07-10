/*
  # Sistema de Agenda - Verificação de Disponibilidade

  ## Descrição
  Sistema completo de gerenciamento de agenda com verificação de disponibilidade de datas,
  controle de eventos múltiplos por dia e bloqueio manual de datas.

  ## 1. Novas Tabelas
  
  ### configuracao_agenda
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key -> auth.users)
  - `eventos_max_por_dia` (integer) - Quantidade máxima de eventos por dia
  - `modo_aviso` (text) - Como avisar cliente: 'informativo', 'sugestivo', 'restritivo'
  - `agenda_ativa` (boolean) - Sistema de verificação ativo/inativo
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### eventos_agenda
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key -> auth.users)
  - `data_evento` (date) - Data do evento
  - `tipo_evento` (text) - Tipo: 'casamento', 'ensaio', 'corporativo', etc
  - `cliente_nome` (text) - Nome do cliente
  - `cidade` (text) - Cidade do evento
  - `status` (text) - Status: 'confirmado', 'pendente', 'concluido', 'cancelado'
  - `origem` (text) - Origem: 'manual', 'csv_import', 'lead_confirmado'
  - `observacoes` (text) - Observações adicionais
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### datas_bloqueadas
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key -> auth.users)
  - `data_bloqueada` (date) - Data bloqueada
  - `motivo` (text) - Motivo do bloqueio: 'Férias', 'Viagem', 'Pessoal', 'Outro'
  - `descricao` (text) - Descrição adicional
  - `created_at` (timestamptz)

  ## 2. Security (RLS)
  - Todas as tabelas têm RLS habilitado
  - Usuários autenticados podem apenas acessar seus próprios dados
  - Políticas separadas para SELECT, INSERT, UPDATE, DELETE

  ## 3. Índices
  - Índices em user_id para melhor performance
  - Índice em data_evento para consultas rápidas
  - Índice em data_bloqueada para verificações rápidas

  ## 4. Valores Padrão
  - eventos_max_por_dia: 1
  - modo_aviso: 'sugestivo'
  - agenda_ativa: true
  - status eventos: 'pendente'
  - origem eventos: 'manual'
*/

-- Criar tabela de configuração da agenda
CREATE TABLE IF NOT EXISTS configuracao_agenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  eventos_max_por_dia integer DEFAULT 1 NOT NULL CHECK (eventos_max_por_dia >= 1 AND eventos_max_por_dia <= 10),
  modo_aviso text DEFAULT 'sugestivo' NOT NULL CHECK (modo_aviso IN ('informativo', 'sugestivo', 'restritivo')),
  agenda_ativa boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Criar tabela de eventos da agenda
CREATE TABLE IF NOT EXISTS eventos_agenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data_evento date NOT NULL,
  tipo_evento text DEFAULT 'evento' NOT NULL,
  cliente_nome text DEFAULT '' NOT NULL,
  cidade text DEFAULT '',
  status text DEFAULT 'pendente' NOT NULL CHECK (status IN ('confirmado', 'pendente', 'concluido', 'cancelado')),
  origem text DEFAULT 'manual' NOT NULL CHECK (origem IN ('manual', 'csv_import', 'lead_confirmado')),
  observacoes text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Criar tabela de datas bloqueadas
CREATE TABLE IF NOT EXISTS datas_bloqueadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data_bloqueada date NOT NULL,
  motivo text DEFAULT 'Outro' NOT NULL CHECK (motivo IN ('Férias', 'Viagem', 'Pessoal', 'Outro')),
  descricao text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, data_bloqueada)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_configuracao_agenda_user_id ON configuracao_agenda(user_id);
CREATE INDEX IF NOT EXISTS idx_eventos_agenda_user_id ON eventos_agenda(user_id);
CREATE INDEX IF NOT EXISTS idx_eventos_agenda_data_evento ON eventos_agenda(data_evento);
CREATE INDEX IF NOT EXISTS idx_eventos_agenda_user_data ON eventos_agenda(user_id, data_evento);
CREATE INDEX IF NOT EXISTS idx_datas_bloqueadas_user_id ON datas_bloqueadas(user_id);
CREATE INDEX IF NOT EXISTS idx_datas_bloqueadas_data ON datas_bloqueadas(data_bloqueada);
CREATE INDEX IF NOT EXISTS idx_datas_bloqueadas_user_data ON datas_bloqueadas(user_id, data_bloqueada);

-- Habilitar RLS em todas as tabelas
ALTER TABLE configuracao_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE datas_bloqueadas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para configuracao_agenda
CREATE POLICY "Users can view own agenda config"
  ON configuracao_agenda FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agenda config"
  ON configuracao_agenda FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agenda config"
  ON configuracao_agenda FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own agenda config"
  ON configuracao_agenda FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas RLS para eventos_agenda
CREATE POLICY "Users can view own events"
  ON eventos_agenda FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events"
  ON eventos_agenda FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
  ON eventos_agenda FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
  ON eventos_agenda FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas RLS para datas_bloqueadas
CREATE POLICY "Users can view own blocked dates"
  ON datas_bloqueadas FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own blocked dates"
  ON datas_bloqueadas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own blocked dates"
  ON datas_bloqueadas FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own blocked dates"
  ON datas_bloqueadas FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_configuracao_agenda_updated_at ON configuracao_agenda;
CREATE TRIGGER update_configuracao_agenda_updated_at
  BEFORE UPDATE ON configuracao_agenda
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_eventos_agenda_updated_at ON eventos_agenda;
CREATE TRIGGER update_eventos_agenda_updated_at
  BEFORE UPDATE ON eventos_agenda
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
