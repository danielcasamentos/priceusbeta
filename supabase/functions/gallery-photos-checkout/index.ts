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

    const {
      galleryId,
      extraCount,
      totalAmount,
      visitorName,
      visitorEmail,
      successUrl,
      cancelUrl
    } = await req.json();

    if (!galleryId || !extraCount || !totalAmount || totalAmount <= 0) {
      return new Response(
        JSON.stringify({ error: "Parâmetros de pedido inválidos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sbUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const sbServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(sbUrl, sbServiceKey);

    // 1. Obter a galeria e o fotógrafo
    const { data: gallery, error: galErr } = await supabaseAdmin
      .from("galleries")
      .select("id, title, user_id")
      .eq("id", galleryId)
      .single();

    if (galErr || !gallery) {
      return new Response(
        JSON.stringify({ error: "Galeria não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Verificar se fotógrafo possui conta Stripe Connect vinculada
    const { data: userProfile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_connect_account_id, email, nome_profissional")
      .eq("id", gallery.user_id)
      .maybeSingle();

    const photographerStripeAccountId = userProfile?.stripe_connect_account_id;

    // 3. Cálculos financeiros: Taxa da Plataforma PriceU$ = 10%
    const totalCents = Math.round(Number(totalAmount) * 100);
    const platformFeeCents = Math.round(totalCents * 0.10); // 10% para o PriceU$
    const photographerShareCents = totalCents - platformFeeCents; // 90% para o fotógrafo

    console.log(`[Photo Sales] Total: R$ ${totalAmount} (${totalCents} centavos)`);
    console.log(`[Photo Sales] Taxa PriceU$ (10%): ${platformFeeCents} centavos | Fotógrafo: ${photographerShareCents} centavos`);

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `Fotos Extras (${extraCount} un) - ${gallery.title}`,
              description: `Seleção de fotos extras liberadas para download em alta resolução na galeria ${gallery.title}.`,
            },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "gallery_extra_photos",
        gallery_id: galleryId,
        photographer_id: gallery.user_id,
        extra_count: String(extraCount),
        visitor_name: visitorName || "Cliente",
        visitor_email: visitorEmail || "",
        platform_fee_cents: String(platformFeeCents),
        photographer_share_cents: String(photographerShareCents),
      },
      success_url: successUrl || `${req.headers.get("origin") || "https://priceus.com.br"}/galeria/${galleryId}?payment=success`,
      cancel_url: cancelUrl || `${req.headers.get("origin") || "https://priceus.com.br"}/galeria/${galleryId}?payment=cancelled`,
    };

    // 4. Se o fotógrafo tem conta Stripe Connect ativa, aplicar transferência e taxa de aplicação
    if (photographerStripeAccountId) {
      sessionParams.payment_intent_data = {
        application_fee_amount: platformFeeCents,
        transfer_data: {
          destination: photographerStripeAccountId,
        },
      };
      console.log(`[Photo Sales] Stripe Connect ativo para ${photographerStripeAccountId}. Split 10/90 configurado.`);
    } else {
      console.log(`[Photo Sales] Fotógrafo ainda não vinculou Stripe Connect. Valor recebido na conta principal PriceU$ e registrado com taxa 10%.`);
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[Photo Sales] Erro ao criar checkout de fotos extras:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Erro interno ao processar checkout de fotos extras" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
