-- Adiciona a coluna texto_botao_envio na tabela templates se não existir
ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS texto_botao_envio text DEFAULT 'Negociar no WhatsApp';

-- Garante que a coluna tema existe
ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS tema text DEFAULT 'moderno';