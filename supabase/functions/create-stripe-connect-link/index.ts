import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.12.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
let stripe: Stripe | null = null;

if (stripeKey) {
  stripe = new Stripe(stripeKey, {
    apiVersion: "2022-11-15",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!stripe) {
      return new Response(
        JSON.stringify({ error: "Stripe não configurado no servidor" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sbUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const sbServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(sbUrl, sbServiceKey);

    // Validar token do usuário
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar perfil do usuário
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, nome_completo, nome_profissional, stripe_connect_account_id")
      .eq("id", user.id)
      .maybeSingle();

    let accountId = profile?.stripe_connect_account_id;

    // Se ainda não tem conta Connect, cria uma conta Express no Brasil
    if (!accountId) {
      console.log(`[Stripe Connect] Criando conta Express para o usuário ${user.id}...`);
      const account = await stripe.accounts.create({
        type: "express",
        country: "BR",
        email: user.email || profile?.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: {
          priceus_user_id: user.id,
          email: user.email || "",
          name: profile?.nome_profissional || profile?.nome_completo || "",
        },
      });

      accountId = account.id;

      // Salvar no perfil
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_connect_account_id: accountId })
        .eq("id", user.id);

      console.log(`[Stripe Connect] Conta criada: ${accountId}`);
    }

    // Verificar se os dados bancários já foram preenchidos
    const account = await stripe.accounts.retrieve(accountId);
    const isCompleted = account.details_submitted;

    const origin = req.headers.get("origin") || "https://priceus.com.br";
    const refreshUrl = `${origin}/dashboard/entregas?connect=refresh`;
    const returnUrl = `${origin}/dashboard/entregas?connect=success`;

    // Se já tiver submetido todos os detalhes, gerar link de acesso ao painel Express
    if (isCompleted) {
      try {
        const loginLink = await stripe.accounts.createLoginLink(accountId);
        return new Response(
          JSON.stringify({
            url: loginLink.url,
            accountId,
            isCompleted: true,
            message: "Conta conectada e ativa.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (loginErr) {
        console.warn("[Stripe Connect] Não foi possível criar link de login direto, gerando link de onboarding...", loginErr);
      }
    }

    // Criar o Account Link oficial de Onboarding da Stripe
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    console.log(`[Stripe Connect] Link gerado com sucesso para ${accountId}: ${accountLink.url}`);

    return new Response(
      JSON.stringify({
        url: accountLink.url,
        accountId,
        isCompleted: false,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[Stripe Connect] Erro ao gerar link de conexão:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Erro ao conectar conta Stripe" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
