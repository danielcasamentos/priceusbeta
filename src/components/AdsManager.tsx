import { useState, useEffect } from 'react';
import {
  Megaphone, Eye, MousePointer, Users, Crown, Star, Zap,
  CheckCircle, Loader2, AlertCircle, MapPin, Tag, Target,
  Pause, Play, BarChart2, TrendingUp, ChevronRight, Plus, X
} from 'lucide-react';
import {
  getUserAds, getAdMetrics, toggleAdStatus,
  type MarketplaceAd, type AdDailyMetric
} from '../services/adsService';
import { handleCheckout } from '../checkoutService';
import { stripeProducts } from '../stripe-config';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNumber(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function tierLabel(tier: string) {
  if (tier === 'premium') return '👑 Premium';
  if (tier === 'pro') return '⭐ Pro';
  return '🔵 Básico';
}

function tierColor(tier: string) {
  if (tier === 'premium') return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30';
  if (tier === 'pro') return 'text-purple-600 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30';
  return 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30';
}

// ─── Planos ───────────────────────────────────────────────────────────────────

const PLANS = [
  {
    tier: 'basic' as const,
    label: '🔵 Básico',
    price: 'R$ 97/mês',
    highlight: false,
    icon: Zap,
    color: 'border-blue-200 dark:border-blue-500/30',
    btnColor: 'bg-blue-600 hover:bg-blue-700 text-white',
    benefits: [
      'Aparece entre os top 10 nas buscas',
      'Badge "Destaque" no seu perfil',
      '+500 impressões/mês estimadas',
      'Relatório semanal de desempenho',
    ],
    estimate: '+500 impressões/mês',
  },
  {
    tier: 'pro' as const,
    label: '⭐ Pro — Mais Popular',
    price: 'R$ 197/mês',
    highlight: true,
    icon: Star,
    color: 'border-purple-400 dark:border-purple-500/60 ring-2 ring-purple-200 dark:ring-purple-500/20',
    btnColor: 'bg-purple-600 hover:bg-purple-700 text-white',
    benefits: [
      'Posição garantida entre os top 5',
      'Badge "Pro" dourado no perfil',
      '+1.500 impressões/mês estimadas',
      'Prioridade em novas buscas da plataforma',
    ],
    estimate: '+1.500 impressões/mês',
  },
  {
    tier: 'premium' as const,
    label: '👑 Premium',
    price: 'R$ 397/mês',
    highlight: false,
    icon: Crown,
    color: 'border-yellow-300 dark:border-yellow-500/40',
    btnColor: 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white',
    benefits: [
      'Posição #1 garantida na categoria',
      'Banner exclusivo na busca por categoria',
      '+3.000 impressões/mês estimadas',
      'Notificação para noivas com evento compatível',
    ],
    estimate: '+3.000 impressões/mês',
  },
];

const CATEGORIES = ['Fotografia', 'Vídeo', 'Buffet', 'DJ', 'Decoração', 'Cabelo & Make', 'Área Kids', 'Cerimonialista', 'Outros'];
const EVENT_TYPES = ['Casamento', '15 Anos', 'Aniversário', 'Corporativo', 'Debutante', 'Outros'];

// ─── Chip de cidade ───────────────────────────────────────────────────────────

function CityChip({ city, onRemove }: { city: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 text-sm font-medium">
      <MapPin size={12} />
      {city}
      <button onClick={onRemove} className="ml-0.5 hover:text-red-500 transition-colors">
        <X size={12} />
      </button>
    </span>
  );
}

// ─── Gráfico de barras CSS ────────────────────────────────────────────────────

function BarChart({ metrics }: { metrics: AdDailyMetric[] }) {
  const last7 = metrics.slice(-7);
  const maxVal = Math.max(...last7.map(m => m.impressions), 1);

  return (
    <div className="flex items-end gap-1.5 h-24 w-full">
      {last7.map((m) => {
        const pct = Math.max(4, (m.impressions / maxVal) * 100);
        const date = new Date(m.metric_date + 'T00:00:00');
        const label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        return (
          <div key={m.metric_date} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative w-full flex flex-col items-center">
              {/* Tooltip */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {m.impressions}
              </div>
              <div
                className="w-full rounded-t-sm bg-blue-500 dark:bg-blue-400 transition-all"
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className="text-[9px] text-gray-400 dark:text-gray-500">{label}</span>
          </div>
        );
      })}
      {last7.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500 m-auto">Sem dados ainda</p>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AdsManager({ userId }: { userId: string }) {
  const [ads, setAds] = useState<MarketplaceAd[]>([]);
  const [metrics, setMetrics] = useState<AdDailyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Público-alvo
  const [cityInput, setCityInput] = useState('');
  const [targetCities, setTargetCities] = useState<string[]>([]);
  const [targetCategories, setTargetCategories] = useState<string[]>([]);
  const [targetEventTypes, setTargetEventTypes] = useState<string[]>([]);
  const [budgetMin, setBudgetMin] = useState(0);
  const [budgetMax, setBudgetMax] = useState(100000);
  const [savingTargeting, setSavingTargeting] = useState(false);
  const [targetingSaved, setTargetingSaved] = useState(false);

  const activeAd = ads.find(a => a.status === 'active');

  // ─── Load inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setLoading(true);
      const userAds = await getUserAds(userId);
      setAds(userAds);

      const active = userAds.find(a => a.status === 'active');
      if (active) {
        setTargetCities(active.target_cities || []);
        setTargetCategories(active.target_categories || []);
        setTargetEventTypes(active.target_event_types || []);
        setBudgetMin(active.target_budget_min ?? 0);
        setBudgetMax(active.target_budget_max ?? 100000);
        const m = await getAdMetrics(active.id);
        setMetrics(m);
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  // ─── Checkout ──────────────────────────────────────────────────────────────

  async function onActivatePlan(tier: 'basic' | 'pro' | 'premium') {
    const product = stripeProducts.find(p => (p as { adTier?: string }).adTier === tier);
    if (!product) {
      alert('Produto não configurado. Entre em contato com o suporte.');
      return;
    }
    await handleCheckout(product.priceId);
  }

  // ─── Toggle status ─────────────────────────────────────────────────────────

  async function onToggle(ad: MarketplaceAd) {
    setTogglingId(ad.id);
    const newStatus = ad.status === 'active' ? 'paused' : 'active';
    await toggleAdStatus(ad.id, newStatus);
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, status: newStatus } : a));
    setTogglingId(null);
  }

  // ─── Salvar targeting ─────────────────────────────────────────────────────

  async function onSaveTargeting() {
    if (!activeAd) return;
    setSavingTargeting(true);
    const { supabase } = await import('../lib/supabase');
    await supabase.from('marketplace_ads').update({
      target_cities: targetCities,
      target_categories: targetCategories,
      target_event_types: targetEventTypes,
      target_budget_min: budgetMin,
      target_budget_max: budgetMax,
    }).eq('id', activeAd.id);
    setSavingTargeting(false);
    setTargetingSaved(true);
    setTimeout(() => setTargetingSaved(false), 3000);
  }

  function addCity() {
    const c = cityInput.trim();
    if (c && !targetCities.includes(c)) setTargetCities(prev => [...prev, c]);
    setCityInput('');
  }

  function toggleCheck(list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, val: string) {
    setList(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Carregando seu painel de Ads…</p>
      </div>
    );
  }

  const last7 = metrics.slice(-7);
  const totalImpressions = activeAd?.total_impressions ?? 0;
  const totalClicks = activeAd?.total_clicks ?? 0;
  const totalLeads = activeAd?.total_leads ?? 0;
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-500/15">
              <Megaphone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Meu Destaque no Marketplace
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm pl-14">
            Apareça primeiro nas buscas das noivas e atraia mais clientes.
          </p>
        </div>

        {activeAd && (
          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${tierColor(activeAd.tier)}`}>
            <CheckCircle size={14} />
            {tierLabel(activeAd.tier)} ativo
          </span>
        )}
      </div>

      {/* ── Status atual (campanha pausada/rascunho) ── */}
      {!activeAd && ads.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300">
          <AlertCircle size={18} className="flex-shrink-0" />
          <div className="text-sm">
            <strong>Sua campanha está pausada.</strong> Reative-a abaixo ou escolha um novo plano.
          </div>
        </div>
      )}

      {/* ── Planos ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-blue-500" />
          {activeAd ? 'Mudar de plano' : 'Escolha seu plano de destaque'}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrentTier = activeAd?.tier === plan.tier;
            return (
              <div
                key={plan.tier}
                className={`relative flex flex-col rounded-2xl border-2 bg-white dark:bg-[#0d1f38] p-5 transition-shadow hover:shadow-lg ${plan.color} ${plan.highlight ? 'shadow-md' : ''}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                    Mais Popular
                  </div>
                )}

                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-0.5">{plan.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{plan.price}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{plan.estimate}</p>
                </div>

                <ul className="space-y-2 mb-5 flex-1">
                  {plan.benefits.map(b => (
                    <li key={b} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <CheckCircle size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                      {b}
                    </li>
                  ))}
                </ul>

                {isCurrentTier ? (
                  <div className="space-y-2">
                    <div className="text-center text-sm font-semibold text-green-600 dark:text-green-400 py-2.5 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30">
                      ✓ Plano atual
                    </div>
                    <button
                      onClick={() => onToggle(activeAd!)}
                      disabled={togglingId === activeAd?.id}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      {togglingId === activeAd?.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : activeAd?.status === 'active'
                          ? <><Pause size={14} /> Pausar</>
                          : <><Play size={14} /> Reativar</>
                      }
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onActivatePlan(plan.tier)}
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 ${plan.btnColor}`}
                  >
                    <Plus size={15} />
                    Ativar {plan.tier === 'basic' ? 'Básico' : plan.tier === 'pro' ? 'Pro' : 'Premium'}
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Métricas (só se ativo) ── */}
      {activeAd && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart2 size={18} className="text-blue-500" />
            Resultados da Campanha
          </h2>

          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Impressões', value: formatNumber(totalImpressions), icon: Eye, color: 'text-blue-500' },
              { label: 'Cliques', value: formatNumber(totalClicks), icon: MousePointer, color: 'text-purple-500' },
              { label: 'Leads Gerados', value: formatNumber(totalLeads), icon: Users, color: 'text-green-500' },
              { label: 'Taxa de Clique', value: `${ctr}%`, icon: TrendingUp, color: 'text-orange-500' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white dark:bg-[#0d1f38] rounded-xl border border-gray-100 dark:border-[rgba(255,255,255,.07)] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon size={15} className={kpi.color} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Gráfico 7 dias */}
          <div className="bg-white dark:bg-[#0d1f38] rounded-xl border border-gray-100 dark:border-[rgba(255,255,255,.07)] p-5 mb-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Impressões — últimos 7 dias</p>
            <BarChart metrics={last7} />
          </div>

          {/* Tabela últimos 7 dias */}
          {last7.length > 0 && (
            <div className="bg-white dark:bg-[#0d1f38] rounded-xl border border-gray-100 dark:border-[rgba(255,255,255,.07)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-[rgba(255,255,255,.07)]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Data</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Impressões</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cliques</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Leads</th>
                  </tr>
                </thead>
                <tbody>
                  {[...last7].reverse().map((m, i) => (
                    <tr key={m.metric_date} className={i % 2 === 0 ? '' : 'bg-gray-50 dark:bg-white/[0.02]'}>
                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                        {new Date(m.metric_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">{m.impressions}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">{m.clicks}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">{m.leads_generated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── Configuração de público-alvo ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <Target size={18} className="text-blue-500" />
          Configuração de Público-Alvo
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Defina para quem seu destaque será exibido. {!activeAd && <span className="text-amber-500">Ative um plano para salvar.</span>}
        </p>

        <div className={`space-y-6 bg-white dark:bg-[#0d1f38] rounded-2xl border border-gray-100 dark:border-[rgba(255,255,255,.07)] p-5 ${!activeAd ? 'opacity-60 pointer-events-none select-none' : ''}`}>

          {/* Cidades */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-2">
              <MapPin size={14} className="text-blue-500" /> Cidades-alvo
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCity())}
                placeholder="Ex: São Paulo"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,.1)] bg-transparent text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <button
                onClick={addCity}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
              >
                <Plus size={15} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {targetCities.map(c => (
                <CityChip key={c} city={c} onRemove={() => setTargetCities(prev => prev.filter(x => x !== c))} />
              ))}
              {targetCities.length === 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">Nenhuma cidade adicionada (exibe para todas)</span>
              )}
            </div>
          </div>

          {/* Categorias */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-2">
              <Tag size={14} className="text-blue-500" /> Categorias do seu serviço
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <label key={cat} className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={targetCategories.includes(cat)}
                    onChange={() => toggleCheck(targetCategories, setTargetCategories, cat)}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tipos de evento */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-2">
              <Tag size={14} className="text-purple-500" /> Tipos de evento
            </label>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map(evt => (
                <label key={evt} className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={targetEventTypes.includes(evt)}
                    onChange={() => toggleCheck(targetEventTypes, setTargetEventTypes, evt)}
                    className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{evt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Orçamento estimado da noiva */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-3">
              <Target size={14} className="text-green-500" /> Orçamento estimado da noiva
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Mín: <strong className="text-gray-800 dark:text-white">R$ {budgetMin.toLocaleString('pt-BR')}</strong></span>
                <span>Máx: <strong className="text-gray-800 dark:text-white">R$ {budgetMax.toLocaleString('pt-BR')}</strong></span>
              </div>
              <input
                type="range" min={0} max={100000} step={1000}
                value={budgetMin}
                onChange={e => setBudgetMin(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <input
                type="range" min={0} max={100000} step={1000}
                value={budgetMax}
                onChange={e => setBudgetMax(Number(e.target.value))}
                className="w-full accent-purple-600"
              />
            </div>
          </div>

          {/* Salvar */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onSaveTargeting}
              disabled={savingTargeting || !activeAd}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
            >
              {savingTargeting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
              Salvar Configuração
            </button>
            {targetingSaved && (
              <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle size={14} /> Salvo!
              </span>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
