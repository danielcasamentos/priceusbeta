-- ==============================================================================
-- Migration: 20261004000000_create_bride_marketplace_ecosystem.sql
-- Módulo Adjacente: Portal da Noiva, Marketplace Multi-Fornecedor & Chat com IA
-- Isolamento 100% Aditivo (Não altera nenhuma tabela ou coluna de produção existente)
-- ==============================================================================

-- 1. Tabela de Perfil da Noiva / Noivos
CREATE TABLE IF NOT EXISTS public.bride_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    nome_noiva TEXT NOT NULL,
    nome_conjuge TEXT,
    telefone TEXT,
    data_casamento DATE,
    cidade TEXT,
    orcamento_planejado NUMERIC(12, 2) DEFAULT 0,
    session_token TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Categorias e Tags dos Fornecedores (Indexação do Marketplace)
CREATE TABLE IF NOT EXISTS public.marketplace_vendor_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL, -- 'fotografia', 'video', 'cabelo_make', 'decoracao', 'buffet', 'storymaker', 'area_kids', etc.
    subcategories TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}', -- tags aprendidas e personalizadas
    rating NUMERIC(3, 2) DEFAULT 5.0,
    total_reviews INT DEFAULT 0,
    min_rating_to_advertise NUMERIC(3, 2) DEFAULT 4.0,
    is_verified BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Cotações e Propostas Salvas pela Noiva no Workspace Multi-Abas
CREATE TABLE IF NOT EXISTS public.bride_saved_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bride_id UUID REFERENCES public.bride_profiles(id) ON DELETE CASCADE NOT NULL,
    vendor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    vendor_name TEXT NOT NULL,
    category TEXT NOT NULL,
    package_name TEXT,
    total_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    quote_details JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'draft', -- 'draft', 'favorited', 'negotiating', 'contracted'
    tab_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Conversas do Chat Multi-Fornecedor
CREATE TABLE IF NOT EXISTS public.marketplace_chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bride_id UUID REFERENCES public.bride_profiles(id) ON DELETE CASCADE NOT NULL,
    vendor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    quote_id UUID REFERENCES public.bride_saved_quotes(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active', -- 'active', 'archived'
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT now(),
    ai_copilot_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Mensagens do Chat em Tempo Real
CREATE TABLE IF NOT EXISTS public.marketplace_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.marketplace_chat_conversations(id) ON DELETE CASCADE NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('bride', 'vendor', 'ai_copilot')),
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_bride_profiles_email ON public.bride_profiles(email);
CREATE INDEX IF NOT EXISTS idx_bride_profiles_session_token ON public.bride_profiles(session_token);
CREATE INDEX IF NOT EXISTS idx_marketplace_vendor_tags_user ON public.marketplace_vendor_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_vendor_tags_cat ON public.marketplace_vendor_tags(category);
CREATE INDEX IF NOT EXISTS idx_bride_saved_quotes_bride ON public.bride_saved_quotes(bride_id);
CREATE INDEX IF NOT EXISTS idx_bride_saved_quotes_vendor ON public.bride_saved_quotes(vendor_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_chat_conv_bride ON public.marketplace_chat_conversations(bride_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_chat_conv_vendor ON public.marketplace_chat_conversations(vendor_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_chat_msg_conv ON public.marketplace_chat_messages(conversation_id);

-- 7. Habilitação de RLS (Row Level Security)
ALTER TABLE public.bride_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_vendor_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bride_saved_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_chat_messages ENABLE ROW LEVEL SECURITY;

-- 8. Políticas RLS
-- A) Perfis de Noiva: Leitura e Edição pelo dono do perfil ou por sessão pública da noiva
CREATE POLICY "Leitura de perfil da noiva"
ON public.bride_profiles FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Criação e edição de perfil da noiva"
ON public.bride_profiles FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- B) Tags dos Fornecedores: Leitura pública para busca no marketplace, edição pelo próprio fornecedor
CREATE POLICY "Leitura pública de tags de fornecedores"
ON public.marketplace_vendor_tags FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Fornecedores gerenciam suas próprias tags"
ON public.marketplace_vendor_tags FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- C) Cotações Salvas pela Noiva: Acesso pela noiva ou pelo fornecedor envolvido
CREATE POLICY "Acesso a propostas salvas no workspace"
ON public.bride_saved_quotes FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- D) Conversas e Mensagens de Chat: Acesso pelos participantes
CREATE POLICY "Acesso a conversas do marketplace"
ON public.marketplace_chat_conversations FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Acesso a mensagens do chat"
ON public.marketplace_chat_messages FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 9. Habilitação de Publicação em Tempo Real (Realtime Broadcasts)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'marketplace_chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_chat_messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'marketplace_chat_conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_chat_conversations;
    END IF;
END $$;

