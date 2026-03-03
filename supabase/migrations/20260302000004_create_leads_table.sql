-- Verificar se a tabela leads já existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leads') THEN
        -- Criar tabela de leads (sem FK obrigatória para templates)
        CREATE TABLE leads (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            template_id UUID,  -- UUID do template (sem FK para evitar erros)
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            
            -- Dados do Cliente (novos nomes de campos)
            client_name TEXT,
            client_email TEXT,
            client_phone TEXT,
            
            -- Dados do Cliente (nomes antigos para compatibilidade)
            nome_cliente TEXT,
            email_cliente TEXT,
            telefone_cliente TEXT,
            
            -- Dados do Evento
            tipo_evento TEXT,
            data_evento DATE,
            cidade_evento TEXT,
            
            -- Orçamento
            valor_total NUMERIC(10,2) DEFAULT 0,
            orcamento_detalhes JSONB DEFAULT '{}',
            url_origem TEXT,
            
            -- Status e Tracking
            status TEXT DEFAULT 'novo',
            origem TEXT DEFAULT 'web',
            session_id TEXT,
            user_agent TEXT,
            tempo_preenchimento_segundos INTEGER,
            
            -- Campos LGPD
            lgpd_consent_timestamp TIMESTAMPTZ,
            lgpd_consent_text TEXT,
            
            -- Timestamps
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Habilitar RLS
        ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
        
        -- Políticas RLS
        CREATE POLICY "Users can view own leads" ON leads
            FOR SELECT
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert leads" ON leads
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own leads" ON leads
            FOR UPDATE
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete own leads" ON leads
            FOR DELETE
            USING (auth.uid() = user_id);
        
        -- Índices para performance
        CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
        CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
        CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
        
        -- Comentário
        COMMENT ON TABLE leads IS 'Tabela de captura de leads e orçamentos';
    END IF;
END $$;

-- Comentário para documentação
COMMENT ON COLUMN leads.status IS 'Status do lead: novo, abandonado, contatado, convertido, perdido';
