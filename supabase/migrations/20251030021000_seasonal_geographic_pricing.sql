/*
  # Sistema de Preços Sazonais e Geográficos

  1. Novas Tabelas
    - `paises` - Países de atuação
    - `estados` - Estados por país
    - `cidades_ajuste` - Cidades com ajustes de preço
    - `temporadas` - Períodos sazonais com ajustes

  2. Alterações em Templates
    - Adiciona flag para habilitar/desabilitar sistema sazonal
    - Adiciona modal_info_deslocamento (texto explicativo)

  3. Security
    - RLS habilitado em todas as tabelas
    - Políticas de acesso baseadas em user_id
*/

-- Tabela de Países
CREATE TABLE IF NOT EXISTS paises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  codigo_pais text NOT NULL, -- Ex: +55 para Brasil
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de Estados
CREATE TABLE IF NOT EXISTS estados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pais_id uuid REFERENCES paises(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  sigla text NOT NULL, -- Ex: SP, RJ, MG
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de Cidades com Ajuste de Preço
CREATE TABLE IF NOT EXISTS cidades_ajuste (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  estado_id uuid REFERENCES estados(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  ajuste_percentual decimal(5,2) DEFAULT 0, -- Ex: 15.5 = +15.5%
  taxa_deslocamento decimal(10,2) DEFAULT 0, -- Valor fixo em R$
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de Temporadas (Ajustes Sazonais)
CREATE TABLE IF NOT EXISTS temporadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id uuid REFERENCES templates(id) ON DELETE CASCADE,
  nome text NOT NULL, -- Ex: "Alta Temporada", "Baixa Temporada"
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  ajuste_percentual decimal(5,2) DEFAULT 0, -- Ex: 20 = +20%, -10 = -10%
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT temporadas_datas_validas CHECK (data_fim >= data_inicio)
);

-- Adicionar campos ao template para sistema sazonal
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS sistema_sazonal_ativo boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS modal_info_deslocamento text;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_paises_user_id ON paises(user_id);
CREATE INDEX IF NOT EXISTS idx_estados_user_id ON estados(user_id);
CREATE INDEX IF NOT EXISTS idx_estados_pais_id ON estados(pais_id);
CREATE INDEX IF NOT EXISTS idx_cidades_user_id ON cidades_ajuste(user_id);
CREATE INDEX IF NOT EXISTS idx_cidades_estado_id ON cidades_ajuste(estado_id);
CREATE INDEX IF NOT EXISTS idx_temporadas_user_id ON temporadas(user_id);
CREATE INDEX IF NOT EXISTS idx_temporadas_template_id ON temporadas(template_id);
CREATE INDEX IF NOT EXISTS idx_temporadas_datas ON temporadas(data_inicio, data_fim);

-- Habilitar RLS
ALTER TABLE paises ENABLE ROW LEVEL SECURITY;
ALTER TABLE estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE cidades_ajuste ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporadas ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para Países
CREATE POLICY "Usuários podem ver próprios países"
  ON paises FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar próprios países"
  ON paises FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar próprios países"
  ON paises FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar próprios países"
  ON paises FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas de acesso para Estados
CREATE POLICY "Usuários podem ver próprios estados"
  ON estados FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar próprios estados"
  ON estados FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar próprios estados"
  ON estados FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar próprios estados"
  ON estados FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas de acesso para Cidades
CREATE POLICY "Usuários podem ver próprias cidades"
  ON cidades_ajuste FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar próprias cidades"
  ON cidades_ajuste FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar próprias cidades"
  ON cidades_ajuste FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar próprias cidades"
  ON cidades_ajuste FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas de acesso para Temporadas
CREATE POLICY "Usuários podem ver próprias temporadas"
  ON temporadas FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar próprias temporadas"
  ON temporadas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar próprias temporadas"
  ON temporadas FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar próprias temporadas"
  ON temporadas FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Comentários
COMMENT ON TABLE paises IS 'Países de atuação do fotógrafo';
COMMENT ON TABLE estados IS 'Estados dentro de cada país';
COMMENT ON TABLE cidades_ajuste IS 'Cidades com ajustes de preço personalizados';
COMMENT ON TABLE temporadas IS 'Períodos sazonais com ajustes de preço';

COMMENT ON COLUMN templates.sistema_sazonal_ativo IS 'Define se o sistema de ajustes sazonais/geográficos está ativo';
COMMENT ON COLUMN templates.modal_info_deslocamento IS 'Texto explicativo sobre taxas de deslocamento quando sistema sazonal está desabilitado';
