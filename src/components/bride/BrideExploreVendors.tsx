import React, { useState } from 'react';
import { Search, Star, MessageSquare, ExternalLink, Sparkles, MapPin, Tag } from 'lucide-react';
import { VendorMarketplaceCard } from '../../services/brideMarketplaceService';

interface BrideExploreVendorsProps {
  vendors: VendorMarketplaceCard[];
  onOpenVendorTab: (vendor: VendorMarketplaceCard) => void;
  onOpenChat: (vendor: VendorMarketplaceCard) => void;
  onOpenActionPlan?: () => void;
  currentEventCity?: string;
}

const CATEGORIES = [
  { id: 'all', label: 'Todos os Serviços', icon: '✨' },
  { id: 'fotografia', label: 'Fotografia', icon: '📸' },
  { id: 'video', label: 'Vídeo & Cinema', icon: '🎬' },
  { id: 'cabelo_make', label: 'Cabelo & Make', icon: '💄' },
  { id: 'decoracao', label: 'Decoração', icon: '💐' },
  { id: 'storymaker', label: 'Storymaker', icon: '📱' },
  { id: 'buffet', label: 'Buffet & Bar', icon: '🍽️' },
  { id: 'area_kids', label: 'Espaço Kids', icon: '🧸' },
];

export function BrideExploreVendors({
  vendors,
  onOpenVendorTab,
  onOpenChat,
  onOpenActionPlan,
  currentEventCity,
}: BrideExploreVendorsProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRadiusKm, setSelectedRadiusKm] = useState<number>(0);
  const [minRating, setMinRating] = useState<number>(0);

  const filteredVendors = vendors.filter((v) => {
    const matchesCategory = selectedCategory === 'all' || v.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      v.business_name.toLowerCase().includes(q) ||
      v.city.toLowerCase().includes(q) ||
      v.tags.some((t) => t.toLowerCase().includes(q)) ||
      v.subcategories.some((s) => s.toLowerCase().includes(q));

    const matchesRating = minRating === 0 || v.rating >= minRating;

    return matchesCategory && matchesSearch && matchesRating;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hero Sofisticado de Boas-Vindas e Busca Clean */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-stone-900 via-slate-900 to-stone-950 text-white p-7 sm:p-9 shadow-xl shadow-stone-900/10">
        <div className="max-w-2xl space-y-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-semibold">
              <Sparkles size={13} />
              Marketplace Verificado PriceU$
            </div>
            {currentEventCity && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-stone-200 text-xs font-medium">
                <MapPin size={12} className="text-rose-400" />
                Casamento em: <strong className="text-white">{currentEventCity}</strong>
              </div>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Monte seu casamento com os melhores especialistas
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-normal">
            Abra cada profissional em uma <strong>aba própria</strong> para comparar orçamentos, negociar no Chat do Quotes e acompanhar seus custos em tempo real.
          </p>

          {/* Campo de Busca Rápida Clean */}
          <div className="relative pt-2">
            <Search className="absolute left-4 top-5 text-stone-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nome, tag (ex: Drone, Álbum, Boho Chic, Airbrush)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/10 hover:bg-white/15 focus:bg-white text-stone-100 focus:text-slate-900 border border-white/20 focus:border-rose-400 rounded-2xl text-xs sm:text-sm placeholder-stone-400 focus:outline-hidden focus:ring-4 focus:ring-rose-500/20 transition-all shadow-inner backdrop-blur-md"
            />
          </div>
        </div>
      </div>

      {/* Barra de Filtros Inteligentes: Raio de Busca, Rating e Plano de Ação */}
      <div className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-stone-500 uppercase tracking-wider text-[10px] flex items-center gap-1">
            <MapPin size={12} className="text-rose-500" /> Raio:
          </span>
          {[
            { km: 0, label: 'Todo Brasil' },
            { km: 25, label: '25 km' },
            { km: 50, label: '50 km' },
            { km: 100, label: '100 km' },
          ].map((r) => (
            <button
              key={r.km}
              type="button"
              onClick={() => setSelectedRadiusKm(r.km)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all border cursor-pointer ${
                selectedRadiusKm === r.km
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
              }`}
            >
              {r.label}
            </button>
          ))}

          <span className="text-stone-300 mx-1 hidden sm:inline">|</span>

          <span className="font-bold text-stone-500 uppercase tracking-wider text-[10px] flex items-center gap-1">
            <Star size={12} className="text-amber-500 fill-amber-500" /> Avaliação:
          </span>
          {[
            { rating: 0, label: 'Todas' },
            { rating: 4.8, label: '★ 4.8+' },
            { rating: 5.0, label: '★ 5.0' },
          ].map((rt) => (
            <button
              key={rt.rating}
              type="button"
              onClick={() => setMinRating(rt.rating)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all border cursor-pointer ${
                minRating === rt.rating
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
              }`}
            >
              {rt.label}
            </button>
          ))}
        </div>

        {onOpenActionPlan && (
          <button
            type="button"
            onClick={onOpenActionPlan}
            className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Sparkles size={13} />
            <span>Configurar Plano de Ação & Externos</span>
          </button>
        )}
      </div>

      {/* Carrossel de Categorias Elegante */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/15 scale-[1.02]'
                : 'bg-white text-stone-600 border-stone-200/90 hover:bg-stone-50 hover:text-slate-900 shadow-2xs'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Grid de Fornecedores Clean & Chic */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVendors.map((vendor) => (
          <div
            key={vendor.user_id}
            className="group rounded-3xl bg-white border border-stone-200/90 hover:border-rose-300 p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-stone-200/60 hover:-translate-y-0.5"
          >
            <div className="space-y-3.5">
              {/* Header do Card */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-600 to-rose-700 flex items-center justify-center text-white font-serif text-lg font-bold shadow-sm">
                    {vendor.business_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-rose-600 transition-colors">
                      {vendor.business_name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-0.5">
                      <MapPin size={11} className="text-stone-400" />
                      <span>{vendor.city}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg text-amber-700 text-xs font-bold">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  <span>{vendor.rating.toFixed(1)}</span>
                  <span className="text-[10px] text-stone-400 font-normal">({vendor.total_reviews})</span>
                </div>
              </div>

              {/* Tags de Identificação */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {vendor.tags.slice(0, 6).map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-600 text-[11px] font-medium"
                  >
                    <Tag size={9} className="text-rose-500" />
                    {tag}
                  </span>
                ))}
                {vendor.tags.length > 6 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-stone-100 text-stone-500 text-[10px] font-semibold">
                    +{vendor.tags.length - 6}
                  </span>
                )}
              </div>

              {/* Pacotes disponíveis */}
              <div className="pt-2 text-xs text-stone-500">
                <span className="text-stone-400 font-medium">Pacotes disponíveis:</span>{' '}
                <strong className="text-slate-800 font-semibold">
                  {vendor.templates.length > 0
                    ? vendor.templates.map((t) => t.name).join(', ')
                    : 'Personalizado sob demanda'}
                </strong>
              </div>
            </div>

            {/* Rodapé do Card com Preço e Ações */}
            <div className="pt-4 mt-5 border-t border-stone-100 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">A partir de</p>
                <p className="text-base font-black text-slate-900">
                  R$ {vendor.starting_price.toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenChat(vendor)}
                  title="Abrir Chat do Quotes"
                  className="p-2.5 rounded-xl bg-stone-50 hover:bg-rose-50 text-stone-600 hover:text-rose-700 border border-stone-200 transition-colors cursor-pointer"
                >
                  <MessageSquare size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenVendorTab(vendor)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md shadow-slate-900/10 cursor-pointer"
                >
                  <ExternalLink size={13} />
                  <span>Abrir Aba</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredVendors.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-8 shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-rose-50 text-rose-500 border border-rose-200 flex items-center justify-center mx-auto">
            <Sparkles size={26} />
          </div>
          <div className="space-y-1">
            <p className="text-base font-bold text-slate-900">Nenhum fornecedor encontrado para os filtros atuais.</p>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Você pode expandir o raio de busca ou cadastrar profissionais que você já contratou por fora diretamente no seu Plano de Ação.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
                setSelectedRadiusKm(0);
                setMinRating(0);
              }}
              className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Limpar Filtros
            </button>

            {onOpenActionPlan && (
              <button
                type="button"
                onClick={onOpenActionPlan}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>Adicionar Profissional Externo no Meu Plano</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
