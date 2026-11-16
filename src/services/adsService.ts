import { supabase } from '../lib/supabase';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface MarketplaceAd {
  id: string;
  user_id: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'ended' | 'pending_payment';
  tier: 'basic' | 'pro' | 'premium';
  budget_total: number;
  start_date: string | null;
  end_date: string | null;
  target_cities: string[];
  target_categories: string[];
  target_event_types: string[];
  target_budget_min: number | null;
  target_budget_max: number | null;
  stripe_session_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  total_impressions: number;
  total_clicks: number;
  total_leads: number;
  created_at: string;
  updated_at: string;
}

export interface AdDailyMetric {
  id: string;
  ad_id: string;
  metric_date: string;
  impressions: number;
  clicks: number;
  leads_generated: number;
  contracts_generated: number;
  created_at: string;
}

// ─── Query helpers ────────────────────────────────────────────────────────────

/** Busca todas as campanhas do user logado. */
export async function getUserAds(userId: string): Promise<MarketplaceAd[]> {
  const { data, error } = await supabase
    .from('marketplace_ads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[adsService] getUserAds:', error.message);
    return [];
  }
  return data as MarketplaceAd[];
}

/** Cria uma nova campanha com status 'draft' antes do checkout Stripe. */
export async function createAdDraft(
  userId: string,
  params: {
    name: string;
    tier: 'basic' | 'pro' | 'premium';
    targetCities: string[];
    targetCategories: string[];
    targetEventTypes: string[];
    targetBudgetMin?: number;
    targetBudgetMax?: number;
  }
): Promise<MarketplaceAd> {
  const { data, error } = await supabase
    .from('marketplace_ads')
    .insert({
      user_id: userId,
      name: params.name,
      tier: params.tier,
      status: 'draft',
      target_cities: params.targetCities,
      target_categories: params.targetCategories,
      target_event_types: params.targetEventTypes,
      target_budget_min: params.targetBudgetMin ?? null,
      target_budget_max: params.targetBudgetMax ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('[adsService] createAdDraft:', error.message);
    throw error; // lança aqui pois o caller precisa do id para redirecionar ao checkout
  }
  return data as MarketplaceAd;
}

/** Ativa a campanha após confirmação de pagamento no Stripe. */
export async function activateAd(
  adId: string,
  stripeSessionId: string,
  stripePriceId: string
): Promise<void> {
  const { error } = await supabase
    .from('marketplace_ads')
    .update({
      status: 'active',
      stripe_session_id: stripeSessionId,
      stripe_price_id: stripePriceId,
      start_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    })
    .eq('id', adId);

  if (error) {
    console.error('[adsService] activateAd:', error.message);
  }
}

/** Pausa ou retoma uma campanha. */
export async function toggleAdStatus(
  adId: string,
  status: 'active' | 'paused'
): Promise<void> {
  const { error } = await supabase
    .from('marketplace_ads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', adId);

  if (error) {
    console.error('[adsService] toggleAdStatus:', error.message);
  }
}

/** Busca métricas diárias dos últimos 30 dias de uma campanha. */
export async function getAdMetrics(adId: string): Promise<AdDailyMetric[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('marketplace_ad_daily_metrics')
    .select('*')
    .eq('ad_id', adId)
    .gte('metric_date', since)
    .order('metric_date', { ascending: true });

  if (error) {
    console.error('[adsService] getAdMetrics:', error.message);
    return [];
  }
  return data as AdDailyMetric[];
}

// ─── Tracking helpers ─────────────────────────────────────────────────────────

/**
 * Incrementa o contador atômico na tabela de métricas diárias e
 * atualiza o total denormalizado em marketplace_ads.
 * Usa upsert para garantir idempotência — se já existir o registro do dia, incrementa.
 */
async function incrementMetric(
  adId: string,
  field: 'impressions' | 'clicks' | 'leads_generated',
  totalField: 'total_impressions' | 'total_clicks' | 'total_leads'
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // Upsert na tabela de métricas diárias
  const { error: metricsError } = await supabase.rpc('increment_ad_metric', {
    p_ad_id: adId,
    p_metric_date: today,
    p_field: field,
  });

  if (metricsError) {
    // Fallback: insert or manual increment via select+update
    const { data: existing } = await supabase
      .from('marketplace_ad_daily_metrics')
      .select('id, ' + field)
      .eq('ad_id', adId)
      .eq('metric_date', today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('marketplace_ad_daily_metrics')
        .update({ [field]: (existing[field] as number) + 1 })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('marketplace_ad_daily_metrics')
        .insert({ ad_id: adId, metric_date: today, [field]: 1 });
    }
  }

  // Incrementa total denormalizado no ad
  const { data: ad } = await supabase
    .from('marketplace_ads')
    .select(totalField)
    .eq('id', adId)
    .maybeSingle();

  if (ad) {
    await supabase
      .from('marketplace_ads')
      .update({
        [totalField]: ((ad[totalField] as number) ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', adId);
  }
}

/** Registra uma impressão (perfil apareceu na busca). */
export async function trackImpression(adId: string): Promise<void> {
  try {
    await incrementMetric(adId, 'impressions', 'total_impressions');
  } catch (err) {
    console.error('[adsService] trackImpression:', err);
  }
}

/** Registra um clique (noiva clicou no perfil do vendor). */
export async function trackClick(adId: string): Promise<void> {
  try {
    await incrementMetric(adId, 'clicks', 'total_clicks');
  } catch (err) {
    console.error('[adsService] trackClick:', err);
  }
}

/** Registra um lead gerado (noiva enviou orçamento para vendor com ad ativo). */
export async function trackLead(adId: string): Promise<void> {
  try {
    await incrementMetric(adId, 'leads_generated', 'total_leads');
  } catch (err) {
    console.error('[adsService] trackLead:', err);
  }
}
