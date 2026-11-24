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
      return new Response(JSON.stringify({ error: "Stripe Key ausente" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization header is missing" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sbUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!sbUrl || !sbKey) {
      throw new Error("Supabase environment variables missing");
    }

    const supabaseClient = createClient(sbUrl, sbKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido ou expirado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar o customer_id do usuário logado na tabela stripe_customers
    // Devemos usar o SERVICE_ROLE client para buscar sem restrições do frontend (caso RLS afete algo, embora o user possa ver o dele)
    const supabaseAdmin = createClient(sbUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? sbKey);
    
    const { data: customerData, error: customerError } = await supabaseAdmin
      .from("stripe_customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (customerError || !customerData?.customer_id) {
      return new Response(
        JSON.stringify({ error: "Nenhum cliente Stripe encontrado para este usuário." }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const frontendUrl = Deno.env.get('FRONTEND_URL') || req.headers.get('origin') || 'http://localhost:5173';

    // Cria a sessão no Billing Portal da Stripe
    const session = await stripe.billingPortal.sessions.create({
      customer: customerData.customer_id,
      return_url: `${frontendUrl}/dashboard/perfil`, // Redireciona de volta para o perfil do PriceUs
    });

    console.log(`🔗 Sessão do Portal criada para customer: ${customerData.customer_id}`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("🚨 500 - Erro Interno:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
