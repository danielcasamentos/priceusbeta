-- ============================================================
-- FIX CRÍTICO: Corrigir função set_trial_expiration() que usava trial_end
-- Data: 2026-08-11
-- Erro original: code 42703 | record "new" has no field "trial_end"
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_trial_expiration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.data_expiracao_trial := COALESCE(NEW.data_expiracao_trial, NOW() + INTERVAL '30 days');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_trial_expired(user_id_param UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE trial_end_date TIMESTAMPTZ;
BEGIN
  SELECT data_expiracao_trial INTO trial_end_date FROM public.profiles WHERE id = user_id_param;
  IF trial_end_date IS NULL THEN RETURN FALSE; END IF;
  RETURN NOW() > trial_end_date;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_trial_days_remaining(user_id_param UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  trial_end_date TIMESTAMPTZ;
  days_remaining INTEGER;
BEGIN
  SELECT data_expiracao_trial INTO trial_end_date FROM public.profiles WHERE id = user_id_param;
  IF trial_end_date IS NULL THEN RETURN 30; END IF;
  days_remaining := EXTRACT(DAY FROM (trial_end_date - NOW()));
  IF days_remaining < 0 THEN RETURN 0; END IF;
  RETURN days_remaining;
END;
$$;

NOTIFY pgrst, 'reload schema';
