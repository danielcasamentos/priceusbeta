


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."admin_hard_delete_lead"("p_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM public.leads WHERE id = p_id;
END;
$$;


ALTER FUNCTION "public"."admin_hard_delete_lead"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_restore_lead"("p_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.leads SET deleted_at = NULL WHERE id = p_id;
END;
$$;


ALTER FUNCTION "public"."admin_restore_lead"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_restore_leads_by_user"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.leads SET deleted_at = NULL WHERE user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."admin_restore_leads_by_user"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."atualizar_estatisticas_avaliacoes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
UPDATE profiles
SET
media_avaliacoes = (
SELECT ROUND(AVG(rating)::numeric, 2)
FROM avaliacoes
WHERE profile_id = COALESCE(NEW.profile_id, OLD.profile_id)
AND visivel = true
),
total_avaliacoes = (
SELECT COUNT(*)
FROM avaliacoes
WHERE profile_id = COALESCE(NEW.profile_id, OLD.profile_id)
),
total_avaliacoes_visiveis = (
SELECT COUNT(*)
FROM avaliacoes
WHERE profile_id = COALESCE(NEW.profile_id, OLD.profile_id)
AND visivel = true
)
WHERE id = COALESCE(NEW.profile_id, OLD.profile_id);

RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."atualizar_estatisticas_avaliacoes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calcular_preco_com_ajuste_geografico"("preco_base" numeric, "cidade_nome" "text", "template_id_param" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
multiplicador_cidade numeric := 1.0;
BEGIN
SELECT COALESCE(multiplicador, 1.0) INTO multiplicador_cidade
FROM cidades_ajuste
WHERE nome ILIKE cidade_nome
AND (template_id IS NULL OR template_id = template_id_param)
AND ativo = true
LIMIT 1;

RETURN preco_base * multiplicador_cidade;
END;
$$;


ALTER FUNCTION "public"."calcular_preco_com_ajuste_geografico"("preco_base" numeric, "cidade_nome" "text", "template_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calcular_preco_com_ajuste_sazonal"("preco_base" numeric, "data_evento" "date", "template_id_param" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
multiplicador_temporada numeric := 1.0;
BEGIN
SELECT COALESCE(multiplicador, 1.0) INTO multiplicador_temporada
FROM temporadas
WHERE template_id = template_id_param
AND data_evento BETWEEN data_inicio AND data_fim
AND ativo = true
LIMIT 1;

RETURN preco_base * multiplicador_temporada;
END;
$$;


ALTER FUNCTION "public"."calcular_preco_com_ajuste_sazonal"("preco_base" numeric, "data_evento" "date", "template_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calcular_preco_final"("preco_base" numeric, "cidade_nome" "text" DEFAULT NULL::"text", "data_evento" "date" DEFAULT NULL::"date", "template_id_param" "uuid" DEFAULT NULL::"uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
preco_final numeric := preco_base;
BEGIN
IF cidade_nome IS NOT NULL AND template_id_param IS NOT NULL THEN
preco_final := calcular_preco_com_ajuste_geografico(preco_final, cidade_nome, template_id_param);
END IF;

IF data_evento IS NOT NULL AND template_id_param IS NOT NULL THEN
preco_final := calcular_preco_com_ajuste_sazonal(preco_final, data_evento, template_id_param);
END IF;

RETURN ROUND(preco_final, 2);
END;
$$;


ALTER FUNCTION "public"."calcular_preco_final"("preco_base" numeric, "cidade_nome" "text", "data_evento" "date", "template_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_date_availability"("p_user_id" "uuid", "p_data_evento" "date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
v_config record;
v_eventos_count integer;
v_bloqueada boolean;
v_result jsonb;
BEGIN
SELECT eventos_max_por_dia, modo_aviso, agenda_ativa
INTO v_config
FROM configuracao_agenda
WHERE user_id = p_user_id;

IF v_config IS NULL OR NOT v_config.agenda_ativa THEN
RETURN jsonb_build_object(
'disponivel', true,
'status', 'inativa',
'eventos_atual', 0,
'eventos_max', 999,
'modo_aviso', 'informativo',
'bloqueada', false,
'mensagem', 'Sistema de agenda não está ativo',
'agenda_ativa', false
);
END IF;

SELECT EXISTS(
SELECT 1 FROM datas_bloqueadas
WHERE user_id = p_user_id AND data_bloqueada = p_data_evento
) INTO v_bloqueada;

IF v_bloqueada THEN
RETURN jsonb_build_object(
'disponivel', false,
'status', 'bloqueada',
'eventos_atual', 0,
'eventos_max', v_config.eventos_max_por_dia,
'modo_aviso', v_config.modo_aviso,
'bloqueada', true,
'mensagem', 'Esta data está bloqueada e não está disponível.',
'agenda_ativa', true
);
END IF;

SELECT COUNT(*)
INTO v_eventos_count
FROM eventos_agenda
WHERE user_id = p_user_id
AND data_evento = p_data_evento
AND status IN ('confirmado', 'pendente');

IF v_eventos_count = 0 THEN
v_result := jsonb_build_object(
'disponivel', true,
'status', 'disponivel',
'eventos_atual', v_eventos_count,
'eventos_max', v_config.eventos_max_por_dia,
'modo_aviso', v_config.modo_aviso,
'bloqueada', false,
'mensagem', 'Data disponível!',
'agenda_ativa', true
);
ELSIF v_eventos_count < v_config.eventos_max_por_dia THEN
v_result := jsonb_build_object(
'disponivel', true,
'status', 'parcial',
'eventos_atual', v_eventos_count,
'eventos_max', v_config.eventos_max_por_dia,
'modo_aviso', v_config.modo_aviso,
'bloqueada', false,
'mensagem', format('Disponibilidade limitada: %s de %s vagas preenchidas',
v_eventos_count, v_config.eventos_max_por_dia),
'agenda_ativa', true
);
ELSE
v_result := jsonb_build_object(
'disponivel', false,
'status', 'ocupada',
'eventos_atual', v_eventos_count,
'eventos_max', v_config.eventos_max_por_dia,
'modo_aviso', v_config.modo_aviso,
'bloqueada', false,
'mensagem', 'Já temos um evento para esta data.',
'agenda_ativa', true
);
END IF;

RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."check_date_availability"("p_user_id" "uuid", "p_data_evento" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_unread_messages"("conversation_uuid" "uuid") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
RETURN (
SELECT COUNT(*)
FROM chat_messages
WHERE conversation_id = conversation_uuid
AND sender_type = 'admin'
AND lida = false
);
END;
$$;


ALTER FUNCTION "public"."count_unread_messages"("conversation_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification"("user_id_param" "uuid", "title_param" "text", "message_param" "text", "type_param" "text" DEFAULT 'info'::"text", "data_param" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, data, is_read)
  VALUES (user_id_param, title_param, message_param, type_param, data_param, FALSE)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;


ALTER FUNCTION "public"."create_notification"("user_id_param" "uuid", "title_param" "text", "message_param" "text", "type_param" "text", "data_param" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."gerar_token_avaliacao"("lead_id_param" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
token_gerado text;
BEGIN
token_gerado := encode(gen_random_bytes(32), 'base64');
token_gerado := replace(token_gerado, '/', '_');
token_gerado := replace(token_gerado, '+', '-');

UPDATE leads
SET token_avaliacao = token_gerado,
pode_avaliar = true,
avaliacao_solicitada_em = now()
WHERE id = lead_id_param;

RETURN token_gerado;
END;
$$;


ALTER FUNCTION "public"."gerar_token_avaliacao"("lead_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_blocked_dates"("p_user_id" "uuid") RETURNS TABLE("data_bloqueada" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT db.data_bloqueada
  FROM public.datas_bloqueadas AS db
  WHERE db.user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."get_blocked_dates"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_contract_data"("p_token" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    contract_data RECORD;
    template_data RECORD;
    business_data RECORD;
    result JSONB;
BEGIN
    -- Busca o contrato pelo token
    SELECT * INTO contract_data FROM public.contracts WHERE token = p_token;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Busca o template associado
    SELECT id, name, content_text INTO template_data FROM public.contract_templates WHERE id = contract_data.template_id;

    -- Busca os dados da empresa associada
    SELECT business_name, cnpj, address, city, state, zip_code, phone, email, pix_key, bank_name, bank_agency, bank_account, bank_account_type
    INTO business_data
    FROM public.user_business_settings
    WHERE user_id = contract_data.user_id;

    -- Monta o objeto de retorno
    result := jsonb_build_object(
        'contract', to_jsonb(contract_data),
        'template', to_jsonb(template_data),
        'business_settings', to_jsonb(business_data)
    );

    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_public_contract_data"("p_token" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_profile_views"("profile_slug" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
UPDATE profiles 
SET visualizacoes_perfil = visualizacoes_perfil + 1
WHERE slug_usuario = profile_slug;
END;
$$;


ALTER FUNCTION "public"."increment_profile_views"("profile_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."limpar_todos_eventos"("p_user_id" "uuid", "p_incluir_manuais" boolean DEFAULT false) RETURNS TABLE("eventos_deletados" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
v_count integer;
BEGIN
IF p_incluir_manuais THEN
DELETE FROM eventos_agenda
WHERE user_id = p_user_id
AND status NOT IN ('concluido', 'cancelado');
ELSE
DELETE FROM eventos_agenda
WHERE user_id = p_user_id
AND importacao_id IS NOT NULL
AND status NOT IN ('concluido', 'cancelado');
END IF;

GET DIAGNOSTICS v_count = ROW_COUNT;
RETURN QUERY SELECT v_count;
END;
$$;


ALTER FUNCTION "public"."limpar_todos_eventos"("p_user_id" "uuid", "p_incluir_manuais" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_all_notifications_as_read"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.notifications
  SET is_read = true, updated_at = now()
  WHERE user_id = auth.uid()
    AND is_read = false;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;


ALTER FUNCTION "public"."mark_all_notifications_as_read"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notification_as_read"("notification_id_param" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true, updated_at = now()
  WHERE id = notification_id_param
    AND user_id = auth.uid();

  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."mark_notification_as_read"("notification_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_company_yearly_metrics"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
REFRESH MATERIALIZED VIEW CONCURRENTLY company_yearly_metrics;
END;
$$;


ALTER FUNCTION "public"."refresh_company_yearly_metrics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rollback_importacao"("p_importacao_id" "uuid", "p_user_id" "uuid") RETURNS TABLE("eventos_deletados" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
v_count integer;
BEGIN
IF NOT EXISTS (
SELECT 1 FROM historico_importacoes_calendario
WHERE id = p_importacao_id AND user_id = p_user_id
) THEN
RAISE EXCEPTION 'Importação não encontrada ou não pertence ao usuário';
END IF;

DELETE FROM eventos_agenda
WHERE importacao_id = p_importacao_id
AND user_id = p_user_id;

GET DIAGNOSTICS v_count = ROW_COUNT;

DELETE FROM historico_importacoes_calendario
WHERE id = p_importacao_id
AND user_id = p_user_id;

RETURN QUERY SELECT v_count;
END;
$$;


ALTER FUNCTION "public"."rollback_importacao"("p_importacao_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_default_company_categories"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
INSERT INTO company_categories (user_id, nome, tipo, cor) VALUES
(p_user_id, 'Casamento', 'receita', '#22c55e'),
(p_user_id, 'Ensaio Fotográfico', 'receita', '#3b82f6'),
(p_user_id, 'Evento Corporativo', 'receita', '#8b5cf6'),
(p_user_id, 'Book Profissional', 'receita', '#06b6d4'),
(p_user_id, 'Produto/Fotografia Comercial', 'receita', '#f59e0b'),
(p_user_id, 'Outros Serviços', 'receita', '#6366f1');

INSERT INTO company_categories (user_id, nome, tipo, cor) VALUES
(p_user_id, 'Equipamentos', 'despesa', '#ef4444'),
(p_user_id, 'Marketing e Publicidade', 'despesa', '#ec4899'),
(p_user_id, 'Transporte', 'despesa', '#f97316'),
(p_user_id, 'Alimentação', 'despesa', '#84cc16'),
(p_user_id, 'Softwares e Ferramentas', 'despesa', '#0ea5e9'),
(p_user_id, 'Aluguel/Espaço', 'despesa', '#a855f7'),
(p_user_id, 'Impostos e Taxas', 'despesa', '#78716c'),
(p_user_id, 'Outros Custos', 'despesa', '#64748b');
END;
$$;


ALTER FUNCTION "public"."seed_default_company_categories"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_send_email_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Chama a Edge Function 'send-email-notification' e passa os dados do novo registro (NEW)
    PERFORM net.http_post(
        url := 'https://<SEU-ID-DE-PROJETO>.supabase.co/functions/v1/send-email-notification',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SUA-CHAVE-ANON-DO-SUPABASE>"}'::jsonb,
        body := jsonb_build_object('record', NEW)
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_send_email_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_company_transactions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_company_transactions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_last_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
UPDATE chat_conversations
SET 
ultima_mensagem = NEW.mensagem,
ultima_mensagem_em = NEW.created_at,
updated_at = now()
WHERE id = NEW.conversation_id;
RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_last_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_formas_pagamento_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_formas_pagamento_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_notifications_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_notifications_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_business_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_business_settings_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."acrescimos_localidade" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "cidade" "text" NOT NULL,
    "valor" numeric NOT NULL,
    "template_id" "uuid",
    "keywords" "text"[],
    "tipo" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."acrescimos_localidade" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."acrescimos_sazonais" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "valor" numeric NOT NULL,
    "ativo" boolean DEFAULT true,
    "template_id" "uuid",
    "mes" "text",
    "tipo" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."acrescimos_sazonais" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agenda_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "agenda_ativa" boolean DEFAULT false,
    "dias_antecedencia_min" integer DEFAULT 0,
    "modo_aviso" "text" DEFAULT 'informativo'::"text",
    "dias_semana_bloqueados" integer[],
    "regra_par_impar" "text",
    "regra_semanal" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "bloquear_feriados" boolean DEFAULT false,
    "regras_massa_ativas" boolean DEFAULT false,
    "regra_mes_par" "text",
    "regra_mes_impar" "text",
    "regra_semanal_inicio" "date",
    CONSTRAINT "chk_regra_semanal" CHECK (("regra_semanal" = ANY (ARRAY['trabalha_pares'::"text", 'trabalha_impares'::"text"])))
);

ALTER TABLE ONLY "public"."agenda_config" REPLICA IDENTITY FULL;


ALTER TABLE "public"."agenda_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."agenda_config" IS 'Configurações da agenda para cada fotógrafo.';



COMMENT ON COLUMN "public"."agenda_config"."dias_semana_bloqueados" IS 'Array de dias da semana a serem bloqueados. Ex: [0, 6] para bloquear Domingos e Sábados.';



COMMENT ON COLUMN "public"."agenda_config"."regra_par_impar" IS 'Regra para bloquear dias pares ou ímpares do mês.';



COMMENT ON COLUMN "public"."agenda_config"."regra_semanal" IS 'Regra para semanas alternadas. "trabalha_pares" ou "trabalha_impares".';



COMMENT ON COLUMN "public"."agenda_config"."bloquear_feriados" IS 'Se verdadeiro, bloqueia automaticamente as datas cadastradas como feriados.';



COMMENT ON COLUMN "public"."agenda_config"."regras_massa_ativas" IS 'Se verdadeiro, aplica todas as regras de bloqueio em massa (dias da semana, feriados, etc.).';



COMMENT ON COLUMN "public"."agenda_config"."regra_mes_par" IS 'Regra para bloquear dias em meses pares (Fev, Abr, etc.). Ex: "dias_pares", "dias_impares".';



COMMENT ON COLUMN "public"."agenda_config"."regra_mes_impar" IS 'Regra para bloquear dias em meses ímpares (Jan, Mar, etc.). Ex: "dias_pares", "dias_impares".';



COMMENT ON COLUMN "public"."agenda_config"."regra_semanal_inicio" IS 'Data de referência para iniciar a contagem da regra "semana sim, semana não".';



CREATE TABLE IF NOT EXISTS "public"."analytics_orcamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "data_acesso" timestamp with time zone DEFAULT "now"(),
    "tempo_permanencia" integer DEFAULT 0,
    "origem" "text" DEFAULT 'direct'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "device_type" "text" DEFAULT 'desktop'::"text",
    "session_id" "text",
    "ultima_etapa" "text",
    "orcamento_enviado" boolean DEFAULT false,
    "abandonou" boolean DEFAULT false,
    "tempo_ate_abandono" integer,
    "campos_preenchidos" "jsonb" DEFAULT '{}'::"jsonb",
    "produtos_visualizados" "jsonb" DEFAULT '[]'::"jsonb",
    "interacoes" integer DEFAULT 0,
    "scroll_profundidade" integer DEFAULT 0,
    "retornou" boolean DEFAULT false,
    "user_agent" "text",
    "referrer" "text",
    "utm_source" "text",
    "utm_campaign" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_orcamentos" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_orcamentos" IS 'Rastreamento de visualizações e métricas de orçamentos';



CREATE TABLE IF NOT EXISTS "public"."avaliacoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "lead_id" "uuid",
    "rating" integer NOT NULL,
    "comentario" "text",
    "nome_cliente" "text",
    "data_evento" "date",
    "tipo_evento" "text",
    "visivel" boolean DEFAULT false,
    "aprovado_em" timestamp with time zone,
    "resposta_fornecedor" "text",
    "respondido_em" timestamp with time zone,
    "token_validacao" "text" NOT NULL,
    "ip_avaliador" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "avaliacoes_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."avaliacoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "nome_campo" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "obrigatorio" boolean DEFAULT false,
    "placeholder" "text",
    "template_id" "uuid",
    "label" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "ordem" integer DEFAULT 0,
    "campo_inserido_01" "text",
    "campo_inserido_02" "text",
    "campo_inserido_03" "text",
    "campo_inserido_04" "text",
    "campo_inserido_05" "text",
    "campo_inserido_06" "text",
    "campo_inserido_07" "text",
    "campo_inserido_08" "text",
    "campo_inserido_09" "text",
    "campo_inserido_10" "text",
    "valor_padrao" "text",
    "opcoes" "jsonb"
);


ALTER TABLE "public"."campos" OWNER TO "postgres";


COMMENT ON COLUMN "public"."campos"."user_id" IS 'User ID (optional, inherited from template)';



COMMENT ON COLUMN "public"."campos"."valor_padrao" IS 'Default value for the field';



COMMENT ON COLUMN "public"."campos"."opcoes" IS 'Options for select, radio, checkbox fields';



CREATE TABLE IF NOT EXISTS "public"."campos_cliente" (
    "id" bigint NOT NULL,
    "template_id" "uuid" NOT NULL,
    "user_owner_id" "uuid" NOT NULL,
    "dados_cliente" "jsonb" NOT NULL,
    "valor_final" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "campo_inserido_01" "text",
    "campo_inserido_02" "text",
    "campo_inserido_03" "text",
    "campo_inserido_04" "text",
    "campo_inserido_05" "text",
    "campo_inserido_06" "text",
    "campo_inserido_07" "text",
    "campo_inserido_08" "text",
    "campo_inserido_09" "text",
    "campo_inserido_10" "text",
    "campos_metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."campos_cliente" OWNER TO "postgres";


COMMENT ON COLUMN "public"."campos_cliente"."campos_metadata" IS 'Metadata about custom fields: labels, types, etc.';



ALTER TABLE "public"."campos_cliente" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."campos_cliente_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."chat_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'aberta'::"text",
    "prioridade" "text" DEFAULT 'media'::"text",
    "assunto" "text" NOT NULL,
    "ultima_mensagem" "text",
    "ultima_mensagem_em" timestamp with time zone DEFAULT "now"(),
    "atendente_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chat_conversations_prioridade_check" CHECK (("prioridade" = ANY (ARRAY['baixa'::"text", 'media'::"text", 'alta'::"text", 'urgente'::"text"]))),
    CONSTRAINT "chat_conversations_status_check" CHECK (("status" = ANY (ARRAY['aberta'::"text", 'em_atendimento'::"text", 'resolvida'::"text", 'fechada'::"text"])))
);


ALTER TABLE "public"."chat_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "sender_type" "text" NOT NULL,
    "mensagem" "text" NOT NULL,
    "lida" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chat_messages_sender_type_check" CHECK (("sender_type" = ANY (ARRAY['user'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cidades_ajuste" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" character varying(100) NOT NULL,
    "estado_id" "uuid",
    "user_id" "uuid",
    "valor_ajuste" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "template_id" "uuid",
    "multiplicador" numeric(5,2) DEFAULT 1.0,
    "ativo" boolean DEFAULT true,
    "ajuste_percentual" numeric(5,2) DEFAULT 0,
    "taxa_deslocamento" numeric(10,2) DEFAULT 0
);


ALTER TABLE "public"."cidades_ajuste" OWNER TO "postgres";


COMMENT ON TABLE "public"."cidades_ajuste" IS 'Geographic pricing adjustments per city. ajuste_percentual = percentage adjustment, taxa_deslocamento = flat travel fee';



COMMENT ON COLUMN "public"."cidades_ajuste"."multiplicador" IS 'Price multiplier (e.g., 1.15 = 15% increase)';



COMMENT ON COLUMN "public"."cidades_ajuste"."ajuste_percentual" IS 'Percentage adjustment for this city (e.g., 15 = +15%)';



COMMENT ON COLUMN "public"."cidades_ajuste"."taxa_deslocamento" IS 'Flat rate travel fee for this city in currency';



CREATE TABLE IF NOT EXISTS "public"."company_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "cor" "text" DEFAULT '#3b82f6'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "company_categories_tipo_check" CHECK (("tipo" = ANY (ARRAY['receita'::"text", 'despesa'::"text"])))
);


ALTER TABLE "public"."company_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tipo" "text" NOT NULL,
    "origem" "text" DEFAULT 'manual'::"text" NOT NULL,
    "descricao" "text" NOT NULL,
    "valor" numeric(10,2) NOT NULL,
    "data" "date" DEFAULT CURRENT_DATE NOT NULL,
    "status" "text" DEFAULT 'pendente'::"text" NOT NULL,
    "forma_pagamento" "text",
    "categoria_id" "uuid",
    "lead_id" "uuid",
    "contract_id" "uuid",
    "parcelas_info" "jsonb",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "parent_transaction_id" "uuid",
    "is_installment" boolean DEFAULT false NOT NULL,
    "installment_number" integer,
    "total_installments" integer,
    CONSTRAINT "company_transactions_origem_check" CHECK (("origem" = ANY (ARRAY['manual'::"text", 'lead'::"text", 'contrato'::"text"]))),
    CONSTRAINT "company_transactions_status_check" CHECK (("status" = ANY (ARRAY['pendente'::"text", 'pago'::"text", 'cancelado'::"text"]))),
    CONSTRAINT "company_transactions_tipo_check" CHECK (("tipo" = ANY (ARRAY['receita'::"text", 'despesa'::"text"]))),
    CONSTRAINT "company_transactions_valor_check" CHECK (("valor" > (0)::numeric)),
    CONSTRAINT "installment_fields_consistency" CHECK (((("is_installment" = false) AND ("installment_number" IS NULL) AND ("total_installments" IS NULL) AND ("parent_transaction_id" IS NULL)) OR (("is_installment" = true) AND ("installment_number" > 0) AND ("total_installments" > 0) AND ("installment_number" <= "total_installments"))))
);


ALTER TABLE "public"."company_transactions" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."company_yearly_metrics" AS
 SELECT "user_id",
    (EXTRACT(year FROM "data"))::integer AS "year",
    "tipo",
    "sum"("valor") AS "total",
    "count"(*) AS "quantidade",
    "avg"("valor") AS "media"
   FROM "public"."company_transactions"
  WHERE ("status" = 'pago'::"text")
  GROUP BY "user_id", ((EXTRACT(year FROM "data"))::integer), "tipo"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."company_yearly_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."configuracao_agenda" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "eventos_max_por_dia" integer DEFAULT 1 NOT NULL,
    "modo_aviso" "text" DEFAULT 'sugestivo'::"text" NOT NULL,
    "agenda_ativa" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "configuracao_agenda_eventos_max_por_dia_check" CHECK ((("eventos_max_por_dia" >= 1) AND ("eventos_max_por_dia" <= 10))),
    CONSTRAINT "configuracao_agenda_modo_aviso_check" CHECK (("modo_aviso" = ANY (ARRAY['informativo'::"text", 'sugestivo'::"text", 'restritivo'::"text"])))
);


ALTER TABLE "public"."configuracao_agenda" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contract_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "content_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contract_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contracts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid",
    "lead_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_data_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "client_data_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "signature_base64" "text",
    "pdf_url" "text",
    "expires_at" timestamp with time zone NOT NULL,
    "signed_at" timestamp with time zone,
    "client_ip" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_signature_base64" "text",
    "user_data_json" "jsonb" DEFAULT '{}'::"jsonb",
    "content_override" "text",
    "payment_details_json" "jsonb",
    CONSTRAINT "contracts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'signed'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."contracts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "codigo" "text" NOT NULL,
    "tipo" "text",
    "valor" numeric,
    "max_usos" integer,
    "template_id" "uuid",
    "porcentagem" numeric,
    "validade" "date",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "ativo" boolean DEFAULT true,
    "descricao" "text",
    "tipo_desconto" "text",
    "valor_fixo" numeric,
    "limite_uso" integer,
    "uso_atual" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "cupons_tipo_desconto_check" CHECK (("tipo_desconto" = ANY (ARRAY['percentual'::"text", 'valor_fixo'::"text"])))
);


ALTER TABLE "public"."cupons" OWNER TO "postgres";


COMMENT ON COLUMN "public"."cupons"."descricao" IS 'Descrição do cupom para uso interno';



COMMENT ON COLUMN "public"."cupons"."tipo_desconto" IS 'Tipo de desconto: percentual ou valor_fixo';



COMMENT ON COLUMN "public"."cupons"."valor_fixo" IS 'Valor fixo de desconto (quando tipo_desconto = valor_fixo)';



COMMENT ON COLUMN "public"."cupons"."limite_uso" IS 'Número máximo de vezes que o cupom pode ser usado';



COMMENT ON COLUMN "public"."cupons"."uso_atual" IS 'Contador de quantas vezes o cupom foi usado';



CREATE TABLE IF NOT EXISTS "public"."datas_bloqueadas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "data_bloqueada" "date" NOT NULL,
    "motivo" "text" DEFAULT 'Outro'::"text" NOT NULL,
    "descricao" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "datas_bloqueadas_motivo_check" CHECK (("motivo" = ANY (ARRAY['Férias'::"text", 'Viagem'::"text", 'Pessoal'::"text", 'Outro'::"text"])))
);


ALTER TABLE "public"."datas_bloqueadas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."estados" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" character varying(100) NOT NULL,
    "codigo" character varying(2) NOT NULL,
    "pais_id" "uuid",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "sigla" character varying(10) NOT NULL,
    "ativo" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."estados" OWNER TO "postgres";


COMMENT ON COLUMN "public"."estados"."sigla" IS 'State/Province abbreviation (e.g., SP, RJ, CA)';



COMMENT ON COLUMN "public"."estados"."ativo" IS 'Enable/disable state/province for geographic pricing';



CREATE TABLE IF NOT EXISTS "public"."eventos_agenda" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "data_evento" "date" NOT NULL,
    "tipo_evento" "text" DEFAULT 'evento'::"text" NOT NULL,
    "cliente_nome" "text" DEFAULT ''::"text" NOT NULL,
    "cidade" "text" DEFAULT ''::"text",
    "status" "text" DEFAULT 'pendente'::"text" NOT NULL,
    "origem" "text" DEFAULT 'manual'::"text" NOT NULL,
    "observacoes" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "importacao_id" "uuid",
    CONSTRAINT "eventos_agenda_origem_check" CHECK (("origem" = ANY (ARRAY['manual'::"text", 'csv_import'::"text", 'lead_confirmado'::"text"]))),
    CONSTRAINT "eventos_agenda_status_check" CHECK (("status" = ANY (ARRAY['confirmado'::"text", 'pendente'::"text", 'concluido'::"text", 'cancelado'::"text"])))
);


ALTER TABLE "public"."eventos_agenda" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."eventos_ativos_por_usuario" AS
 SELECT "user_id",
    "count"(*) AS "eventos_ativos",
    "count"(
        CASE
            WHEN ("importacao_id" IS NOT NULL) THEN 1
            ELSE NULL::integer
        END) AS "eventos_importados",
    "count"(
        CASE
            WHEN ("importacao_id" IS NULL) THEN 1
            ELSE NULL::integer
        END) AS "eventos_manuais"
   FROM "public"."eventos_agenda"
  WHERE (("status" = ANY (ARRAY['confirmado'::"text", 'pendente'::"text"])) AND ("data_evento" >= CURRENT_DATE))
  GROUP BY "user_id";


ALTER VIEW "public"."eventos_ativos_por_usuario" OWNER TO "postgres";


COMMENT ON VIEW "public"."eventos_ativos_por_usuario" IS 'Contagem de eventos ativos (confirmados e pendentes) por usuário, separando importados de manuais';



CREATE TABLE IF NOT EXISTS "public"."feriados" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "data" "date" NOT NULL,
    "nome" "text" NOT NULL,
    "tipo" "text" DEFAULT 'nacional'::"text" NOT NULL,
    "multiplicador_preco" numeric(4,2) DEFAULT 1.0 NOT NULL,
    "ativo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feriados_multiplicador_preco_check" CHECK ((("multiplicador_preco" >= 0.5) AND ("multiplicador_preco" <= 5.0))),
    CONSTRAINT "feriados_tipo_check" CHECK (("tipo" = ANY (ARRAY['nacional'::"text", 'estadual'::"text", 'municipal'::"text", 'personalizado'::"text"])))
);


ALTER TABLE "public"."feriados" OWNER TO "postgres";


COMMENT ON TABLE "public"."feriados" IS 'Armazena feriados nacionais, estaduais ou municipais para cada usuário.';



CREATE TABLE IF NOT EXISTS "public"."formas_pagamento" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "regra" "text" DEFAULT 'personalizada'::"text",
    "valor_regra" numeric,
    "num_parcelas" integer,
    "parcelas_detalhadas" "jsonb" DEFAULT '[]'::"jsonb",
    "data_limite_quitacao" "date",
    "template_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "acrescimo" numeric DEFAULT 0,
    "entrada_valor" numeric DEFAULT 0,
    "max_parcelas" integer DEFAULT 1,
    "mes_final" "text",
    "entrada_percentual" numeric(5,2),
    "entrada_tipo" "text" DEFAULT 'fixo'::"text",
    CONSTRAINT "formas_pagamento_entrada_tipo_check" CHECK (("entrada_tipo" = ANY (ARRAY['percentual'::"text", 'fixo'::"text"])))
);


ALTER TABLE "public"."formas_pagamento" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."historico_importacoes_calendario" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nome_arquivo" "text" DEFAULT ''::"text" NOT NULL,
    "estrategia_importacao" "text" DEFAULT 'adicionar_novos'::"text" NOT NULL,
    "eventos_adicionados" integer DEFAULT 0 NOT NULL,
    "eventos_atualizados" integer DEFAULT 0 NOT NULL,
    "eventos_ignorados" integer DEFAULT 0 NOT NULL,
    "eventos_removidos" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "historico_importacoes_calendario_estrategia_importacao_check" CHECK (("estrategia_importacao" = ANY (ARRAY['substituir_tudo'::"text", 'adicionar_novos'::"text", 'mesclar_atualizar'::"text"])))
);


ALTER TABLE "public"."historico_importacoes_calendario" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "template_id" "uuid",
    "client_name" "text",
    "client_phone" "text",
    "status" "text" DEFAULT 'novo'::"text",
    "total_value" numeric(12,2),
    "orcamento_detalhes" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "client_email" "text",
    "dados_cliente" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "campos_preenchidos" "jsonb" DEFAULT '{}'::"jsonb",
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "nome_cliente" "text",
    "email_cliente" "text",
    "telefone_cliente" "text",
    "tipo_evento" "text",
    "data_evento" "date",
    "cidade_evento" "text",
    "valor_total" numeric(10,2) DEFAULT 0,
    "orcamento_detalhe" "jsonb",
    "url_origem" "text",
    "origem" "text" DEFAULT 'web'::"text",
    "data_orcamento" timestamp with time zone DEFAULT "now"(),
    "data_ultimo_contato" timestamp with time zone,
    "observacoes" "text",
    "ip_address" "inet",
    "user_agent" "text",
    "session_id" "text",
    "tempo_preenchimento_segundos" integer,
    "lgpd_consent_timestamp" timestamp with time zone,
    "lgpd_consent_ip" "inet",
    "lgpd_consent_text" "text",
    "pode_avaliar" boolean DEFAULT false,
    "avaliacao_solicitada_em" timestamp with time zone,
    "avaliacao_id" "uuid",
    "token_avaliacao" "text",
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."leads" OWNER TO "postgres";


COMMENT ON COLUMN "public"."leads"."status" IS 'Status types: novo, contatado, em_negociacao, fazer_followup, convertido, perdido, abandonado';



COMMENT ON COLUMN "public"."leads"."lgpd_consent_timestamp" IS 'Data e hora em que o cliente consentiu com a LGPD';



COMMENT ON COLUMN "public"."leads"."lgpd_consent_ip" IS 'Endereço IP do cliente no momento do consentimento (auditoria)';



COMMENT ON COLUMN "public"."leads"."lgpd_consent_text" IS 'Texto exato do termo de consentimento aceito pelo cliente';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "message" "text" NOT NULL,
    "link" "text",
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "related_id" "uuid",
    "title" "text" NOT NULL,
    "data" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."paises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" character varying(100) NOT NULL,
    "codigo" character varying(3) NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "ativo" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."paises" OWNER TO "postgres";


COMMENT ON COLUMN "public"."paises"."ativo" IS 'Enable/disable country for geographic pricing';



CREATE TABLE IF NOT EXISTS "public"."periodos_bloqueados" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date" NOT NULL,
    "motivo" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."periodos_bloqueados" OWNER TO "postgres";


COMMENT ON TABLE "public"."periodos_bloqueados" IS 'Armazena intervalos de datas bloqueados, como férias, para cada usuário.';



CREATE TABLE IF NOT EXISTS "public"."priceus_leads" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nome_cliente" "text" NOT NULL,
    "telefone_cliente" "text" NOT NULL,
    "valor_final" numeric(10,2) NOT NULL,
    "form_data" "jsonb" NOT NULL,
    "status_etiqueta" "text" DEFAULT 'Em Andamento'::"text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."priceus_leads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."priceus_price_rules" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "custom_field_key" "text" NOT NULL,
    "match_value" "text" NOT NULL,
    "adjustment_type" "text" NOT NULL,
    "adjustment_value" numeric(10,2) NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."priceus_price_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."priceus_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nome_template" "text" DEFAULT 'Novo Orçamento'::"text" NOT NULL,
    "draft_config_json" "jsonb",
    "public_config_json" "jsonb",
    "is_published" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "custom_fields" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."priceus_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."produtos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid",
    "nome" "text",
    "resumo" "text",
    "valor" numeric,
    "imagem_url" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "user_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "ordem" integer DEFAULT 0,
    "mostrar_imagem" boolean DEFAULT true,
    "obrigatorio" boolean DEFAULT false,
    "unidade" "text",
    "imagem" "text"
);


ALTER TABLE "public"."produtos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."produtos_servicos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "valor" numeric NOT NULL,
    "descricao" "text",
    "imagem_url" "text"
);


ALTER TABLE "public"."produtos_servicos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "nome_admin" "text",
    "status_assinatura" "text" DEFAULT 'trial'::"text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "nome_profissional" "text",
    "tipo_fotografia" "text",
    "instagram" "text",
    "whatsapp_principal" "text",
    "email_recebimento" "text",
    "profile_image_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "nome" "text",
    "bio" "text",
    "user_id" "uuid",
    "apresentacao" "text",
    "data_expiracao_trial" timestamp with time zone,
    "terms_accepted_at" timestamp with time zone,
    "terms_version" "text" DEFAULT '1.0'::"text",
    "privacy_policy_accepted_at" timestamp with time zone,
    "tutorial_agenda_visto" boolean DEFAULT false,
    "tutorial_leads_visto" boolean DEFAULT false,
    "aceita_avaliacoes" boolean DEFAULT true,
    "aprovacao_automatica_avaliacoes" boolean DEFAULT false,
    "exibir_avaliacoes_publico" boolean DEFAULT true,
    "rating_minimo_exibicao" integer DEFAULT 1,
    "incentivo_avaliacao_ativo" boolean DEFAULT false,
    "incentivo_avaliacao_texto" "text",
    "media_avaliacoes" numeric(3,2),
    "total_avaliacoes" integer DEFAULT 0,
    "total_avaliacoes_visiveis" integer DEFAULT 0,
    "slug_usuario" character varying(50),
    "perfil_publico" boolean DEFAULT false,
    "visualizacoes_perfil" integer DEFAULT 0,
    "meta_description" "text",
    "exibir_botao_perfil_completo" boolean DEFAULT true,
    "tema_perfil" "text" DEFAULT 'original'::"text",
    CONSTRAINT "profiles_rating_minimo_exibicao_check" CHECK ((("rating_minimo_exibicao" >= 1) AND ("rating_minimo_exibicao" <= 5))),
    CONSTRAINT "profiles_tema_perfil_check" CHECK (("tema_perfil" = ANY (ARRAY['original'::"text", 'minimalist'::"text", 'modern'::"text", 'magazine'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."terms_accepted_at" IS 'Timestamp when user accepted Terms & Conditions. Required for LGPD/GDPR compliance.';



COMMENT ON COLUMN "public"."profiles"."terms_version" IS 'Version of Terms & Conditions that user accepted. Allows tracking consent for different versions.';



COMMENT ON COLUMN "public"."profiles"."privacy_policy_accepted_at" IS 'Timestamp when user accepted Privacy Policy. Required for LGPD/GDPR compliance.';



COMMENT ON COLUMN "public"."profiles"."tutorial_agenda_visto" IS 'Tracks whether user has viewed the Agenda tutorial. False triggers automatic display on first access.';



COMMENT ON COLUMN "public"."profiles"."tutorial_leads_visto" IS 'Tracks whether user has viewed the Leads tutorial. False triggers automatic display on first access.';



COMMENT ON COLUMN "public"."profiles"."slug_usuario" IS 'Username único para URL amigável do perfil público';



COMMENT ON COLUMN "public"."profiles"."perfil_publico" IS 'Define se o perfil está visível publicamente';



COMMENT ON COLUMN "public"."profiles"."visualizacoes_perfil" IS 'Contador total de visualizações do perfil público';



COMMENT ON COLUMN "public"."profiles"."exibir_botao_perfil_completo" IS 'Define se o botão "Ver Perfil Completo" aparece no cabeçalho dos orçamentos (QuotePage)';



CREATE TABLE IF NOT EXISTS "public"."template_audit" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "template_id" "uuid",
    "acao" "text",
    "detalhes" "jsonb",
    "registrado_em" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."template_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "titulo_template" "text",
    "configuracao_completa" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "custom_fields" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "nome_template" "text",
    "is_published" boolean DEFAULT false,
    "access_count" integer DEFAULT 0,
    "last_modified" timestamp with time zone DEFAULT "now"(),
    "public_url" "text",
    "nome" "text",
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "public_config" "jsonb",
    "whatsapp_notification_msg" "text",
    "ocultar_valores_intermediarios" boolean DEFAULT false,
    "texto_whatsapp" "text",
    "uuid" "text" DEFAULT ("gen_random_uuid"())::"text",
    "bloquear_campos_obrigatorios" boolean DEFAULT false,
    "sistema_sazonal_ativo" boolean DEFAULT true,
    "modal_info_deslocamento" "text",
    "whatsapp" "text",
    "sistema_geografico_ativo" boolean DEFAULT false,
    "tema" "text" DEFAULT 'moderno'::"text",
    "slug_template" character varying(100),
    "exibir_no_perfil" boolean DEFAULT true,
    "ordem_exibicao" integer DEFAULT 0,
    "layout_produtos" "text" DEFAULT 'lista'::"text" NOT NULL,
    "tamanho_imagem_grid" "text" DEFAULT 'medio'::"text" NOT NULL,
    "imagem_apresentacao_url" "text",
    "imagem_despedida_url" "text",
    CONSTRAINT "chk_layout_produtos" CHECK (("layout_produtos" = ANY (ARRAY['lista'::"text", 'grid'::"text"]))),
    CONSTRAINT "chk_tamanho_imagem_grid" CHECK (("tamanho_imagem_grid" = ANY (ARRAY['pequeno'::"text", 'medio'::"text", 'grande'::"text"]))),
    CONSTRAINT "templates_tema_check" CHECK (("tema" = ANY (ARRAY['moderno'::"text", 'classico'::"text", 'romantico'::"text", 'vibrante'::"text", 'escuro'::"text", 'natural'::"text", 'minimalista'::"text", 'studio'::"text", 'documento'::"text"])))
);


ALTER TABLE "public"."templates" OWNER TO "postgres";


COMMENT ON COLUMN "public"."templates"."uuid" IS 'Public UUID for template access via URLs';



COMMENT ON COLUMN "public"."templates"."bloquear_campos_obrigatorios" IS 'Quando TRUE, bloqueia produtos extras e WhatsApp até preencher campos obrigatórios';



COMMENT ON COLUMN "public"."templates"."sistema_sazonal_ativo" IS 'Enable/disable seasonal pricing adjustments (date-based pricing)';



COMMENT ON COLUMN "public"."templates"."sistema_geografico_ativo" IS 'Enable/disable geographic pricing adjustments (cities, states, countries)';



COMMENT ON COLUMN "public"."templates"."tema" IS 'Tema visual da página de orçamento: moderno (azul/clean), classico (preto/dourado), romantico (rosa/lavanda), vibrante (roxo/laranja), escuro (modo dark), natural (verde/âmbar), minimalista (cinza/espaços amplos), studio (rose/bronze)';



COMMENT ON COLUMN "public"."templates"."slug_template" IS 'Slug único do template dentro do escopo do usuário';



COMMENT ON COLUMN "public"."templates"."exibir_no_perfil" IS 'Define se o template aparece no perfil público';



COMMENT ON COLUMN "public"."templates"."ordem_exibicao" IS 'Ordem customizada de exibição do template no dashboard e perfil público';



COMMENT ON COLUMN "public"."templates"."layout_produtos" IS 'Define o layout de exibição dos produtos no orçamento (ex: "grid", "lista").';



COMMENT ON COLUMN "public"."templates"."tamanho_imagem_grid" IS 'Define o tamanho das imagens no layout grid (ex: "pequeno", "medio", "grande").';



CREATE TABLE IF NOT EXISTS "public"."temporadas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" character varying(100) NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date" NOT NULL,
    "template_id" "uuid",
    "multiplicador" numeric(5,2) DEFAULT 1.0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "ativo" boolean DEFAULT true,
    "descricao" "text",
    "cor" "text" DEFAULT '#3B82F6'::"text"
);


ALTER TABLE "public"."temporadas" OWNER TO "postgres";


COMMENT ON COLUMN "public"."temporadas"."cor" IS 'Hex color for visual display';



CREATE TABLE IF NOT EXISTS "public"."user_business_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "business_name" "text",
    "cnpj" "text",
    "address" "text",
    "city" "text",
    "state" "text",
    "zip_code" "text",
    "phone" "text",
    "email" "text",
    "pix_key" "text",
    "bank_name" "text",
    "bank_agency" "text",
    "bank_account" "text",
    "bank_account_type" "text",
    "additional_info" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "person_type" "text" DEFAULT 'juridica'::"text",
    "cpf" "text",
    "signature_base64" "text",
    "signature_created_at" timestamp with time zone,
    CONSTRAINT "user_business_settings_person_type_check" CHECK (("person_type" = ANY (ARRAY['fisica'::"text", 'juridica'::"text"])))
);


ALTER TABLE "public"."user_business_settings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."acrescimos_localidade"
    ADD CONSTRAINT "acrescimos_localidade_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."acrescimos_sazonais"
    ADD CONSTRAINT "acrescimos_sazonais_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agenda_config"
    ADD CONSTRAINT "agenda_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agenda_config"
    ADD CONSTRAINT "agenda_config_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."analytics_orcamentos"
    ADD CONSTRAINT "analytics_orcamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."avaliacoes"
    ADD CONSTRAINT "avaliacoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."avaliacoes"
    ADD CONSTRAINT "avaliacoes_token_validacao_key" UNIQUE ("token_validacao");



ALTER TABLE ONLY "public"."campos_cliente"
    ADD CONSTRAINT "campos_cliente_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_conversations"
    ADD CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cidades_ajuste"
    ADD CONSTRAINT "cidades_ajuste_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_categories"
    ADD CONSTRAINT "company_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_transactions"
    ADD CONSTRAINT "company_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."configuracao_agenda"
    ADD CONSTRAINT "configuracao_agenda_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."configuracao_agenda"
    ADD CONSTRAINT "configuracao_agenda_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."contract_templates"
    ADD CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."cupons"
    ADD CONSTRAINT "cupons_desconto_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."datas_bloqueadas"
    ADD CONSTRAINT "datas_bloqueadas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."datas_bloqueadas"
    ADD CONSTRAINT "datas_bloqueadas_user_id_data_bloqueada_key" UNIQUE ("user_id", "data_bloqueada");



ALTER TABLE ONLY "public"."estados"
    ADD CONSTRAINT "estados_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."eventos_agenda"
    ADD CONSTRAINT "eventos_agenda_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feriados"
    ADD CONSTRAINT "feriados_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feriados"
    ADD CONSTRAINT "feriados_user_id_data_key" UNIQUE ("user_id", "data");



ALTER TABLE ONLY "public"."formas_pagamento"
    ADD CONSTRAINT "formas_pagamento_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."historico_importacoes_calendario"
    ADD CONSTRAINT "historico_importacoes_calendario_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_token_avaliacao_key" UNIQUE ("token_avaliacao");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paises"
    ADD CONSTRAINT "paises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campos"
    ADD CONSTRAINT "perfis_campos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."periodos_bloqueados"
    ADD CONSTRAINT "periodos_bloqueados_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."priceus_leads"
    ADD CONSTRAINT "priceus_leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."priceus_price_rules"
    ADD CONSTRAINT "priceus_price_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."priceus_templates"
    ADD CONSTRAINT "priceus_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."produtos"
    ADD CONSTRAINT "produtos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."produtos_servicos"
    ADD CONSTRAINT "produtos_servicos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_slug_usuario_key" UNIQUE ("slug_usuario");



ALTER TABLE ONLY "public"."template_audit"
    ADD CONSTRAINT "template_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_user_slug_unique" UNIQUE ("user_id", "slug_template");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_uuid_key" UNIQUE ("uuid");



ALTER TABLE ONLY "public"."temporadas"
    ADD CONSTRAINT "temporadas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_business_settings"
    ADD CONSTRAINT "user_business_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_business_settings"
    ADD CONSTRAINT "user_business_settings_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_acrescimos_localidade_template" ON "public"."acrescimos_localidade" USING "btree" ("template_id");



CREATE INDEX "idx_acrescimos_sazonais_template" ON "public"."acrescimos_sazonais" USING "btree" ("template_id");



CREATE INDEX "idx_analytics_data_acesso" ON "public"."analytics_orcamentos" USING "btree" ("data_acesso");



CREATE INDEX "idx_analytics_template_id" ON "public"."analytics_orcamentos" USING "btree" ("template_id");



CREATE INDEX "idx_analytics_user_id" ON "public"."analytics_orcamentos" USING "btree" ("user_id");



CREATE INDEX "idx_avaliacoes_created_at" ON "public"."avaliacoes" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_avaliacoes_lead_id" ON "public"."avaliacoes" USING "btree" ("lead_id");



CREATE INDEX "idx_avaliacoes_profile_id" ON "public"."avaliacoes" USING "btree" ("profile_id");



CREATE INDEX "idx_avaliacoes_rating" ON "public"."avaliacoes" USING "btree" ("rating");



CREATE INDEX "idx_avaliacoes_token" ON "public"."avaliacoes" USING "btree" ("token_validacao");



CREATE INDEX "idx_avaliacoes_user_visible" ON "public"."avaliacoes" USING "btree" ("profile_id", "visivel");



CREATE INDEX "idx_avaliacoes_visivel" ON "public"."avaliacoes" USING "btree" ("visivel");



CREATE INDEX "idx_campos_cliente_template_id" ON "public"."campos_cliente" USING "btree" ("template_id");



CREATE INDEX "idx_campos_cliente_user_owner_id" ON "public"."campos_cliente" USING "btree" ("user_owner_id");



CREATE INDEX "idx_campos_template_id" ON "public"."campos" USING "btree" ("template_id");



CREATE INDEX "idx_chat_conversations_atendente_id" ON "public"."chat_conversations" USING "btree" ("atendente_id");



CREATE INDEX "idx_chat_conversations_status" ON "public"."chat_conversations" USING "btree" ("status");



CREATE INDEX "idx_chat_conversations_user_id" ON "public"."chat_conversations" USING "btree" ("user_id");



CREATE INDEX "idx_chat_messages_conversation_id" ON "public"."chat_messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_chat_messages_created_at" ON "public"."chat_messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_chat_messages_sender_id" ON "public"."chat_messages" USING "btree" ("sender_id");



CREATE INDEX "idx_cidades_ajuste_template" ON "public"."cidades_ajuste" USING "btree" ("template_id");



CREATE INDEX "idx_company_categories_user" ON "public"."company_categories" USING "btree" ("user_id");



CREATE INDEX "idx_company_categories_user_id" ON "public"."company_categories" USING "btree" ("user_id");



CREATE INDEX "idx_company_transactions_categoria" ON "public"."company_transactions" USING "btree" ("categoria_id");



CREATE INDEX "idx_company_transactions_data" ON "public"."company_transactions" USING "btree" ("data" DESC);



CREATE INDEX "idx_company_transactions_installment" ON "public"."company_transactions" USING "btree" ("is_installment", "parent_transaction_id");



CREATE INDEX "idx_company_transactions_lead" ON "public"."company_transactions" USING "btree" ("lead_id");



CREATE INDEX "idx_company_transactions_parent" ON "public"."company_transactions" USING "btree" ("parent_transaction_id");



CREATE INDEX "idx_company_transactions_status" ON "public"."company_transactions" USING "btree" ("status");



CREATE INDEX "idx_company_transactions_tipo" ON "public"."company_transactions" USING "btree" ("tipo");



CREATE INDEX "idx_company_transactions_user_data" ON "public"."company_transactions" USING "btree" ("user_id", "data" DESC, "status");



CREATE INDEX "idx_company_transactions_user_id" ON "public"."company_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_configuracao_agenda_user_id" ON "public"."configuracao_agenda" USING "btree" ("user_id");



CREATE INDEX "idx_contract_templates_user" ON "public"."contract_templates" USING "btree" ("user_id");



CREATE INDEX "idx_contract_templates_user_id" ON "public"."contract_templates" USING "btree" ("user_id");



CREATE INDEX "idx_contracts_expires_at" ON "public"."contracts" USING "btree" ("expires_at");



CREATE INDEX "idx_contracts_lead_id" ON "public"."contracts" USING "btree" ("lead_id");



CREATE INDEX "idx_contracts_status" ON "public"."contracts" USING "btree" ("status");



CREATE INDEX "idx_contracts_template_id" ON "public"."contracts" USING "btree" ("template_id");



CREATE INDEX "idx_contracts_token" ON "public"."contracts" USING "btree" ("token");



CREATE INDEX "idx_contracts_user_id" ON "public"."contracts" USING "btree" ("user_id");



CREATE INDEX "idx_contracts_user_status" ON "public"."contracts" USING "btree" ("user_id", "status");



CREATE INDEX "idx_cupons_ativo" ON "public"."cupons" USING "btree" ("ativo") WHERE ("ativo" = true);



CREATE INDEX "idx_cupons_template_ativo" ON "public"."cupons" USING "btree" ("template_id", "ativo");



CREATE INDEX "idx_cupons_template_codigo" ON "public"."cupons" USING "btree" ("template_id", "codigo");



CREATE INDEX "idx_cupons_template_id" ON "public"."cupons" USING "btree" ("template_id");



CREATE INDEX "idx_datas_bloqueadas_data" ON "public"."datas_bloqueadas" USING "btree" ("data_bloqueada");



CREATE INDEX "idx_datas_bloqueadas_user_data" ON "public"."datas_bloqueadas" USING "btree" ("user_id", "data_bloqueada");



CREATE INDEX "idx_datas_bloqueadas_user_id" ON "public"."datas_bloqueadas" USING "btree" ("user_id");



CREATE INDEX "idx_estados_ativo" ON "public"."estados" USING "btree" ("ativo") WHERE ("ativo" = true);



CREATE INDEX "idx_eventos_agenda_data_evento" ON "public"."eventos_agenda" USING "btree" ("data_evento");



CREATE INDEX "idx_eventos_agenda_importacao_id" ON "public"."eventos_agenda" USING "btree" ("importacao_id");



CREATE INDEX "idx_eventos_agenda_status_data" ON "public"."eventos_agenda" USING "btree" ("status", "data_evento") WHERE ("status" = ANY (ARRAY['confirmado'::"text", 'pendente'::"text"]));



CREATE INDEX "idx_eventos_agenda_user_data" ON "public"."eventos_agenda" USING "btree" ("user_id", "data_evento");



CREATE INDEX "idx_eventos_agenda_user_data_status" ON "public"."eventos_agenda" USING "btree" ("user_id", "data_evento", "status");



CREATE INDEX "idx_eventos_agenda_user_id" ON "public"."eventos_agenda" USING "btree" ("user_id");



CREATE INDEX "idx_eventos_agenda_user_status_data" ON "public"."eventos_agenda" USING "btree" ("user_id", "status", "data_evento");



CREATE INDEX "idx_feriados_data" ON "public"."feriados" USING "btree" ("data");



CREATE INDEX "idx_feriados_user_ativo" ON "public"."feriados" USING "btree" ("user_id", "ativo");



CREATE INDEX "idx_feriados_user_data" ON "public"."feriados" USING "btree" ("user_id", "data");



CREATE INDEX "idx_feriados_user_id" ON "public"."feriados" USING "btree" ("user_id");



CREATE INDEX "idx_historico_importacoes_created_at" ON "public"."historico_importacoes_calendario" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_historico_importacoes_user_id" ON "public"."historico_importacoes_calendario" USING "btree" ("user_id");



CREATE INDEX "idx_leads_avaliacao_id" ON "public"."leads" USING "btree" ("avaliacao_id");



CREATE INDEX "idx_leads_deleted_at" ON "public"."leads" USING "btree" ("deleted_at");



CREATE INDEX "idx_leads_lgpd_consent" ON "public"."leads" USING "btree" ("lgpd_consent_timestamp") WHERE ("lgpd_consent_timestamp" IS NOT NULL);



CREATE INDEX "idx_leads_pode_avaliar" ON "public"."leads" USING "btree" ("pode_avaliar");



CREATE INDEX "idx_leads_template_id" ON "public"."leads" USING "btree" ("template_id");



CREATE INDEX "idx_leads_token_avaliacao" ON "public"."leads" USING "btree" ("token_avaliacao");



CREATE INDEX "idx_leads_user_created" ON "public"."leads" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_leads_user_id" ON "public"."leads" USING "btree" ("user_id");



CREATE INDEX "idx_leads_user_status_created" ON "public"."leads" USING "btree" ("user_id", "status", "created_at" DESC);



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_is_read" ON "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "idx_notifications_related_id" ON "public"."notifications" USING "btree" ("related_id");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_paises_ativo" ON "public"."paises" USING "btree" ("ativo") WHERE ("ativo" = true);



CREATE INDEX "idx_priceus_leads_template_id" ON "public"."priceus_leads" USING "btree" ("template_id");



CREATE INDEX "idx_priceus_leads_user_id" ON "public"."priceus_leads" USING "btree" ("user_id");



CREATE INDEX "idx_priceus_price_rules_template_id" ON "public"."priceus_price_rules" USING "btree" ("template_id");



CREATE INDEX "idx_priceus_templates_user_id" ON "public"."priceus_templates" USING "btree" ("user_id");



CREATE INDEX "idx_products_template" ON "public"."produtos" USING "btree" ("template_id");



CREATE INDEX "idx_produtos_servicos_user_id" ON "public"."produtos_servicos" USING "btree" ("user_id");



CREATE INDEX "idx_produtos_template_id" ON "public"."produtos" USING "btree" ("template_id");



CREATE INDEX "idx_produtos_user_id" ON "public"."produtos" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_id_status" ON "public"."profiles" USING "btree" ("id", "status_assinatura", "data_expiracao_trial");



CREATE INDEX "idx_profiles_slug_usuario" ON "public"."profiles" USING "btree" ("slug_usuario");



CREATE INDEX "idx_profiles_terms_accepted" ON "public"."profiles" USING "btree" ("terms_accepted_at") WHERE ("terms_accepted_at" IS NOT NULL);



CREATE INDEX "idx_profiles_terms_version" ON "public"."profiles" USING "btree" ("terms_version");



CREATE INDEX "idx_profiles_tutorial_agenda" ON "public"."profiles" USING "btree" ("tutorial_agenda_visto") WHERE ("tutorial_agenda_visto" = false);



CREATE INDEX "idx_profiles_tutorial_leads" ON "public"."profiles" USING "btree" ("tutorial_leads_visto") WHERE ("tutorial_leads_visto" = false);



CREATE INDEX "idx_templates_slug_template" ON "public"."templates" USING "btree" ("slug_template");



CREATE INDEX "idx_templates_user_created" ON "public"."templates" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_templates_user_ordem" ON "public"."templates" USING "btree" ("user_id", "ordem_exibicao", "created_at" DESC);



CREATE INDEX "idx_templates_user_slug" ON "public"."templates" USING "btree" ("user_id", "slug_template");



CREATE INDEX "idx_templates_uuid" ON "public"."templates" USING "btree" ("uuid");



CREATE INDEX "idx_user_business_settings_user_id" ON "public"."user_business_settings" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_yearly_metrics_unique" ON "public"."company_yearly_metrics" USING "btree" ("user_id", "year", "tipo");



CREATE UNIQUE INDEX "templates_public_url_idx" ON "public"."templates" USING "btree" ("public_url");



CREATE UNIQUE INDEX "uq_cupons_codigo_user" ON "public"."cupons" USING "btree" ("user_id", "codigo");



CREATE OR REPLACE TRIGGER "Notifications" BEFORE INSERT OR UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_notifications_updated_at"();



CREATE OR REPLACE TRIGGER "on_agenda_config_updated" BEFORE UPDATE ON "public"."agenda_config" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_new_notification_send_email" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_send_email_notification"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at" BEFORE UPDATE ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_atualizar_estatisticas_avaliacoes" AFTER INSERT OR DELETE OR UPDATE ON "public"."avaliacoes" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_estatisticas_avaliacoes"();



CREATE OR REPLACE TRIGGER "trigger_update_last_message" AFTER INSERT ON "public"."chat_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_last_message"();



CREATE OR REPLACE TRIGGER "update_company_transactions_updated_at_trigger" BEFORE UPDATE ON "public"."company_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_company_transactions_updated_at"();



CREATE OR REPLACE TRIGGER "update_configuracao_agenda_updated_at" BEFORE UPDATE ON "public"."configuracao_agenda" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_contract_templates_updated_at" BEFORE UPDATE ON "public"."contract_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_contracts_updated_at" BEFORE UPDATE ON "public"."contracts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_eventos_agenda_updated_at" BEFORE UPDATE ON "public"."eventos_agenda" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_feriados_updated_at" BEFORE UPDATE ON "public"."feriados" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notifications_updated_at_trigger" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_notifications_updated_at"();



CREATE OR REPLACE TRIGGER "update_user_business_settings_updated_at_trigger" BEFORE UPDATE ON "public"."user_business_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_business_settings_updated_at"();



ALTER TABLE ONLY "public"."acrescimos_localidade"
    ADD CONSTRAINT "acrescimos_localidade_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."acrescimos_localidade"
    ADD CONSTRAINT "acrescimos_localidade_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."acrescimos_sazonais"
    ADD CONSTRAINT "acrescimos_sazonais_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."acrescimos_sazonais"
    ADD CONSTRAINT "acrescimos_sazonais_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agenda_config"
    ADD CONSTRAINT "agenda_config_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analytics_orcamentos"
    ADD CONSTRAINT "analytics_orcamentos_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analytics_orcamentos"
    ADD CONSTRAINT "analytics_orcamentos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."avaliacoes"
    ADD CONSTRAINT "avaliacoes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."avaliacoes"
    ADD CONSTRAINT "avaliacoes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campos_cliente"
    ADD CONSTRAINT "campos_cliente_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campos_cliente"
    ADD CONSTRAINT "campos_cliente_user_owner_id_fkey" FOREIGN KEY ("user_owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campos"
    ADD CONSTRAINT "campos_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_conversations"
    ADD CONSTRAINT "chat_conversations_atendente_id_fkey" FOREIGN KEY ("atendente_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_conversations"
    ADD CONSTRAINT "chat_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cidades_ajuste"
    ADD CONSTRAINT "cidades_ajuste_estado_id_fkey" FOREIGN KEY ("estado_id") REFERENCES "public"."estados"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cidades_ajuste"
    ADD CONSTRAINT "cidades_ajuste_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cidades_ajuste"
    ADD CONSTRAINT "cidades_ajuste_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_categories"
    ADD CONSTRAINT "company_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_transactions"
    ADD CONSTRAINT "company_transactions_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."company_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_transactions"
    ADD CONSTRAINT "company_transactions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_transactions"
    ADD CONSTRAINT "company_transactions_parent_transaction_id_fkey" FOREIGN KEY ("parent_transaction_id") REFERENCES "public"."company_transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_transactions"
    ADD CONSTRAINT "company_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."configuracao_agenda"
    ADD CONSTRAINT "configuracao_agenda_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_templates"
    ADD CONSTRAINT "contract_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."contract_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cupons"
    ADD CONSTRAINT "cupons_desconto_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cupons"
    ADD CONSTRAINT "cupons_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."datas_bloqueadas"
    ADD CONSTRAINT "datas_bloqueadas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."estados"
    ADD CONSTRAINT "estados_pais_id_fkey" FOREIGN KEY ("pais_id") REFERENCES "public"."paises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."estados"
    ADD CONSTRAINT "estados_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."eventos_agenda"
    ADD CONSTRAINT "eventos_agenda_importacao_id_fkey" FOREIGN KEY ("importacao_id") REFERENCES "public"."historico_importacoes_calendario"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."eventos_agenda"
    ADD CONSTRAINT "eventos_agenda_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feriados"
    ADD CONSTRAINT "feriados_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."formas_pagamento"
    ADD CONSTRAINT "formas_pagamento_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."formas_pagamento"
    ADD CONSTRAINT "formas_pagamento_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."historico_importacoes_calendario"
    ADD CONSTRAINT "historico_importacoes_calendario_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_avaliacao_id_fkey" FOREIGN KEY ("avaliacao_id") REFERENCES "public"."avaliacoes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."paises"
    ADD CONSTRAINT "paises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campos"
    ADD CONSTRAINT "perfis_campos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."periodos_bloqueados"
    ADD CONSTRAINT "periodos_bloqueados_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."priceus_leads"
    ADD CONSTRAINT "priceus_leads_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."priceus_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."priceus_leads"
    ADD CONSTRAINT "priceus_leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."priceus_price_rules"
    ADD CONSTRAINT "priceus_price_rules_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."priceus_templates"
    ADD CONSTRAINT "priceus_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."produtos_servicos"
    ADD CONSTRAINT "produtos_servicos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."produtos"
    ADD CONSTRAINT "produtos_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."temporadas"
    ADD CONSTRAINT "temporadas_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_business_settings"
    ADD CONSTRAINT "user_business_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can create own agenda config" ON "public"."configuracao_agenda" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can create their own agenda config." ON "public"."configuracao_agenda" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can delete their own agenda config." ON "public"."configuracao_agenda" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can update own agenda config" ON "public"."configuracao_agenda" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can update their own agenda config." ON "public"."configuracao_agenda" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can view own analytics sessions" ON "public"."analytics_orcamentos" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can view their own agenda config." ON "public"."configuracao_agenda" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Avaliacoes visiveis sao publicas" ON "public"."avaliacoes" FOR SELECT USING (("visivel" = true));



CREATE POLICY "Criar avaliacao com token valido" ON "public"."avaliacoes" FOR INSERT WITH CHECK (true);



CREATE POLICY "Deny direct insert for analytics_orcamentos" ON "public"."analytics_orcamentos" FOR INSERT WITH CHECK (false);



CREATE POLICY "Enable insert for all users" ON "public"."campos_cliente" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Enable update for signing" ON "public"."contracts" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Fornecedor pode atualizar suas avaliacoes" ON "public"."avaliacoes" FOR UPDATE TO "authenticated" USING (("profile_id" = "auth"."uid"())) WITH CHECK (("profile_id" = "auth"."uid"()));



CREATE POLICY "Fornecedor pode deletar suas avaliacoes" ON "public"."avaliacoes" FOR DELETE TO "authenticated" USING (("profile_id" = "auth"."uid"()));



CREATE POLICY "Fornecedor pode ver suas avaliacoes" ON "public"."avaliacoes" FOR SELECT TO "authenticated" USING (("profile_id" = "auth"."uid"()));



CREATE POLICY "Fotografos podem atualizar seus proprios leads" ON "public"."leads" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Fotografos podem deletar seus proprios leads" ON "public"."leads" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Fotografos podem ver seus proprios leads" ON "public"."leads" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Nenhuma insercao direta permitida" ON "public"."leads" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "Perfis públicos podem ser visualizados por todos" ON "public"."profiles" FOR SELECT USING (("perfil_publico" = true));



CREATE POLICY "Public can update contracts by token" ON "public"."contracts" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Public can view contracts by token" ON "public"."contracts" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Templates públicos podem ser visualizados por todos" ON "public"."templates" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "templates"."user_id") AND ("profiles"."perfil_publico" = true)))) AND ("exibir_no_perfil" = true)));



CREATE POLICY "Users can create own contracts" ON "public"."contracts" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own templates" ON "public"."contract_templates" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own agenda config" ON "public"."configuracao_agenda" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own blocked dates" ON "public"."datas_bloqueadas" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own business settings" ON "public"."user_business_settings" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own categories" ON "public"."company_categories" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own contracts" ON "public"."contracts" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own events" ON "public"."eventos_agenda" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own holidays" ON "public"."feriados" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own import history" ON "public"."historico_importacoes_calendario" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own templates" ON "public"."contract_templates" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own transactions" ON "public"."company_transactions" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own notifications" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own agenda config" ON "public"."configuracao_agenda" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own blocked dates" ON "public"."datas_bloqueadas" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own business settings" ON "public"."user_business_settings" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own categories" ON "public"."company_categories" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own events" ON "public"."eventos_agenda" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own holidays" ON "public"."feriados" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own import history" ON "public"."historico_importacoes_calendario" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own transactions" ON "public"."company_transactions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own notifications" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own agenda config" ON "public"."configuracao_agenda" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own blocked dates" ON "public"."datas_bloqueadas" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own business settings" ON "public"."user_business_settings" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own categories" ON "public"."company_categories" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own contracts" ON "public"."contracts" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own events" ON "public"."eventos_agenda" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own holidays" ON "public"."feriados" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own templates" ON "public"."contract_templates" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own transactions" ON "public"."company_transactions" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own agenda config" ON "public"."configuracao_agenda" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own blocked dates" ON "public"."datas_bloqueadas" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own business settings" ON "public"."user_business_settings" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own categories" ON "public"."company_categories" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own contracts" ON "public"."contracts" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own events" ON "public"."eventos_agenda" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own holidays" ON "public"."feriados" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own import history" ON "public"."historico_importacoes_calendario" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own templates" ON "public"."contract_templates" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own transactions" ON "public"."company_transactions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem atualizar sua própria config de agenda" ON "public"."configuracao_agenda" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem atualizar suas conversas" ON "public"."chat_conversations" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem criar conversas" ON "public"."chat_conversations" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem criar sua própria config de agenda" ON "public"."configuracao_agenda" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem enviar mensagens em suas conversas" ON "public"."chat_messages" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."chat_conversations"
  WHERE (("chat_conversations"."id" = "chat_messages"."conversation_id") AND ("chat_conversations"."user_id" = "auth"."uid"())))) AND ("auth"."uid"() = "sender_id")));



