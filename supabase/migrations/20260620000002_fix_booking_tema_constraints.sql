-- ============================================================
-- NOTA: Este arquivo documenta as correções aplicadas via
-- docker exec com usuário supabase_admin (ver sessão de fix).
-- ============================================================

-- Fix 1: Adicionar 'pdf_elegante' ao check constraint de profiles
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_tema_perfil_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_tema_perfil_check
  CHECK (tema_perfil = ANY (ARRAY[
    'original'::text,
    'minimalist'::text,
    'modern'::text,
    'magazine'::text,
    'darkstudio'::text,
    'pdf_elegante'::text
  ]));

-- Fix 2: Adicionar 'agendamento_cliente' ao check constraint de eventos_agenda
ALTER TABLE public.eventos_agenda
  DROP CONSTRAINT IF EXISTS eventos_agenda_origem_check;

ALTER TABLE public.eventos_agenda
  ADD CONSTRAINT eventos_agenda_origem_check
  CHECK (origem = ANY (ARRAY[
    'manual'::text,
    'csv_import'::text,
    'lead_confirmado'::text,
    'lead_convertido'::text,
    'ics_sync'::text,
    'google-calendar-sync'::text,
    'workflow'::text,
    'agendamento_cliente'::text
  ]));

-- Fix 3: Permitir leitura anônima de perfis para a PublicBookingPage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname = 'Public profiles are viewable by anyone'
  ) THEN
    CREATE POLICY "Public profiles are viewable by anyone"
      ON public.profiles
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END$$;
