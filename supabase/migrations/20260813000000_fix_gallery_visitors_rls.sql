-- Migration: Fix RLS policies for gallery_visitors table to ensure all visitors are recorded
-- Guard: only executes if the table already exists (safe for all environments)

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'gallery_visitors'
  ) THEN

    ALTER TABLE public.gallery_visitors ENABLE ROW LEVEL SECURITY;

    -- 1. Qualquer visitante (mesmo anônimo) pode registrar/inserir visitante
    DROP POLICY IF EXISTS "Visitantes podem registrar seus dados" ON public.gallery_visitors;
    CREATE POLICY "Visitantes podem registrar seus dados" ON public.gallery_visitors
        FOR INSERT WITH CHECK (true);

    -- 2. Qualquer visitante pode consultar dados de visitantes (necessário para SELECT .maybeSingle() no registerVisitor)
    DROP POLICY IF EXISTS "Permitir leitura publica de visitantes" ON public.gallery_visitors;
    DROP POLICY IF EXISTS "Fotógrafos veem visitantes das suas galerias" ON public.gallery_visitors;
    CREATE POLICY "Permitir leitura publica de visitantes" ON public.gallery_visitors
        FOR SELECT USING (true);

    -- 3. Qualquer visitante pode atualizar contadores de downloads e acesso recente
    DROP POLICY IF EXISTS "Visitantes podem atualizar dados de acesso" ON public.gallery_visitors;
    CREATE POLICY "Visitantes podem atualizar dados de acesso" ON public.gallery_visitors
        FOR UPDATE USING (true);

  END IF;
END $$;
