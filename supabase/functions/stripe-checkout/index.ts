import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.12.0?target=deno";

// Headers CORS para permitir que seu frontend acesse a função.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Inicialização segura do Stripe
const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
let stripe: Stripe | null = null;

if (stripeKey) {
  stripe = new Stripe(stripeKey, {
    apiVersion: "2022-11-15",
    httpClient: Stripe.createFetchHttpClient(),
  });
} else {
  console.error("🚨 ERRO: STRIPE_SECRET_KEY não encontrada no ambiente.");
}

serve(async (req) => {
  // O browser envia uma requisição OPTIONS (preflight) para verificar as políticas de CORS.
  // Respondemos 'ok' para permitir a requisição principal.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!stripe) {
      return new Response(JSON.stringify({ error: "Servidor mal configurado: Stripe Key ausente" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 1. Validação do Usuário (JWT) ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("🚨 401 - Cabeçalho de Autorização ausente.");
      return new Response(JSON.stringify({ error: "Authorization header is missing" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("🔍 JWT recebido. Validando...");

    // DEBUG: Confirmar qual projeto a função está usando
    const sbUrl = Deno.env.get("SUPABASE_URL") ?? "";
    // USO DE SERVICE_ROLE_KEY: Recomendado para backend. Garante permissões totais para a função.
    // Fallback para ANON_KEY caso a SERVICE_ROLE não esteja disponível.
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    console.log(`🔌 Edge Function conectada em: ${sbUrl}`);

    if (!sbUrl || !sbKey) {
      console.error("🚨 Variáveis do Supabase não injetadas corretamente.");
      throw new Error("Supabase environment variables missing");
    }

    // Para validar o usuário, criamos um novo cliente Supabase usando o token
    // que o frontend enviou no header 'Authorization'.
    const supabaseClient = createClient(
      sbUrl,
      sbKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          persistSession: false, // IMPORTANTE: Desabilita persistência em ambiente serverless
        },
      }
    );

    // `getUser()` usa o token para obter os dados do usuário.
    // Se o token for inválido ou expirado, retornará um erro.
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    // Se houver um erro na validação, o usuário não está autenticado.
    if (userError || !user) {
      console.error("🚨 401 - Erro de autenticação:", userError);
      return new Response(JSON.stringify({ 
        error: "Token inválido ou expirado", 
        details: userError,
        hint: "Verifique se o usuário está logado no projeto correto."
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`✅ Usuário autenticado: ${user.email} (ID: ${user.id})`);

    // --- 2. Criação da Sessão de Checkout do Stripe ---
    // Extrai os dados enviados pelo frontend.
    const body = await req.json();
    const { priceId } = body;

    // Valida se todos os parâmetros necessários foram recebidos.
    if (!priceId) {
      console.error("🚨 Erro 400: priceId ausente. Body recebido:", JSON.stringify(body));
      return new Response(
        JSON.stringify({
          error: "Parâmetro obrigatório ausente: priceId. Verifique se o frontend está enviando o valor correto.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Constrói as URLs de redirecionamento no backend para maior segurança.
    const frontendUrl = Deno.env.get('FRONTEND_URL') || req.headers.get('origin') || 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription", // ou 'payment' para pagamentos únicos
      success_url: `${frontendUrl}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/cancelado`,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
      },
    });

    console.log(`💰 Sessão Stripe criada com sucesso: ${session.id}`);

    if (!session.url) {
      console.error("🚨 ERRO CRÍTICO: A sessão do Stripe foi criada, mas não retornou uma URL.");
      throw new Error("A sessão de checkout do Stripe não retornou uma URL válida.");
    }

    // --- 3. Retorno do ID e URL da Sessão para o Frontend ---
    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("🚨 500 - Erro Interno na Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
