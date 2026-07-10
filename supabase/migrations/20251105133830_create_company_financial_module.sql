/*
  # Módulo Financeiro Empresa - Sistema PDV e Gestão

  1. Nova Tabela: company_categories
    - Categorias personalizáveis para receitas e despesas
    - Campos: id, user_id, nome, tipo (receita/despesa), cor
    - Seed com categorias padrão para fotógrafos
    
  2. Nova Tabela: company_transactions
    - Transações financeiras (receitas e despesas)
    - Campos: id, user_id, tipo, origem, descricao, valor, data, status, forma_pagamento
    - Suporte a parcelas via JSONB (flexível)
    - Relacionamento opcional com leads e contratos
    
  3. Views Materializadas
    - company_yearly_metrics - métricas anuais agregadas para performance
    
  4. Segurança
    - RLS completo em todas as tabelas
    - Políticas restritivas por user_id
    - Índices para otimização de queries
*/

-- Criar tabela de categorias
CREATE TABLE IF NOT EXISTS company_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  cor text DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS na tabela de categorias
ALTER TABLE company_categories ENABLE ROW LEVEL SECURITY;

-- Políticas para categorias
CREATE POLICY "Users can view own categories"
  ON company_categories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON company_categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON company_categories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON company_categories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Índice para categorias
CREATE INDEX IF NOT EXISTS idx_company_categories_user_id 
  ON company_categories(user_id);

-- Criar tabela de transações
CREATE TABLE IF NOT EXISTS company_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  origem text NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual', 'lead', 'contrato')),
  descricao text NOT NULL,
  valor decimal(10,2) NOT NULL CHECK (valor > 0),
  data date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  forma_pagamento text,
  categoria_id uuid REFERENCES company_categories(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  contract_id uuid,
  parcelas_info jsonb DEFAULT NULL,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS na tabela de transações
ALTER TABLE company_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para transações
CREATE POLICY "Users can view own transactions"
  ON company_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON company_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON company_transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON company_transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Índices para transações
CREATE INDEX IF NOT EXISTS idx_company_transactions_user_id 
  ON company_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_company_transactions_data 
  ON company_transactions(data DESC);
CREATE INDEX IF NOT EXISTS idx_company_transactions_tipo 
  ON company_transactions(tipo);
CREATE INDEX IF NOT EXISTS idx_company_transactions_status 
  ON company_transactions(status);
CREATE INDEX IF NOT EXISTS idx_company_transactions_categoria 
  ON company_transactions(categoria_id);
CREATE INDEX IF NOT EXISTS idx_company_transactions_lead 
  ON company_transactions(lead_id);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_company_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_company_transactions_updated_at_trigger ON company_transactions;
CREATE TRIGGER update_company_transactions_updated_at_trigger
  BEFORE UPDATE ON company_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_company_transactions_updated_at();

-- View materializada para métricas anuais (performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS company_yearly_metrics AS
SELECT 
  user_id,
  EXTRACT(YEAR FROM data)::integer as year,
  tipo,
  SUM(valor) as total,
  COUNT(*) as quantidade,
  AVG(valor) as media
FROM company_transactions
WHERE status = 'pago'
GROUP BY user_id, year, tipo;

-- Índice para a view materializada
CREATE UNIQUE INDEX IF NOT EXISTS idx_yearly_metrics_unique 
  ON company_yearly_metrics(user_id, year, tipo);

-- Função para refresh automático da view (chamar periodicamente)
CREATE OR REPLACE FUNCTION refresh_company_yearly_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY company_yearly_metrics;
END;
$$ LANGUAGE plpgsql;

-- Seed de categorias padrão para novos usuários
-- Função que será chamada ao criar uma conta
CREATE OR REPLACE FUNCTION seed_default_company_categories(p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Categorias de Receita
  INSERT INTO company_categories (user_id, nome, tipo, cor) VALUES
    (p_user_id, 'Casamento', 'receita', '#22c55e'),
    (p_user_id, 'Ensaio Fotográfico', 'receita', '#3b82f6'),
    (p_user_id, 'Evento Corporativo', 'receita', '#8b5cf6'),
    (p_user_id, 'Book Profissional', 'receita', '#06b6d4'),
    (p_user_id, 'Produto/Fotografia Comercial', 'receita', '#f59e0b'),
    (p_user_id, 'Outros Serviços', 'receita', '#6366f1');
  
  -- Categorias de Despesa
  INSERT INTO company_categories (user_id, nome, tipo, cor) VALUES
    (p_user_id, 'Equipamentos', 'despesa', '#ef4444'),
    (p_user_id, 'Marketing e Publicidade', 'despesa', '#ec4899'),
    (p_user_id, 'Transporte', 'despesa', '#f97316'),
    (p_user_id, 'Alimentação', 'despesa', '#84cc16'),
    (p_user_id, 'Softwares e Ferramentas', 'despesa', '#0ea5e9'),
    (p_user_id, 'Aluguel/Espaço', 'despesa', '#a855f7'),
    (p_user_id, 'Impostos e Taxas', 'despesa', '#78716c'),
    (p_user_id, 'Outros Custos', 'despesa', '#64748b');
END;
$$ LANGUAGE plpgsql;
