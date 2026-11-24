/*
  # Sistema de Feriados - Marcação e Precificação Especial

  ## Descrição
  Sistema para importar e gerenciar feriados brasileiros com suporte a precificação
  diferenciada e marcação visual no calendário.

  ## 1. Nova Tabela
  
  ### feriados
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key -> auth.users)
  - `data` (date) - Data do feriado
  - `nome` (text) - Nome do feriado (ex: "Natal", "Ano Novo")
  - `tipo` (text) - Tipo: 'nacional', 'estadual', 'municipal', 'personalizado'
  - `multiplicador_preco` (decimal) - Multiplicador de preço (ex: 1.5 = +50%)
  - `ativo` (boolean) - Se deve aplicar regras de precificação
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## 2. Security (RLS)
  - RLS habilitado
  - Usuários podem apenas ver/editar seus próprios feriados
  - Políticas separadas para cada operação

  ## 3. Índices
  - Índice em user_id + data para consultas rápidas
  - Índice em data para busca por período

  ## 4. Valores Padrão
  - multiplicador_preco: 1.0 (sem alteração)
  - ativo: true
  - tipo: 'nacional'
*/

-- Criar tabela de feriados
CREATE TABLE IF NOT EXISTS feriados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data date NOT NULL,
  nome text NOT NULL,
  tipo text DEFAULT 'nacional' NOT NULL CHECK (tipo IN ('nacional', 'estadual', 'municipal', 'personalizado')),
  multiplicador_preco decimal(4,2) DEFAULT 1.0 NOT NULL CHECK (multiplicador_preco >= 0.5 AND multiplicador_preco <= 5.0),
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, data)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_feriados_user_id ON feriados(user_id);
CREATE INDEX IF NOT EXISTS idx_feriados_data ON feriados(data);
CREATE INDEX IF NOT EXISTS idx_feriados_user_data ON feriados(user_id, data);
CREATE INDEX IF NOT EXISTS idx_feriados_user_ativo ON feriados(user_id, ativo);

-- Habilitar RLS
ALTER TABLE feriados ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own holidays"
  ON feriados FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own holidays"
  ON feriados FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own holidays"
  ON feriados FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own holidays"
  ON feriados FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_feriados_updated_at ON feriados;
CREATE TRIGGER update_feriados_updated_at
  BEFORE UPDATE ON feriados
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir feriados nacionais brasileiros fixos (exemplo para 2025-2026)
-- Usuários podem importar isso via interface
/*
  Feriados Nacionais Fixos:
  - 01/01: Ano Novo
  - 21/04: Tiradentes
  - 01/05: Dia do Trabalho
  - 07/09: Independência do Brasil
  - 12/10: Nossa Senhora Aparecida
  - 02/11: Finados
  - 15/11: Proclamação da República
  - 25/12: Natal

  Feriados Móveis (variam por ano):
  - Carnaval (47 dias antes da Páscoa)
  - Sexta-feira Santa (2 dias antes da Páscoa)
  - Corpus Christi (60 dias após a Páscoa)
*/
