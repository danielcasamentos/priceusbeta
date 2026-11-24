-- ==============================================================================
-- MIGRATION: Sistema WhatsApp + IA Gemini (Multi-Tenant & Localhost/Docker)
-- Data: 2026-07-20
-- Descrição: Tabelas para configurações do bot, sessões do WhatsApp, histórico
--            de conversas, bundle de treinamento em JSON e diagnósticos de vendas.
-- ==============================================================================

-- 1. Configurações da IA e WhatsApp por Usuário
CREATE TABLE IF NOT EXISTS public.whatsapp_ai_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    bot_enabled BOOLEAN DEFAULT false,
    bot_mode VARCHAR(20) DEFAULT 'copilot' CHECK (bot_mode IN ('auto', 'copilot', 'paused')),
    system_prompt TEXT,
    training_bundle_json JSONB DEFAULT '{}'::jsonb,
    human_delay_seconds INT DEFAULT 6,
    max_auto_replies_per_lead INT DEFAULT 5,
    user_gemini_api_key TEXT,
    handoff_keywords TEXT[] DEFAULT ARRAY['gerente', 'desconto especial', 'falar com humano', 'ligação', 'urgente'],
    active_hours_start TIME DEFAULT '08:00',
    active_hours_end TIME DEFAULT '20:00',
    ai_identity_mode VARCHAR(20) DEFAULT 'identified' CHECK (ai_identity_mode IN ('identified', 'silent')),
    ai_name VARCHAR(100) DEFAULT 'Clara (Assistente Virtual)',
    special_access_emails TEXT[] DEFAULT ARRAY['odanielfotografo@icloud.com', 'daniel@priceus.com.br', 'admin@priceus.com.br'],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Histórico de Conversas do WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    phone_number VARCHAR(30) NOT NULL,
    client_name VARCHAR(255),
    ai_status VARCHAR(20) DEFAULT 'auto' CHECK (ai_status IN ('auto', 'copilot', 'paused')),
    last_message_at TIMESTAMPTZ DEFAULT now(),
    unread_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_user_phone UNIQUE (user_id, phone_number)
);

-- 3. Histórico Mensagem por Mensagem
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE NOT NULL,
    sender VARCHAR(10) CHECK (sender IN ('client', 'ai', 'user')) NOT NULL,
    message_text TEXT NOT NULL,
    is_ai_generated BOOLEAN DEFAULT false,
    ai_metadata JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'sent',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Diagnóstico de Negócio & Erros de Negociação
CREATE TABLE IF NOT EXISTS public.whatsapp_business_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    conversion_rate NUMERIC(5,2) DEFAULT 0,
    recovered_revenue NUMERIC(10,2) DEFAULT 0,
    missed_revenue NUMERIC(10,2) DEFAULT 0,
    flaws_diagnostic JSONB DEFAULT '[]'::jsonb,
    recommended_tasks JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (Row Level Security)
ALTER TABLE public.whatsapp_ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_business_insights ENABLE ROW LEVEL SECURITY;

-- Politicas RLS por user_id
CREATE POLICY "Usuários gerenciam suas próprias configurações de IA do WhatsApp"
    ON public.whatsapp_ai_settings FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários acessam suas próprias conversas de WhatsApp"
    ON public.whatsapp_conversations FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários acessam mensagens de suas conversas"
    ON public.whatsapp_messages FOR ALL
    USING (auth.uid() IN (
        SELECT user_id FROM public.whatsapp_conversations WHERE id = conversation_id
    ));

CREATE POLICY "Usuários gerenciam seus próprios insights comerciais"
    ON public.whatsapp_business_insights FOR ALL
    USING (auth.uid() = user_id);
