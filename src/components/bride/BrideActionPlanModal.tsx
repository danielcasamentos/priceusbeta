import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  MapPin,
  Calendar,
  DollarSign,
  Heart,
  CheckCircle2,
  Users,
  Compass,
  Plus,
  Trash2,
  ExternalLink,
  Phone,
  X,
  ChevronRight,
  ChevronLeft,
  Sliders,
  ShieldCheck,
  Star,
  Layers,
  ArrowRight
} from 'lucide-react';
import { BrideProfile, BrideMarketplaceService } from '../../services/brideMarketplaceService';

export interface ExternalVendorItem {
  id: string;
  name: string;
  category: string;
  estimatedPrice: number;
  contactOrLink?: string;
}

export interface WeddingActionPlan {
  brideName: string;
  partnerName: string;
  weddingDate: string;
  currentCity: string;
  eventCity: string;
  sameCity: boolean;
  searchRadiusKm: number; // 0 = Brasil todo
  gpsCoords?: { lat: number; lng: number };
  totalBudget: number;
  weddingStyle: string;
  weddingStyles?: string[];
  selectedCategories: string[];
  externalVendors: ExternalVendorItem[];
}

interface BrideActionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile?: BrideProfile | null;
  onSavePlan: (plan: WeddingActionPlan) => void;
}

const WEDDING_STYLES = [
  {
    id: 'Romântico Clássico',
    title: 'Romântico Clássico',
    desc: 'Elegância atemporal, salão nobre ou igreja, flores nobres e tons suaves.',
    icon: '💍',
    color: 'from-rose-500/10 to-pink-500/10 border-rose-200'
  },
  {
    id: 'Boho Chic & Campo',
    title: 'Boho Chic & Rústico',
    desc: 'Fazendas, sítios, pôr do sol, elementos em madeira, luzes quentes e capim dos pampas.',
    icon: '🌿',
    color: 'from-amber-500/10 to-orange-500/10 border-amber-200'
  },
  {
    id: 'Minimalista Editorial',
    title: 'Minimalista Editorial',
    desc: 'Linhas retas, alta costura, estética clean, contemporânea e fotografia artística.',
    icon: '✨',
    color: 'from-stone-500/10 to-slate-500/10 border-stone-300'
  },
  {
    id: 'Praia & Destination',
    title: 'Praia & Destination Wedding',
    desc: 'Pé na areia, vista para o mar, clima descontraído e viagem com os convidados.',
    icon: '🌊',
    color: 'from-teal-500/10 to-cyan-500/10 border-teal-200'
  },
  {
    id: 'Garden & Conto de Fadas',
    title: 'Garden / Ar Livre',
    desc: 'Jardins floridos, luz natural exuberante, cerimônia sob árvores e clima bucólico.',
    icon: '🌸',
    color: 'from-emerald-500/10 to-green-500/10 border-emerald-200'
  },
  {
    id: 'Moderno Urbano',
    title: 'Moderno Urbano Industrial',
    desc: 'Galpões, lofts, lâmpadas de filamento, neon, rooftops e festa vibrante.',
    icon: '🏙️',
    color: 'from-indigo-500/10 to-violet-500/10 border-indigo-200'
  },
];

const AVAILABLE_CATEGORIES = [
  { id: 'fotografia', label: 'Fotografia de Casamento', icon: '📸', defaultPercent: 12 },
  { id: 'video', label: 'Vídeo & Cinema 4K', icon: '🎬', defaultPercent: 10 },
  { id: 'cabelo_make', label: 'Cabelo & Make (Dia da Noiva)', icon: '💄', defaultPercent: 5 },
  { id: 'decoracao', label: 'Decoração & Design Floral', icon: '💐', defaultPercent: 20 },
  { id: 'buffet', label: 'Espaço, Buffet & Bar', icon: '🍽️', defaultPercent: 35 },
  { id: 'storymaker', label: 'Storymaker / Reels em Tempo Real', icon: '📱', defaultPercent: 3 },
  { id: 'assessoria', label: 'Assessoria & Cerimonial', icon: '📋', defaultPercent: 7 },
  { id: 'musica', label: 'DJ / Banda / Sonorização', icon: '🎵', defaultPercent: 8 },
];

