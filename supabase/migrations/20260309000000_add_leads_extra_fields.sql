-- Adicionar campos extras à tabela leads se não existirem
DO $$ 
BEGIN
    -- Adicionar campos de evento se não existirem
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'data_evento') THEN
        ALTER TABLE leads ADD COLUMN data_evento DATE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'cidade_evento') THEN
        ALTER TABLE leads ADD COLUMN cidade_evento TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'tipo_evento') THEN
        ALTER TABLE leads ADD COLUMN tipo_evento TEXT;
    END IF;
    
    -- Adicionar campo de dados do formulário se não existir
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'dados_formulario') THEN
        ALTER TABLE leads ADD COLUMN dados_formulario JSONB DEFAULT '{}';
    END IF;
    
    -- Adicionar campo de origem se não existir
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'url_origem') THEN
        ALTER TABLE leads ADD COLUMN url_origem TEXT;
    END IF;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN leads.data_evento IS 'Data do evento selecionado pelo cliente';
COMMENT ON COLUMN leads.cidade_evento IS 'Cidade do evento selecionado pelo cliente';
COMMENT ON COLUMN leads.tipo_evento IS 'Tipo de evento (ex: casamento,formatura)';
COMMENT ON COLUMN leads.dados_formulario IS 'Dados completos do formulário em JSON';
COMMENT ON COLUMN leads.url_origem IS 'URL de origem do lead';

