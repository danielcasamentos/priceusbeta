import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  // 1. Handle Gallery Extra Photos one-time checkout (guest or customer checkout)
  if (event.type === 'checkout.session.completed') {
    const session = stripeData as Stripe.Checkout.Session;
    if (session.metadata?.type === 'gallery_extra_photos' && session.payment_status === 'paid') {
      await handleGalleryExtraPhotosPurchase(session);
      return;
    }

    if (
      session.metadata?.type === 'marketplace_addon' &&
      session.metadata?.addon_key &&
      session.metadata?.user_id &&
      session.payment_status === 'paid'
    ) {
      await handleMarketplaceAddonPurchase(session);
      return;
    }
  }

  if (!('customer' in stripeData)) {
    return;
  }

  // for one time payments, we only listen for the checkout.session.completed event
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode } = stripeData as Stripe.Checkout.Session;

      isSubscription = mode === 'subscription';

      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
    }

    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
    } else if (mode === 'payment' && payment_status === 'paid') {
      try {
        // Extract the necessary information from the session
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
        } = stripeData as Stripe.Checkout.Session;

        // Insert the order into the stripe_orders table
        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed', // assuming we want to mark it as completed since payment is successful
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }
        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    }
  }
}

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // Get user_id for this customer to update profiles table later
    const { data: customerData } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }

      // Se não tem assinatura e temos o user_id, atualizamos o perfil para canceled,
      // a menos que esteja em trial
      if (customerData?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('status_assinatura')
          .eq('id', customerData.user_id)
          .maybeSingle();

        if (profile && profile.status_assinatura !== 'trial') {
          await supabase
            .from('profiles')
            .update({ status_assinatura: 'canceled' })
            .eq('id', customerData.user_id);
        }
      }
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }

    // Map Stripe status to allowed profile status: 'trial', 'active', 'expired', 'canceled', 'past_due'
    let mappedStatus = 'active'; // Default for trialing, active
    if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
      mappedStatus = 'past_due';
    } else if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
      mappedStatus = 'canceled';
    } else if (subscription.status === 'incomplete') {
      // Incomplete usually means payment failed on first attempt, we can treat as canceled or past_due
      mappedStatus = 'past_due';
    }

    if (customerData?.user_id) {
      await supabase
        .from('profiles')
        .update({ status_assinatura: mappedStatus })
        .eq('id', customerData.user_id);
      console.info(`Updated profile status for user ${customerData.user_id} to ${mappedStatus}`);
    }

    console.info(`Successfully synced subscription for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}

async function handleMarketplaceAddonPurchase(session: Stripe.Checkout.Session) {
  try {
    const meta = session.metadata || {};
    const userId = meta.user_id;
    const addonKey = meta.addon_key;
    const expiresAt = meta.expires_at || null;

    if (!userId || !addonKey) {
      console.error('[Stripe Webhook] marketplace_addon missing user_id or addon_key:', session.id);
      return;
    }

    const { error } = await supabase.from('user_addons').upsert(
      {
        user_id: userId,
        addon_key: addonKey,
        status: 'active',
        stripe_session_id: session.id,
        stripe_subscription_id:
          typeof session.subscription === 'string' ? session.subscription : null,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,addon_key' },
    );

    if (error) {
      console.error('[Stripe Webhook] Error upserting user_addons:', error);
    } else {
      console.info(`[Stripe Webhook] Activated addon ${addonKey} for user ${userId}`);
    }
  } catch (err) {
    console.error('[Stripe Webhook] Failed to process marketplace addon purchase:', err);
  }
}

async function handleGalleryExtraPhotosPurchase(session: Stripe.Checkout.Session) {
  try {
    const meta = session.metadata || {};
    const galleryId = meta.gallery_id;
    const photographerId = meta.photographer_id || null;
    const extraCount = Math.max(1, parseInt(meta.extra_count || '1', 10) || 1);
    const buyerName = (meta.visitor_name || session.customer_details?.name || 'Cliente').trim();
    const buyerEmail = (meta.visitor_email || session.customer_details?.email || '').trim() || null;
    const buyerWhatsapp = (meta.visitor_whatsapp || session.customer_details?.phone || '').trim() || null;
    const photoIds = meta.photo_ids
      ? meta.photo_ids.split(',').map((id) => id.trim()).filter(Boolean)
      : [];

    const amountTotalBrl = (session.amount_total || 0) / 100;
    const platformFeeBrl = (parseInt(meta.platform_fee_cents || '0', 10) || 0) / 100;
    const photographerShareBrl = (parseInt(meta.photographer_share_cents || '0', 10) || 0) / 100;

    if (!galleryId) {
      console.error('[Stripe Webhook] gallery_extra_photos missing gallery_id in metadata:', session.id);
      return;
    }

    // 1. Localizar ou criar visitante em gallery_visitors e incrementar downloads_count
    let visitorId: string | null = null;
    try {
      let visitorQuery = supabase
        .from('gallery_visitors')
        .select('id, downloads_count')
        .eq('gallery_id', galleryId);

      if (buyerEmail) {
        visitorQuery = visitorQuery.eq('email', buyerEmail);
      } else {
        visitorQuery = visitorQuery.eq('name', buyerName);
      }

      const { data: existingVisitor } = await visitorQuery.maybeSingle();

      if (existingVisitor) {
        visitorId = existingVisitor.id;
        const currentDownloads = existingVisitor.downloads_count || 0;
        await supabase
          .from('gallery_visitors')
          .update({
            downloads_count: currentDownloads + extraCount,
            last_accessed_at: new Date().toISOString(),
          })
          .eq('id', existingVisitor.id);
      } else {
        const { data: createdVisitor } = await supabase
          .from('gallery_visitors')
          .insert({
            gallery_id: galleryId,
            name: buyerName,
            email: buyerEmail,
            whatsapp: buyerWhatsapp,
            accessed_at: new Date().toISOString(),
            last_accessed_at: new Date().toISOString(),
            downloads_count: extraCount,
          })
          .select('id')
          .maybeSingle();
        visitorId = createdVisitor?.id || null;
      }
    } catch (visErr) {
      console.warn('[Stripe Webhook] Aviso ao atualizar gallery_visitors:', visErr);
    }

    // 2. Registrar na tabela gallery_photo_purchases (com idempotência por stripe_session_id)
    const { error: purchaseError } = await supabase
      .from('gallery_photo_purchases')
      .upsert(
        {
          gallery_id: galleryId,
          photographer_id: photographerId,
          visitor_id: visitorId,
          buyer_name: buyerName,
          buyer_email: buyerEmail,
          buyer_whatsapp: buyerWhatsapp,
          photo_ids: photoIds,
          photo_count: extraCount,
          amount_total: amountTotalBrl,
          platform_fee: platformFeeBrl,
          photographer_share: photographerShareBrl,
          stripe_session_id: session.id,
          payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
          payment_status: session.payment_status || 'paid',
        },
        { onConflict: 'stripe_session_id' }
      );

    if (purchaseError) {
      console.error('[Stripe Webhook] Erro ao salvar em gallery_photo_purchases:', purchaseError);
    }

    // 3. Registrar também em gallery_orders e no caixa financeiro (company_transactions)
    try {
      await supabase.from('gallery_orders').insert({
        gallery_id: galleryId,
        visitor_id: visitorId,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        buyer_whatsapp: buyerWhatsapp,
        photo_count: extraCount,
        total_price: amountTotalBrl,
        payment_status: 'paid',
        payment_method: 'cartao_stripe',
      });
    } catch (ordErr) {
      console.warn('[Stripe Webhook] Aviso ao registrar em gallery_orders:', ordErr);
    }

    if (photographerId && amountTotalBrl > 0) {
      try {
        const today = new Date().toISOString().split('T')[0];
        await supabase.from('company_transactions').insert({
          user_id: photographerId,
          tipo: 'receita',
          origem: 'galeria',
          descricao: `Venda de ${extraCount} foto(s) extra(s) via Stripe (Galeria)`,
          valor: photographerShareBrl > 0 ? photographerShareBrl : amountTotalBrl,
          data: today,
          status: 'pago',
          forma_pagamento: 'cartao_credito',
          cliente_nome: buyerName,
          cliente_telefone: buyerWhatsapp,
        });
      } catch (finErr) {
        console.warn('[Stripe Webhook] Aviso ao registrar receita em company_transactions:', finErr);
      }
    }

    console.info(`[Stripe Webhook] ✅ Venda de ${extraCount} foto(s) extra(s) processada com sucesso para galeria ${galleryId} (sessão: ${session.id})`);
  } catch (err) {
    console.error('[Stripe Webhook] Erro ao processar compra de fotos extras:', err);
  }
}