CREATE POLICY "Usuários podem inserir analytics de seus templates" ON "public"."analytics_orcamentos" FOR INSERT WITH CHECK (true);



CREATE POLICY "Usuários podem marcar suas mensagens como lidas" ON "public"."chat_messages" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."chat_conversations"
  WHERE (("chat_conversations"."id" = "chat_messages"."conversation_id") AND ("chat_conversations"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."chat_conversations"
  WHERE (("chat_conversations"."id" = "chat_messages"."conversation_id") AND ("chat_conversations"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem ver mensagens de suas conversas" ON "public"."chat_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."chat_conversations"
  WHERE (("chat_conversations"."id" = "chat_messages"."conversation_id") AND ("chat_conversations"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem ver sua própria config de agenda" ON "public"."configuracao_agenda" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem ver suas próprias conversas" ON "public"."chat_conversations" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem visualizar analytics de seus templates" ON "public"."analytics_orcamentos" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."acrescimos_localidade" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "acrescimos_localidade_owner_all" ON "public"."acrescimos_localidade" TO "authenticated" USING (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "acrescimos_localidade_public_read" ON "public"."acrescimos_localidade" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."acrescimos_sazonais" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "acrescimos_sazonais_owner_all" ON "public"."acrescimos_sazonais" TO "authenticated" USING (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "acrescimos_sazonais_public_read" ON "public"."acrescimos_sazonais" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."analytics_orcamentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."avaliacoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campos_cliente" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "campos_cliente_owner_delete" ON "public"."campos_cliente" FOR DELETE TO "authenticated" USING ((("user_owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "campos_cliente_owner_read" ON "public"."campos_cliente" FOR SELECT TO "authenticated" USING (("user_owner_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "campos_cliente_owner_select" ON "public"."campos_cliente" FOR SELECT TO "authenticated" USING ((("user_owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "campos_cliente_owner_update" ON "public"."campos_cliente" FOR UPDATE TO "authenticated" USING ((("user_owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((("user_owner_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "campos_cliente_public_insert" ON "public"."campos_cliente" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "campos_owner_delete" ON "public"."campos" FOR DELETE TO "authenticated" USING (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "campos_owner_insert" ON "public"."campos" FOR INSERT TO "authenticated" WITH CHECK (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "campos_owner_update" ON "public"."campos" FOR UPDATE TO "authenticated" USING (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "campos_public_read" ON "public"."campos" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."chat_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cidades_ajuste" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cidades_owner_all" ON "public"."cidades_ajuste" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."company_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."configuracao_agenda" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contract_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contracts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cupons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cupons_owner_delete" ON "public"."cupons" FOR DELETE TO "authenticated" USING (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "cupons_owner_insert" ON "public"."cupons" FOR INSERT TO "authenticated" WITH CHECK (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "cupons_owner_update" ON "public"."cupons" FOR UPDATE TO "authenticated" USING (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "cupons_public_read" ON "public"."cupons" FOR SELECT TO "authenticated", "anon" USING (("ativo" = true));



ALTER TABLE "public"."datas_bloqueadas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."estados" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "estados_owner_all" ON "public"."estados" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."eventos_agenda" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feriados" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."formas_pagamento" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "formas_pagamento_owner_delete" ON "public"."formas_pagamento" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "formas_pagamento_owner_insert" ON "public"."formas_pagamento" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "formas_pagamento_owner_update" ON "public"."formas_pagamento" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "formas_pagamento_public_read" ON "public"."formas_pagamento" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "geographic_public_read" ON "public"."cidades_ajuste" FOR SELECT USING (true);



CREATE POLICY "geographic_public_read" ON "public"."estados" FOR SELECT USING (true);



CREATE POLICY "geographic_public_read" ON "public"."paises" FOR SELECT USING (true);



ALTER TABLE "public"."historico_importacoes_calendario" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "leads_delete_admin" ON "public"."leads" FOR DELETE TO "authenticated" USING ((( SELECT ("auth"."jwt"() ->> 'user_role'::"text")) = 'admin'::"text"));



CREATE POLICY "leads_delete_owner" ON "public"."leads" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "leads_insert_owner" ON "public"."leads" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "leads_owner_all" ON "public"."leads" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "leads_owner_read" ON "public"."leads" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "leads_public_insert" ON "public"."leads" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "leads_select_admin" ON "public"."leads" FOR SELECT TO "authenticated" USING ((( SELECT ("auth"."jwt"() ->> 'user_role'::"text")) = 'admin'::"text"));



CREATE POLICY "leads_select_owner" ON "public"."leads" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "leads_soft_delete_owner" ON "public"."leads" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (true);



CREATE POLICY "leads_update_admin" ON "public"."leads" FOR UPDATE TO "authenticated" USING ((( SELECT ("auth"."jwt"() ->> 'user_role'::"text")) = 'admin'::"text")) WITH CHECK ((( SELECT ("auth"."jwt"() ->> 'user_role'::"text")) = 'admin'::"text"));



CREATE POLICY "leads_update_owner" ON "public"."leads" FOR UPDATE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("deleted_at" IS NULL))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paises" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "paises_owner_all" ON "public"."paises" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."priceus_leads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "priceus_leads_owner_read" ON "public"."priceus_leads" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "priceus_leads_public_insert" ON "public"."priceus_leads" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



ALTER TABLE "public"."priceus_price_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "priceus_price_rules_owner_all" ON "public"."priceus_price_rules" TO "authenticated" USING (("template_id" IN ( SELECT "priceus_templates"."id"
   FROM "public"."priceus_templates"
  WHERE ("priceus_templates"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (("template_id" IN ( SELECT "priceus_templates"."id"
   FROM "public"."priceus_templates"
  WHERE ("priceus_templates"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."priceus_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "priceus_templates_owner_all" ON "public"."priceus_templates" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."produtos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "produtos_owner_delete" ON "public"."produtos" FOR DELETE TO "authenticated" USING (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "produtos_owner_insert" ON "public"."produtos" FOR INSERT TO "authenticated" WITH CHECK (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "produtos_owner_update" ON "public"."produtos" FOR UPDATE TO "authenticated" USING (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "produtos_public_read" ON "public"."produtos" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."produtos_servicos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "produtos_servicos_owner_all" ON "public"."produtos_servicos" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_authenticated_delete" ON "public"."profiles" FOR DELETE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "profiles_authenticated_insert" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "profiles_authenticated_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "profiles_public_read" ON "public"."profiles" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."template_audit" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "template_audit_owner_read" ON "public"."template_audit" FOR SELECT TO "authenticated" USING (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "templates_owner_delete" ON "public"."templates" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "templates_owner_insert" ON "public"."templates" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "templates_owner_update" ON "public"."templates" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "templates_public_read" ON "public"."templates" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."temporadas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "temporadas_owner_all" ON "public"."temporadas" TO "authenticated" USING (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (("template_id" IN ( SELECT "templates"."id"
   FROM "public"."templates"
  WHERE ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "temporadas_public_read" ON "public"."temporadas" FOR SELECT USING (("ativo" = true));



ALTER TABLE "public"."user_business_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_update_own_notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































REVOKE ALL ON FUNCTION "public"."admin_hard_delete_lead"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_hard_delete_lead"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_hard_delete_lead"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_hard_delete_lead"("p_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_restore_lead"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_restore_lead"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_restore_lead"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_restore_lead"("p_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_restore_leads_by_user"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_restore_leads_by_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_restore_leads_by_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_restore_leads_by_user"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."atualizar_estatisticas_avaliacoes"() TO "anon";
GRANT ALL ON FUNCTION "public"."atualizar_estatisticas_avaliacoes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."atualizar_estatisticas_avaliacoes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calcular_preco_com_ajuste_geografico"("preco_base" numeric, "cidade_nome" "text", "template_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calcular_preco_com_ajuste_geografico"("preco_base" numeric, "cidade_nome" "text", "template_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calcular_preco_com_ajuste_geografico"("preco_base" numeric, "cidade_nome" "text", "template_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calcular_preco_com_ajuste_sazonal"("preco_base" numeric, "data_evento" "date", "template_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calcular_preco_com_ajuste_sazonal"("preco_base" numeric, "data_evento" "date", "template_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calcular_preco_com_ajuste_sazonal"("preco_base" numeric, "data_evento" "date", "template_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calcular_preco_final"("preco_base" numeric, "cidade_nome" "text", "data_evento" "date", "template_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calcular_preco_final"("preco_base" numeric, "cidade_nome" "text", "data_evento" "date", "template_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calcular_preco_final"("preco_base" numeric, "cidade_nome" "text", "data_evento" "date", "template_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_date_availability"("p_user_id" "uuid", "p_data_evento" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."check_date_availability"("p_user_id" "uuid", "p_data_evento" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_date_availability"("p_user_id" "uuid", "p_data_evento" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."count_unread_messages"("conversation_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."count_unread_messages"("conversation_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_unread_messages"("conversation_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification"("user_id_param" "uuid", "title_param" "text", "message_param" "text", "type_param" "text", "data_param" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification"("user_id_param" "uuid", "title_param" "text", "message_param" "text", "type_param" "text", "data_param" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("user_id_param" "uuid", "title_param" "text", "message_param" "text", "type_param" "text", "data_param" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."gerar_token_avaliacao"("lead_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."gerar_token_avaliacao"("lead_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gerar_token_avaliacao"("lead_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_blocked_dates"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_blocked_dates"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_blocked_dates"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_contract_data"("p_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_contract_data"("p_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_contract_data"("p_token" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_profile_views"("profile_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_profile_views"("profile_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_profile_views"("profile_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."limpar_todos_eventos"("p_user_id" "uuid", "p_incluir_manuais" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."limpar_todos_eventos"("p_user_id" "uuid", "p_incluir_manuais" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."limpar_todos_eventos"("p_user_id" "uuid", "p_incluir_manuais" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_all_notifications_as_read"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_as_read"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_as_read"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notification_as_read"("notification_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notification_as_read"("notification_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notification_as_read"("notification_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_company_yearly_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_company_yearly_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_company_yearly_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rollback_importacao"("p_importacao_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rollback_importacao"("p_importacao_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rollback_importacao"("p_importacao_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_default_company_categories"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_default_company_categories"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_default_company_categories"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_send_email_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_send_email_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_send_email_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_company_transactions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_company_transactions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_company_transactions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_formas_pagamento_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_formas_pagamento_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_formas_pagamento_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_notifications_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_notifications_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_notifications_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_business_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_business_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_business_settings_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."acrescimos_localidade" TO "anon";
GRANT ALL ON TABLE "public"."acrescimos_localidade" TO "authenticated";
GRANT ALL ON TABLE "public"."acrescimos_localidade" TO "service_role";



GRANT ALL ON TABLE "public"."acrescimos_sazonais" TO "anon";
GRANT ALL ON TABLE "public"."acrescimos_sazonais" TO "authenticated";
GRANT ALL ON TABLE "public"."acrescimos_sazonais" TO "service_role";



GRANT ALL ON TABLE "public"."agenda_config" TO "anon";
GRANT ALL ON TABLE "public"."agenda_config" TO "authenticated";
GRANT ALL ON TABLE "public"."agenda_config" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_orcamentos" TO "anon";
GRANT ALL ON TABLE "public"."analytics_orcamentos" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_orcamentos" TO "service_role";



GRANT ALL ON TABLE "public"."avaliacoes" TO "anon";
GRANT ALL ON TABLE "public"."avaliacoes" TO "authenticated";
GRANT ALL ON TABLE "public"."avaliacoes" TO "service_role";



GRANT ALL ON TABLE "public"."campos" TO "anon";
GRANT ALL ON TABLE "public"."campos" TO "authenticated";
GRANT ALL ON TABLE "public"."campos" TO "service_role";



GRANT ALL ON TABLE "public"."campos_cliente" TO "anon";
GRANT ALL ON TABLE "public"."campos_cliente" TO "authenticated";
GRANT ALL ON TABLE "public"."campos_cliente" TO "service_role";



GRANT ALL ON SEQUENCE "public"."campos_cliente_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."campos_cliente_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."campos_cliente_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."chat_conversations" TO "anon";
GRANT ALL ON TABLE "public"."chat_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."cidades_ajuste" TO "anon";
GRANT ALL ON TABLE "public"."cidades_ajuste" TO "authenticated";
GRANT ALL ON TABLE "public"."cidades_ajuste" TO "service_role";



GRANT ALL ON TABLE "public"."company_categories" TO "anon";
GRANT ALL ON TABLE "public"."company_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."company_categories" TO "service_role";



GRANT ALL ON TABLE "public"."company_transactions" TO "anon";
GRANT ALL ON TABLE "public"."company_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."company_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."company_yearly_metrics" TO "anon";
GRANT ALL ON TABLE "public"."company_yearly_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."company_yearly_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."configuracao_agenda" TO "anon";
GRANT ALL ON TABLE "public"."configuracao_agenda" TO "authenticated";
GRANT ALL ON TABLE "public"."configuracao_agenda" TO "service_role";



GRANT ALL ON TABLE "public"."contract_templates" TO "anon";
GRANT ALL ON TABLE "public"."contract_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_templates" TO "service_role";



GRANT ALL ON TABLE "public"."contracts" TO "anon";
GRANT ALL ON TABLE "public"."contracts" TO "authenticated";
GRANT ALL ON TABLE "public"."contracts" TO "service_role";



GRANT ALL ON TABLE "public"."cupons" TO "anon";
GRANT ALL ON TABLE "public"."cupons" TO "authenticated";
GRANT ALL ON TABLE "public"."cupons" TO "service_role";



GRANT ALL ON TABLE "public"."datas_bloqueadas" TO "anon";
GRANT ALL ON TABLE "public"."datas_bloqueadas" TO "authenticated";
GRANT ALL ON TABLE "public"."datas_bloqueadas" TO "service_role";



GRANT ALL ON TABLE "public"."estados" TO "anon";
GRANT ALL ON TABLE "public"."estados" TO "authenticated";
GRANT ALL ON TABLE "public"."estados" TO "service_role";



GRANT ALL ON TABLE "public"."eventos_agenda" TO "anon";
GRANT ALL ON TABLE "public"."eventos_agenda" TO "authenticated";
GRANT ALL ON TABLE "public"."eventos_agenda" TO "service_role";



GRANT ALL ON TABLE "public"."eventos_ativos_por_usuario" TO "anon";
GRANT ALL ON TABLE "public"."eventos_ativos_por_usuario" TO "authenticated";
GRANT ALL ON TABLE "public"."eventos_ativos_por_usuario" TO "service_role";



GRANT ALL ON TABLE "public"."feriados" TO "anon";
GRANT ALL ON TABLE "public"."feriados" TO "authenticated";
GRANT ALL ON TABLE "public"."feriados" TO "service_role";



GRANT ALL ON TABLE "public"."formas_pagamento" TO "anon";
GRANT ALL ON TABLE "public"."formas_pagamento" TO "authenticated";
GRANT ALL ON TABLE "public"."formas_pagamento" TO "service_role";



GRANT ALL ON TABLE "public"."historico_importacoes_calendario" TO "anon";
GRANT ALL ON TABLE "public"."historico_importacoes_calendario" TO "authenticated";
GRANT ALL ON TABLE "public"."historico_importacoes_calendario" TO "service_role";



GRANT ALL ON TABLE "public"."leads" TO "anon";
GRANT ALL ON TABLE "public"."leads" TO "authenticated";
GRANT ALL ON TABLE "public"."leads" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."paises" TO "anon";
GRANT ALL ON TABLE "public"."paises" TO "authenticated";
GRANT ALL ON TABLE "public"."paises" TO "service_role";



GRANT ALL ON TABLE "public"."periodos_bloqueados" TO "anon";
GRANT ALL ON TABLE "public"."periodos_bloqueados" TO "authenticated";
GRANT ALL ON TABLE "public"."periodos_bloqueados" TO "service_role";



GRANT ALL ON TABLE "public"."priceus_leads" TO "anon";
GRANT ALL ON TABLE "public"."priceus_leads" TO "authenticated";
GRANT ALL ON TABLE "public"."priceus_leads" TO "service_role";



GRANT ALL ON TABLE "public"."priceus_price_rules" TO "anon";
GRANT ALL ON TABLE "public"."priceus_price_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."priceus_price_rules" TO "service_role";



GRANT ALL ON TABLE "public"."priceus_templates" TO "anon";
GRANT ALL ON TABLE "public"."priceus_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."priceus_templates" TO "service_role";



GRANT ALL ON TABLE "public"."produtos" TO "anon";
GRANT ALL ON TABLE "public"."produtos" TO "authenticated";
GRANT ALL ON TABLE "public"."produtos" TO "service_role";



GRANT ALL ON TABLE "public"."produtos_servicos" TO "anon";
GRANT ALL ON TABLE "public"."produtos_servicos" TO "authenticated";
GRANT ALL ON TABLE "public"."produtos_servicos" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."template_audit" TO "anon";
GRANT ALL ON TABLE "public"."template_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."template_audit" TO "service_role";



GRANT ALL ON TABLE "public"."templates" TO "anon";
GRANT ALL ON TABLE "public"."templates" TO "authenticated";
GRANT ALL ON TABLE "public"."templates" TO "service_role";



GRANT ALL ON TABLE "public"."temporadas" TO "anon";
GRANT ALL ON TABLE "public"."temporadas" TO "authenticated";
GRANT ALL ON TABLE "public"."temporadas" TO "service_role";



GRANT ALL ON TABLE "public"."user_business_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_business_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_business_settings" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































