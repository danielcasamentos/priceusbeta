-- Update handle_new_user to set the trial expiration to 30 days
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
INSERT INTO public.profiles (id, created_at, updated_at, data_expiracao_trial)
VALUES (
NEW.id,
now(),
now(),
now() + INTERVAL '30 days'
);
RETURN NEW;
END;
$$;
