-- Migration: Adicionar controle de exibição do painel flutuante de total
ALTER TABLE templates ADD COLUMN IF NOT EXISTS exibir_painel_flutuante boolean DEFAULT true;

-- Migration: Adicionar campos de descrição do perfil e ocultação de data de criação
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS descricao_perfil varchar(200),
ADD COLUMN IF NOT EXISTS ocultar_data_criacao boolean DEFAULT false;

-- Migration: Adicionar colunas de configuração de horas na tabela profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS horas_semana INTEGER NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS dias_semana  INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS lucro_desejado NUMERIC(12, 2) NOT NULL DEFAULT 3000;

COMMENT ON COLUMN profiles.horas_semana    IS 'Horas de trabalho por semana definidas pelo usuário (calculadora de valor/hora)';
COMMENT ON COLUMN profiles.dias_semana     IS 'Dias úteis de trabalho por semana definidos pelo usuário (calculadora de valor/hora)';
COMMENT ON COLUMN profiles.lucro_desejado  IS 'Meta de lucro líquido mensal desejado pelo usuário (R$)';

-- Migration: Criar tabela periodos_bloqueados
CREATE TABLE IF NOT EXISTS public.periodos_bloqueados (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    data_inicio date NOT NULL,
    data_fim date NOT NULL,
    motivo text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT periodos_bloqueados_pkey PRIMARY KEY (id),
    CONSTRAINT periodos_bloqueados_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.periodos_bloqueados IS 'Armazena intervalos de datas bloqueados, como férias, para cada usuário.';

-- Habilitar RLS
ALTER TABLE public.periodos_bloqueados ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Allow public read access" ON public.periodos_bloqueados;
DROP POLICY IF EXISTS "Allow user manage their own blocked periods" ON public.periodos_bloqueados;

CREATE POLICY "Allow public read access" ON public.periodos_bloqueados FOR SELECT USING (true);
CREATE POLICY "Allow user manage their own blocked periods" ON public.periodos_bloqueados FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.periodos_bloqueados TO anon, authenticated, service_role;

-- Desativar políticas de SELECT amplas em buckets públicos (evita warnings no Security Advisor)
DROP POLICY IF EXISTS "images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "profile_images_public_read" ON storage.objects;

-- Criar políticas de SELECT restritas a usuários autenticados para permitir upload/leitura de metadados
DROP POLICY IF EXISTS "images_select_authenticated" ON storage.objects;
CREATE POLICY "images_select_authenticated" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'images');

DROP POLICY IF EXISTS "product_images_select_authenticated" ON storage.objects;
CREATE POLICY "product_images_select_authenticated" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'product_images');

DROP POLICY IF EXISTS "profile_images_select_authenticated" ON storage.objects;
CREATE POLICY "profile_images_select_authenticated" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'profile_images');


