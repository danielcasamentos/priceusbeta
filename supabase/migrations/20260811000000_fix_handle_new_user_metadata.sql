-- ============================================================
-- CORREÇÃO CRÍTICA: handle_new_user usa user_metadata
-- Data: 2026-08-11
-- Problema: RLS 42501 ao tentar INSERT client-side porque a
-- sessão JWT não está propagada logo após o signUp.
-- Solução: O trigger lê os dados do user_metadata e já popula
-- o profile completo, sem depender do client-side.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meta jsonb;
  v_trial_exp timestamptz;
BEGIN
  v_meta := NEW.raw_user_meta_data;

  -- Calcular expiração do trial (30 dias)
  IF v_meta->>'trial_expiration' IS NOT NULL THEN
    v_trial_exp := (v_meta->>'trial_expiration')::timestamptz;
  ELSE
    v_trial_exp := now() + INTERVAL '30 days';
  END IF;

  INSERT INTO public.profiles (
    id,
    created_at,
    updated_at,
    nome_admin,
    status_assinatura,
    data_expiracao_trial,
    data_nascimento,
    pais,
    estado,
    cidade,
    terms_accepted_at,
    terms_version,
    privacy_policy_accepted_at
  )
  VALUES (
    NEW.id,
    now(),
    now(),
    COALESCE(v_meta->>'nome_admin', v_meta->>'full_name', split_part(NEW.email, '@', 1)),
    'trial',
    v_trial_exp,
    CASE WHEN v_meta->>'data_nascimento' IS NOT NULL AND v_meta->>'data_nascimento' != ''
         THEN (v_meta->>'data_nascimento')::date
         ELSE NULL END,
    COALESCE(v_meta->>'pais', NULL),
    COALESCE(v_meta->>'estado', NULL),
    COALESCE(v_meta->>'cidade', NULL),
    CASE WHEN v_meta->>'terms_accepted_at' IS NOT NULL AND v_meta->>'terms_accepted_at' != ''
         THEN (v_meta->>'terms_accepted_at')::timestamptz
         ELSE NULL END,
    COALESCE(v_meta->>'terms_version', NULL),
    CASE WHEN v_meta->>'terms_accepted_at' IS NOT NULL AND v_meta->>'terms_accepted_at' != ''
         THEN (v_meta->>'terms_accepted_at')::timestamptz
         ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE SET
    updated_at           = EXCLUDED.updated_at,
    nome_admin           = COALESCE(NULLIF(EXCLUDED.nome_admin, ''), profiles.nome_admin),
    data_expiracao_trial = COALESCE(profiles.data_expiracao_trial, EXCLUDED.data_expiracao_trial),
    status_assinatura    = COALESCE(profiles.status_assinatura, EXCLUDED.status_assinatura),
    data_nascimento      = COALESCE(profiles.data_nascimento, EXCLUDED.data_nascimento),
    pais                 = COALESCE(profiles.pais, EXCLUDED.pais),
    estado               = COALESCE(profiles.estado, EXCLUDED.estado),
    cidade               = COALESCE(profiles.cidade, EXCLUDED.cidade),
    terms_accepted_at    = COALESCE(profiles.terms_accepted_at, EXCLUDED.terms_accepted_at),
    terms_version        = COALESCE(profiles.terms_version, EXCLUDED.terms_version),
    privacy_policy_accepted_at = COALESCE(profiles.privacy_policy_accepted_at, EXCLUDED.privacy_policy_accepted_at);

  RETURN NEW;
END;
$$;

-- Garantir que o trigger existe e está ativo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Garantir colunas necessárias que podem não existir em produção
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pais text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS estado text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cidade text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS data_nascimento date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_version text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_policy_accepted_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nome_admin text;

-- Garantir política RLS de INSERT existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
    AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON profiles FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