export function BrideActionPlanModal({
  isOpen,
  onClose,
  currentProfile,
  onSavePlan,
}: BrideActionPlanModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Estados do Plano de Ação
  const [brideName, setBrideName] = useState(currentProfile?.nome_noiva || '');
  const [partnerName, setPartnerName] = useState(currentProfile?.nome_conjuge || '');
  const [weddingDate, setWeddingDate] = useState(currentProfile?.data_casamento || '');
  
  // Localização
  const [currentCity, setCurrentCity] = useState(currentProfile?.cidade || '');
  const [eventCity, setEventCity] = useState(currentProfile?.cidade || '');
  const [sameCity, setSameCity] = useState(true);
  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(50);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsLocationLabel, setGpsLocationLabel] = useState<string | null>(null);

  // Orçamento & Estilo
  const [totalBudget, setTotalBudget] = useState<number>(currentProfile?.orcamento_planejado || 60000);
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['Romântico Clássico']);

  // Categorias & Externos
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'fotografia',
    'video',
    'cabelo_make',
    'decoracao'
  ]);
  const [externalVendors, setExternalVendors] = useState<ExternalVendorItem[]>([]);
  const [newExtName, setNewExtName] = useState('');
  const [newExtCategory, setNewExtCategory] = useState('fotografia');
  const [newExtPrice, setNewExtPrice] = useState('');
  const [newExtContact, setNewExtContact] = useState('');
  const [isAddingExternal, setIsAddingExternal] = useState(false);

  // Carrega plano salvo anterior se existir no storage local
  useEffect(() => {
    try {
      const saved = localStorage.getItem('priceus_bride_action_plan');
      if (saved) {
        const plan: WeddingActionPlan = JSON.parse(saved);
        if (plan.brideName) setBrideName(plan.brideName);
        if (plan.partnerName) setPartnerName(plan.partnerName);
        if (plan.weddingDate) setWeddingDate(plan.weddingDate);
        if (plan.currentCity) setCurrentCity(plan.currentCity);
        if (plan.eventCity) setEventCity(plan.eventCity);
        setSameCity(plan.sameCity);
        if (plan.searchRadiusKm !== undefined) setSearchRadiusKm(plan.searchRadiusKm);
        if (plan.totalBudget) setTotalBudget(plan.totalBudget);
        if (plan.weddingStyles && Array.isArray(plan.weddingStyles) && plan.weddingStyles.length > 0) {
          setSelectedStyles(plan.weddingStyles);
        } else if (plan.weddingStyle) {
          const split = plan.weddingStyle.split(/•|,/).map((s: string) => s.trim()).filter(Boolean);
          setSelectedStyles(split.length > 0 ? split : [plan.weddingStyle]);
        }
        if (plan.selectedCategories) setSelectedCategories(plan.selectedCategories);
        if (plan.externalVendors) setExternalVendors(plan.externalVendors);
      } else if (currentProfile) {
        if (currentProfile.nome_noiva) setBrideName(currentProfile.nome_noiva);
        if (currentProfile.cidade) {
          setCurrentCity(currentProfile.cidade);
          setEventCity(currentProfile.cidade);
        }
        if (currentProfile.orcamento_planejado) setTotalBudget(currentProfile.orcamento_planejado);
        if (currentProfile.data_casamento) setWeddingDate(currentProfile.data_casamento);
      }
    } catch {}
  }, [currentProfile]);

  if (!isOpen) return null;

  // Detecção Nativa de GPS via Geolocation API
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada por este navegador.');
      return;
    }

    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Busca reversa de cidade nativa (gratuita e sem API keys via Nominatim OSM)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
            { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } }
          );
          if (res.ok) {
            const data = await res.json();
            const city =
              data.address.city ||
              data.address.town ||
              data.address.municipality ||
              data.address.village ||
              'Sua Região';
            const state = data.address.state_code || data.address.state || 'BR';
            const formatted = `${city} - ${state}`;
            setCurrentCity(formatted);
            if (sameCity) setEventCity(formatted);
            setGpsLocationLabel(`Detectado: ${formatted} (Lat: ${latitude.toFixed(2)}, Lng: ${longitude.toFixed(2)})`);
          } else {
            setCurrentCity('Localização Atual');
            setGpsLocationLabel(`GPS Coordenadas: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } catch {
          setCurrentCity('Localização Atual');
          setGpsLocationLabel(`GPS Coordenadas: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } finally {
          setIsDetectingGps(false);
        }
      },
      (err) => {
        setIsDetectingGps(false);
        alert('Não foi possível obter a localização via GPS. Verifique a permissão do seu navegador.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleToggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  };

  const handleAddExternalVendor = () => {
    if (!newExtName.trim()) {
      alert('Informe o nome do profissional ou empresa.');
      return;
    }

    const price = parseFloat(newExtPrice.replace(/\D/g, '')) || 0;
    const item: ExternalVendorItem = {
      id: 'ext-' + Date.now(),
      name: newExtName.trim(),
      category: newExtCategory,
      estimatedPrice: price,
      contactOrLink: newExtContact.trim() || undefined,
    };

    setExternalVendors((prev) => [...prev, item]);
    setNewExtName('');
    setNewExtPrice('');
    setNewExtContact('');
    setIsAddingExternal(false);
  };

  const handleRemoveExternalVendor = (id: string) => {
    setExternalVendors((prev) => prev.filter((e) => e.id !== id));
  };

  const handleToggleStyle = (styleId: string) => {
    setSelectedStyles((prev) => {
      if (prev.includes(styleId)) {
        if (prev.length === 1) return prev; // Mantém pelo menos um estilo ativo
        return prev.filter((s) => s !== styleId);
      }
      return [...prev, styleId];
    });
  };

  const handleSaveAndFinish = () => {
    if (!brideName.trim()) {
      alert('Por favor, informe seu nome.');
      setStep(1);
      return;
    }

    const finalPlan: WeddingActionPlan = {
      brideName: brideName.trim(),
      partnerName: partnerName.trim(),
      weddingDate,
      currentCity: currentCity.trim() || 'São Paulo - SP',
      eventCity: sameCity ? (currentCity.trim() || 'São Paulo - SP') : (eventCity.trim() || 'São Paulo - SP'),
      sameCity,
      searchRadiusKm,
      totalBudget,
      weddingStyle: selectedStyles.join(' • '),
      weddingStyles: selectedStyles,
      selectedCategories,
      externalVendors,
    };

    // Salva localmente
    try {
      localStorage.setItem('priceus_bride_action_plan', JSON.stringify(finalPlan));
    } catch {}

    onSavePlan(finalPlan);
    onClose();
  };

  // Cálculo da soma de profissionais externos
  const externalTotal = externalVendors.reduce((acc, curr) => acc + curr.estimatedPrice, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-stone-200/90 flex flex-col overflow-hidden text-slate-800">
        {/* Header Elegante do Questionário */}
        <div className="px-6 py-4.5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-slate-900">
                  Plano de Ação para o Casamento
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                  Configuração Real
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                Personalize seu orçamento, estilo, GPS e profissionais desejados sem dados fictícios.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-slate-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Barra de Progresso dos Passos */}
        <div className="px-6 py-3 bg-white border-b border-stone-100 flex items-center justify-between text-xs font-semibold">
          {[
            { num: 1, label: 'Os Noivos' },
            { num: 2, label: 'GPS & Cidades' },
            { num: 3, label: 'Orçamento & Estilo' },
            { num: 4, label: 'Profissionais' },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setStep(s.num as any)}
              className={`flex items-center gap-2 transition-all cursor-pointer ${
                step === s.num
                  ? 'text-rose-600 font-bold'
                  : step > s.num
                  ? 'text-emerald-600'
                  : 'text-stone-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  step === s.num
                    ? 'bg-rose-600 text-white shadow-xs'
                    : step > s.num
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : 'bg-stone-100 text-stone-400'
                }`}
              >
                {step > s.num ? '✓' : s.num}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Conteúdo dos Passos */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6">
          {/* PASSO 1: OS NOIVOS & DATA */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Heart size={18} className="text-rose-500 fill-rose-500/20" />
                  Quem são os noivos e quando será o grande dia?
                </h3>
                <p className="text-xs text-stone-500">
                  Esses dados identificam suas propostas, contratos e conversas com fornecedores.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700">Seu Nome (Noiva)</label>
                  <input
                    type="text"
                    value={brideName}
                    onChange={(e) => setBrideName(e.target.value)}
                    placeholder="Ex: Mariana Silva"
                    className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 focus:border-rose-400 focus:bg-white text-xs sm:text-sm text-slate-900 placeholder-stone-400 focus:outline-hidden focus:ring-3 focus:ring-rose-500/15 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700">Nome do Noivo / Cônjuge</label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="Ex: Lucas Ferreira"
                    className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 focus:border-rose-400 focus:bg-white text-xs sm:text-sm text-slate-900 placeholder-stone-400 focus:outline-hidden focus:ring-3 focus:ring-rose-500/15 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Calendar size={14} className="text-rose-500" />
                  Data Prevista do Casamento
                </label>
                <input
                  type="date"
                  value={weddingDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                  className="w-full sm:max-w-xs px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 focus:border-rose-400 focus:bg-white text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-3 focus:ring-rose-500/15 transition-all"
                />
                <p className="text-[11px] text-stone-400">
                  Os profissionais usarão essa data para validar disponibilidade real de agenda.
                </p>
              </div>
            </div>
          )}

          {/* PASSO 2: LOCALIZAÇÃO, GPS & RAIO EM KM */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Compass size={18} className="text-rose-500" />
                  Onde você está e onde será o casamento?
                </h3>
                <p className="text-xs text-stone-500">
                  Você pode morar em uma cidade e realizar o casamento em outra (Destination Wedding).
                </p>
              </div>

              {/* Botão de Detecção Nativa por GPS */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50/80 via-pink-50/50 to-stone-50 border border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="space-y-1">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <MapPin size={15} className="text-rose-600" />
                    Identificação Automática por GPS
                  </span>
                  <p className="text-[11px] text-stone-600 leading-snug">
                    Permita que o navegador detecte suas coordenadas para sugerir fornecedores da sua região.
                  </p>
                  {gpsLocationLabel && (
                    <span className="text-[10px] text-emerald-700 font-semibold block pt-0.5">
                      ✓ {gpsLocationLabel}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleDetectGps}
                  disabled={isDetectingGps}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <MapPin size={13} />
                  <span>{isDetectingGps ? 'Localizando...' : 'Usar meu GPS'}</span>
                </button>
              </div>

              {/* Cidades: Onde Mora vs Onde Casa */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700">Cidade Onde Você Mora</label>
                  <input
                    type="text"
                    value={currentCity}
                    onChange={(e) => {
                      setCurrentCity(e.target.value);
                      if (sameCity) setEventCity(e.target.value);
                    }}
                    placeholder="Ex: São Paulo - SP"
                    className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 focus:border-rose-400 focus:bg-white text-xs sm:text-sm text-slate-900 focus:outline-hidden transition-all"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700 select-none">
                  <input
                    type="checkbox"
                    checked={sameCity}
                    onChange={(e) => {
                      setSameCity(e.target.checked);
                      if (e.target.checked) setEventCity(currentCity);
                    }}
                    className="rounded-md border-stone-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                  />
                  <span>O casamento será na mesma cidade onde moro</span>
                </label>

                {!sameCity && (
                  <div className="space-y-1.5 p-3.5 rounded-2xl bg-stone-50 border border-stone-200 animate-in fade-in duration-150">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-rose-500" />
                      Cidade Onde Será o Evento / Festa
                    </label>
                    <input
                      type="text"
                      value={eventCity}
                      onChange={(e) => setEventCity(e.target.value)}
                      placeholder="Ex: Búzios - RJ, Ilhabela - SP, Gramado - RS..."
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-stone-200 focus:border-rose-400 text-xs sm:text-sm text-slate-900 focus:outline-hidden"
                    />
                    <p className="text-[10px] text-stone-400">
                      O filtro de fornecedores priorizará profissionais que atendem a cidade do evento!
                    </p>
                  </div>
                )}
              </div>

              {/* Raio de Busca em KM */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-700">Raio de Atendimento Desejado</span>
                  <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                    {searchRadiusKm === 0 ? 'Todo o Brasil / Sem limite' : `Até ${searchRadiusKm} km de distância`}
                  </span>
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1">
                  {[
                    { km: 20, label: '20 km (Local)' },
                    { km: 50, label: '50 km (Metropolitano)' },
                    { km: 100, label: '100 km (Regional)' },
                    { km: 250, label: '250 km (Interestadual)' },
                    { km: 0, label: 'Brasil Todo (Destination)' },
                  ].map((r) => (
                    <button
                      key={r.km}
                      type="button"
                      onClick={() => setSearchRadiusKm(r.km)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                        searchRadiusKm === r.km
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PASSO 3: ORÇAMENTO & ESTILO */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <DollarSign size={18} className="text-emerald-600" />
                  Investimento Total Planejado & Estilo
                </h3>
                <p className="text-xs text-stone-500">
                  O PriceU$ ajudará você a manter cada contratação dentro da sua verba global.
                </p>
              </div>

              {/* Slider de Orçamento */}
              <div className="p-5 rounded-3xl bg-stone-50 border border-stone-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700">Orçamento Global Estimado</span>
                  <span className="text-xl font-black text-slate-900">
                    R$ {totalBudget.toLocaleString('pt-BR')}
                  </span>
                </div>

                <input
                  type="range"
                  min={15000}
                  max={250000}
                  step={5000}
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(Number(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-stone-400 font-medium">
                  <span>R$ 15.000</span>
                  <span>R$ 75.000</span>
                  <span>R$ 150.000</span>
                  <span>R$ 250.000+</span>
                </div>
              </div>

              {/* Seleção de Estilo do Casamento */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700 block">
                    Qual é a estética / estilo do seu casamento?
                  </label>
                  <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    Pode marcar mais de um estilo
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {WEDDING_STYLES.map((st) => {
                    const isSelected = selectedStyles.includes(st.id);
                    return (
                      <div
                        key={st.id}
                        onClick={() => handleToggleStyle(st.id)}
                        className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start justify-between gap-3 ${
                          isSelected
                            ? 'bg-rose-50/70 border-rose-500 shadow-sm ring-1 ring-rose-500'
                            : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="text-2xl flex-shrink-0">{st.icon}</span>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-900">{st.title}</p>
                            <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">{st.desc}</p>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'border border-stone-300 text-transparent'
                          }`}
                        >
                          ✓
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* PASSO 4: PROFISSIONAIS DESEJADOS & FORNECEDORES EXTERNOS */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users size={18} className="text-rose-500" />
                  Especialistas que você está buscando
                </h3>
                <p className="text-xs text-stone-500">
                  Selecione as áreas essenciais e adicione profissionais que você já contratou por fora.
                </p>
              </div>

              {/* Categorias Prioritárias */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {AVAILABLE_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleToggleCategory(cat.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-24 ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-[11px] font-bold leading-tight">{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Espaço para Profissionais de Fora da Lista */}
              <div className="space-y-3 pt-4 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Layers size={14} className="text-rose-500" />
                      Profissionais Externos (Já contratados ou de fora)
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Cadastre quem você já fechou ou pretende pesquisar por fora para somar no seu orçamento.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddingExternal(!isAddingExternal)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Adicionar Externo</span>
                  </button>
                </div>

                {/* Formulário de Adicionar Externo */}
                {isAddingExternal && (
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <input
                        type="text"
                        placeholder="Nome do Profissional / Empresa"
                        value={newExtName}
                        onChange={(e) => setNewExtName(e.target.value)}
                        className="px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs text-slate-900 focus:outline-hidden"
                      />

                      <select
                        value={newExtCategory}
                        onChange={(e) => setNewExtCategory(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs text-slate-900 focus:outline-hidden cursor-pointer"
                      >
                        <option value="fotografia">Fotografia</option>
                        <option value="video">Vídeo</option>
                        <option value="cabelo_make">Cabelo & Make</option>
                        <option value="decoracao">Decoração</option>
                        <option value="buffet">Buffet</option>
                        <option value="assessoria">Assessoria</option>
                        <option value="musica">Música / DJ</option>
                        <option value="outro">Outro Serviço</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Valor (R$)"
                        value={newExtPrice}
                        onChange={(e) => setNewExtPrice(e.target.value)}
                        className="px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs text-slate-900 focus:outline-hidden"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Telefone, WhatsApp ou Link do Instagram (Opcional)"
                        value={newExtContact}
                        onChange={(e) => setNewExtContact(e.target.value)}
                        className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs text-slate-900 focus:outline-hidden"
                      />

                      <button
                        type="button"
                        onClick={handleAddExternalVendor}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de Externos Adicionados */}
                {externalVendors.length > 0 && (
                  <div className="space-y-2">
                    {externalVendors.map((ext) => (
                      <div
                        key={ext.id}
                        className="p-3 rounded-2xl bg-white border border-stone-200 flex items-center justify-between text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center font-bold text-xs text-stone-600">
                            {ext.name.charAt(0)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{ext.name}</p>
                            <p className="text-[10px] text-stone-400 capitalize">
                              {ext.category} {ext.contactOrLink ? `• ${ext.contactOrLink}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900">
                            R$ {ext.estimatedPrice.toLocaleString('pt-BR')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveExternalVendor(ext.id)}
                            className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium flex items-center justify-between">
                      <span>Total em Fornecedores Externos:</span>
                      <strong className="font-black">R$ {externalTotal.toLocaleString('pt-BR')}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Navegação */}
        <div className="p-4 px-6 border-t border-stone-100 bg-stone-50/80 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ChevronLeft size={15} />
              <span>Voltar</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as any)}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-slate-900/10 cursor-pointer"
            >
              <span>Próximo Passo</span>
              <ChevronRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveAndFinish}
              className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-rose-900/20 scale-100 hover:scale-[1.02] cursor-pointer"
            >
              <Sparkles size={15} />
              <span>Ativar Meu Plano de Ação</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
