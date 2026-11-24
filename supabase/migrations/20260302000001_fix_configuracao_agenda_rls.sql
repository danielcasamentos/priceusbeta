-- supabase/migrations/fix_configuracao_agenda_rls.sql

-- =============================================
-- Correção: Policy RLS para configuracao_agenda
-- Permite leitura anônima para usuários não autenticados
-- =============================================

-- 1. Primeiro, verificar se a tabela existe
DO $$ 
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'configuracao_agenda'
    ) THEN
        -- Drop existing policies that might block access
        DROP POLICY IF EXISTS "Allow public read access" ON configuracao_agenda;
        DROP POLICY IF EXISTS "Allow anon read" ON configuracao_agenda;
        DROP POLICY IF EXISTS "Allow authenticated insert" ON configuracao_agenda;
        
        -- 2. Criar política para permitir leitura anônima (necessário para página pública de orçamento)
        CREATE POLICY "Allow anon read configuracao_agenda" 
        ON configuracao_agenda 
        FOR SELECT 
        TO anon, authenticated 
        USING (true);
        
        -- 3. Criar política para permitir inserção apenas para usuários autenticados
        CREATE POLICY "Allow authenticated insert configuracao_agenda" 
        ON configuracao_agenda 
        FOR INSERT 
        TO authenticated 
        WITH CHECK (auth.uid() = user_id);
        
        -- 4. Criar política para permitir atualização apenas pelo dono
        CREATE POLICY "Allow owner update configuracao_agenda" 
        ON configuracao_agenda 
        FOR UPDATE 
        TO authenticated 
        USING (auth.uid() = user_id) 
        WITH CHECK (auth.uid() = user_id);
        
        RAISE NOTICE 'Policies created successfully for configuracao_agenda';
    ELSE
        RAISE WARNING 'Table configuracao_agenda does not exist';
    END IF;
END $$;

-- =============================================
-- Também criar a tabela se não existir (backup)
-- =============================================
CREATE TABLE IF NOT EXISTS configuracao_agenda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    eventos_max_por_dia INTEGER DEFAULT 1,
    modo_aviso TEXT DEFAULT 'sugestivo' CHECK (modo_aviso IN ('informativo', 'sugestivo', 'restritivo')),
    agenda_ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE configuracao_agenda ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON configuracao_agenda TO authenticated;
GRANT SELECT ON configuracao_agenda TO anon;
GRANT INSERT, UPDATE ON configuracao_agenda TO authenticated;

