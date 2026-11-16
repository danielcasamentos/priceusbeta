import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Check, ArrowRight, Menu, X, Sparkles, Shield, Globe, Smartphone, Heart, Briefcase, Calendar, MessageSquare, Award, Star, Lock } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { AppInstallBanner } from '../components/AppInstallBanner';
import logoPriceUsLight from '../assets/logo-priceus.png';

/* ─── Hook contador animado ─── */
function useCountUp(target: number, duration = 2000, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = target / (duration / 16);
    const t = setInterval(() => {
      start = Math.min(start + step, target);
      setVal(Math.floor(start));
      if (start >= target) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [active, target, duration]);
  return val;
}

/* ─── Hook Intersection Observer ─── */
function useInView(ref: React.RefObject<Element>) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return inView;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Demo 1 — Telas do Dashboard
  const [dashScreen, setDashScreen] = useState(0);
  const [dashPlaying, setDashPlaying] = useState(true);
  const dashRef = useRef<HTMLDivElement>(null!);
  const dashInView = useInView(dashRef);
  useEffect(() => {
    if (!dashInView || !dashPlaying) return;
    const t = setInterval(() => setDashScreen(s => (s + 1) % 4), 5000);
    return () => clearInterval(t);
  }, [dashInView, dashPlaying]);

  // Demo 3 — Passos da Jornada
  const journeyRef = useRef<HTMLDivElement>(null!);
  const journeyInView = useInView(journeyRef);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  useEffect(() => {
    if (!journeyInView) return;
    [0, 1, 2, 3, 4].forEach(i => setTimeout(() => setVisibleSteps(p => [...p, i]), 300 + i * 400));
  }, [journeyInView]);

  // Demo 4 — ROI counters
  const roiRef = useRef<HTMLDivElement>(null!);
  const roiInView = useInView(roiRef);
  const receita = useCountUp(89400, 2200, roiInView);
  const leads   = useCountUp(47, 1800, roiInView);
  const conv    = useCountUp(89, 1800, roiInView);
  const horas   = useCountUp(15, 1600, roiInView);

  const dashScreens = [
    { label: 'Visão Geral', title: 'Centro de Comando do Profissional', desc: 'Faturamento, propostas ativas, contratos assinados e agenda em um painel executivo clean.' },
    { label: 'Gestão de Leads', title: 'Funil & CRM Inteligente', desc: 'Acompanhe cada etapa de negociação com clientes, valores em aberto e follow-up automático.' },
    { label: 'Contratos & Assinatura', title: 'Segurança Jurídica com 1 Clique', desc: 'Contratos gerados automaticamente a partir do orçamento aceito, assinados na tela do celular.' },
    { label: 'Conversas & Chat IA', title: 'Atendimento VIP em Tempo Real', desc: 'Negociação ao vivo de pacotes, envio de bônus, atas transcritas por IA e transição pro WhatsApp.' },
  ];

  const journeySteps = [
    { emoji: '📸', color: '#0f172a', bg: '#f1f5f9', border: '#cbd5e1', title: '1. O cliente descobre seu trabalho', desc: 'Vê suas fotos no Instagram, site ou indicação e acessa sua proposta interativa e exclusiva no PriceU$.' },
    { emoji: '✨', color: '#b45309', bg: '#fef3c7', border: '#fde68a', title: '2. Monta o orçamento em tempo real', desc: 'A noiva ou cliente escolhe os pacotes desejados, adicionais e vê os valores atualizados sem fricção.' },
    { emoji: '💬', color: '#047857', bg: '#d1fae5', border: '#a7f3d0', title: '3. Negociação direta no Chat PriceU$', desc: 'Tira dúvidas ao vivo, ajusta opções de parcelamento e recebe bônus especiais sem intermediários.' },
    { emoji: '✍️', color: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe', title: '4. Contrato digital assinado no celular', desc: 'O contrato nasce preenchido a partir do orçamento. Assinatura eletrônica válida e juridicamente segura.' },
    { emoji: '💎', color: '#0f172a', bg: '#f3e8ff', border: '#e9d5ff', title: '5. Evento confirmado & data reservada', desc: 'Entrada registrada, data blindada na sua agenda oficial e fotos entregues em galeria de alta resolução.' },
  ];

  const planFeatures = [
    'Orçamentos ilimitados e interativos',
    'Contratos digitais com assinatura no celular',
    'Agenda de eventos blindada e sincronizada',
    'Chat de negociação ao vivo com gravação e atas',
    'Espaço da Noiva & Portal Multi-Fornecedor',
    'Galerias de entrega de fotos em alta resolução',
    'CRM completo e funil de conversão de leads',
    'Dashboard financeiro e controle de parcelas',
    'Templates personalizados por tema e nicho',
    'Compatível com iPhone, Android, Mac e Windows',
    'Suporte prioritário humanizado em português',
    'Cancele a qualquer momento sem multas',
  ];

  return (
    <div className="min-h-screen bg-[#fafaf9] text-slate-900 font-sans selection:bg-stone-900 selection:text-white">
      <Helmet>
        <title>PriceU$ — A Plataforma nº 1 para Casamentos & Eventos de Alto Padrão</title>
        <meta name="description" content="Sistema de gestão e orçamentos interativos, contratos digitais com assinatura eletrônica e chat de negociação ao vivo para o mercado de casamentos e eventos." />
      </Helmet>

      {/* TOP NAVIGATION CHIQUE */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200/80 transition-all">
        <AppInstallBanner variant="topbar" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          {/* Logo PriceU$ */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <img
                src={logoPriceUsLight}
                alt="PriceU$"
                className="h-10 sm:h-11 w-auto object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo-priceus.png'; }}
              />
            </Link>
          </div>

          {/* Links Centrais Desktop */}
          <div className="hidden lg:flex items-center gap-8 text-sm font-semibold text-stone-600">
            <a href="#sistema" className="hover:text-stone-950 transition-colors">Sistema</a>
            <a href="#jornada" className="hover:text-stone-950 transition-colors">Como Funciona</a>
            <a href="#roi" className="hover:text-stone-950 transition-colors">Resultados</a>
            <a href="#planos" className="hover:text-stone-950 transition-colors">Planos</a>
          </div>

          {/* CTAs da Barra Superior */}
          <div className="hidden md:flex items-center gap-3">
            {/* Atalho Espaço dos Noivos */}
            <button
              onClick={() => navigate('/login?tipo=noiva')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200/80 text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <Heart size={14} className="fill-rose-500 text-rose-500" />
              <span>Sou Noiva / Cliente</span>
            </button>

            {/* Login Profissional */}
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-stone-700 hover:text-stone-950 transition-colors cursor-pointer"
            >
              Entrar
            </button>

            {/* Começar Grátis */}
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
            >
              <span>Começar Grátis</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Menu Mobile Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-stone-700 hover:text-stone-950 rounded-lg hover:bg-stone-100 transition-colors"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Menu Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-stone-200 px-6 py-6 space-y-4 shadow-xl animate-fade-in">
            <div className="flex flex-col space-y-3 font-semibold text-stone-700">
              <a href="#sistema" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-stone-950">Sistema</a>
              <a href="#jornada" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-stone-950">Como Funciona</a>
              <a href="#roi" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-stone-950">Resultados</a>
              <a href="#planos" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-stone-950">Planos</a>
            </div>

            <div className="pt-4 border-t border-stone-200 flex flex-col gap-2.5">
              <button
                onClick={() => { setMobileMenuOpen(false); navigate('/login?tipo=noiva'); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 font-bold text-sm"
              >
                <Heart size={16} className="fill-rose-500 text-rose-500" />
                <span>Sou Noiva / Cliente</span>
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                className="w-full py-3 rounded-xl bg-stone-900 text-white font-bold text-sm shadow-md"
              >
                Acessar como Profissional
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* HERO SECTION EDITORIAL CHIQUE */}
      <section className="pt-36 sm:pt-44 pb-20 px-4 sm:px-6 relative overflow-hidden bg-gradient-to-b from-[#fafaf9] via-white to-[#fafaf9]">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge Luxo */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-stone-800 text-xs font-bold tracking-wide uppercase mb-6 shadow-xs">
            <Sparkles size={14} className="text-emerald-700" />
            A Plataforma Oficial do Mercado de Casamentos & Eventos
          </div>

          {/* Headline Principal */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-slate-900 leading-[1.08] tracking-tight mb-6">
            Propostas que encantam.<br />
            <span className="text-stone-800 bg-gradient-to-r from-stone-900 via-stone-800 to-emerald-900 bg-clip-text text-transparent">
              Contratos assinados na hora.
            </span>
          </h1>

          {/* Subtítulo */}
          <p className="text-lg sm:text-xl text-stone-600 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            O PriceU$ une propostas interativas ao vivo, contratos com validade jurídica, agenda blindada e chat de negociação inteligente — conectando os melhores profissionais às noivas e clientes mais exigentes.
          </p>

          {/* Botões de Ação Duplos */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-12">
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-stone-900 hover:bg-stone-800 active:scale-98 text-white font-extrabold text-base shadow-xl shadow-stone-900/10 transition-all cursor-pointer"
            >
              <span>Começar Teste Grátis</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={() => navigate('/login?tipo=noiva')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white hover:bg-stone-50 active:scale-98 text-stone-900 border border-stone-300 font-bold text-base shadow-sm transition-all cursor-pointer"
            >
              <Heart size={18} className="fill-rose-500 text-rose-500" />
              <span>Espaço da Noiva</span>
            </button>
          </div>

          <p className="text-xs text-stone-400 flex items-center justify-center gap-3 font-medium">
            <span>✓ Teste grátis de 30 dias</span>
            <span>·</span>
            <span>✓ Sem cartão de crédito</span>
            <span>·</span>
            <span>✓ Ativação imediata</span>
          </p>

          {/* Prova Social em Cards Brancos Refinados */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: '📸', label: 'Profissionais Ativos', val: '+500' },
              { icon: '💎', label: 'Receita Gerada', val: 'R$ 2.4M+' },
              { icon: '✍️', label: 'Contratos Assinados', val: '9.200+' },
              { icon: '⭐', label: 'Satisfação dos Clientes', val: '4.9 / 5.0' },
            ].map((stat, i) => (
              <div key={i} className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs text-center">
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{stat.val}</div>
                <div className="text-xs text-stone-500 font-medium mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SEÇÃO 1: SISTEMA E RECURSOS DO PROFISSIONAL ═══ */}
      <section id="sistema" className="py-24 px-4 sm:px-6 bg-white border-y border-stone-200/80">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Tudo em um só lugar
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mt-4 mb-4">
              A suíte completa para o seu negócio de eventos.
            </h2>
            <p className="text-base text-stone-600">
              Substitua dezenas de ferramentas avulsas e planilhas por uma plataforma elegante, rápida e centralizada.
            </p>
          </div>

          <div ref={dashRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dashScreens.map((item, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-3xl border transition-all cursor-pointer ${
                  dashScreen === idx
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xl'
                    : 'bg-[#fafaf9] text-slate-900 border-stone-200 hover:border-stone-400'
                }`}
                onClick={() => setDashScreen(idx)}
              >
                <div className="text-xs font-bold uppercase tracking-wider mb-2 opacity-75">
                  {item.label}
                </div>
                <h3 className="text-lg font-bold mb-2 leading-snug">
                  {item.title}
                </h3>
                <p className={`text-xs leading-relaxed ${dashScreen === idx ? 'text-stone-300' : 'text-stone-600'}`}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Destaque das 4 Soluções Principais */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-[#fafaf9] border border-stone-200/80 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 flex items-center justify-center text-xl mb-6 shadow-xs">
                📄
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Orçamentos Vivos</h4>
              <p className="text-sm text-stone-600 leading-relaxed">
                Páginas modernas onde o cliente personaliza pacotes, vê opcionais, condições de parcelamento e negocia direto com você pelo chat ao vivo.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#fafaf9] border border-stone-200/80 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 flex items-center justify-center text-xl mb-6 shadow-xs">
                ✍️
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Contratos com Assinatura</h4>
              <p className="text-sm text-stone-600 leading-relaxed">
                Gere contratos em segundos a partir do orçamento aprovado. O cliente assina eletronicamente na tela do celular com total respaldo jurídico.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#fafaf9] border border-stone-200/80 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 flex items-center justify-center text-xl mb-6 shadow-xs">
                💬
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Chat & Atendimento VIP</h4>
              <p className="text-sm text-stone-600 leading-relaxed">
                Converse, ajuste valores, envie áudios ou faça reuniões online seguras com gravação e atas transcritas por IA direto na conversa.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SEÇÃO 2: A JORNADA DO CASAMENTO / EVENTO ═══ */}
      <section id="jornada" ref={journeyRef} className="py-24 px-4 sm:px-6 bg-[#fafaf9]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-stone-700 bg-stone-200 px-3 py-1 rounded-full">
              Experiência Sem Atrito
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mt-4 mb-4">
              A jornada de compra mais encantadora do mercado.
            </h2>
            <p className="text-base text-stone-600">
              Veja como o PriceU$ transforma simples curiosos do Instagram em contratos fechados com pagamento confirmado.
            </p>
          </div>

          <div className="space-y-4">
            {journeySteps.map((step, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs flex items-start gap-5 transition-all hover:shadow-md"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 border"
                  style={{ backgroundColor: step.bg, borderColor: step.border }}
                >
                  {step.emoji}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{step.title}</h3>
                  <p className="text-sm text-stone-600 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SEÇÃO 3: ROI E RESULTADOS REAIS ═══ */}
      <section id="roi" ref={roiRef} className="py-24 px-4 sm:px-6 bg-white border-y border-stone-200/80">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-stone-800 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
              Resultados Comprovados
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mt-4 mb-4">
              Menos burocracia, mais contratos fechados.
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-3xl bg-[#fafaf9] border border-stone-200 text-center">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 mb-1">
                R$ {receita.toLocaleString('pt-BR')}
              </div>
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">Faturamento Médio</div>
              <p className="text-[11px] text-stone-400 mt-2">Gerado por profissional ao ano</p>
            </div>

            <div className="p-6 rounded-3xl bg-[#fafaf9] border border-stone-200 text-center">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 mb-1">
                {leads}+
              </div>
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">Leads Qualificados</div>
              <p className="text-[11px] text-stone-400 mt-2">Recebidos todo mês</p>
            </div>

            <div className="p-6 rounded-3xl bg-[#fafaf9] border border-stone-200 text-center">
              <div className="text-3xl sm:text-4xl font-black text-emerald-800 mb-1">
                {conv}%
              </div>
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">Taxa de Resposta</div>
              <p className="text-[11px] text-stone-400 mt-2">Com o Chat Online ativo</p>
            </div>

            <div className="p-6 rounded-3xl bg-[#fafaf9] border border-stone-200 text-center">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 mb-1">
                {horas}h
              </div>
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">Tempo Economizado</div>
              <p className="text-[11px] text-stone-400 mt-2">Por semana em orçamentos manuais</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SEÇÃO 4: PLANOS E ASSINATURA ═══ */}
      <section id="planos" className="py-24 px-4 sm:px-6 bg-[#fafaf9]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Transparência Total
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mt-4 mb-4">
              Investimento simples para transformar seu negócio.
            </h2>
            <p className="text-base text-stone-600">
              Comece agora com 30 dias totalmente grátis. Cancele quando quiser sem pegadinhas.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-stone-200 shadow-xl shadow-stone-200/60">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-stone-200">
              <div>
                <span className="px-3 py-1 rounded-full bg-stone-900 text-white text-xs font-bold uppercase tracking-wider">
                  Plano Profissional All-in-One
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">Acesso Completo & Ilimitado</h3>
                <p className="text-sm text-stone-500 mt-1">Todos os recursos inclusos sem limites artificiais de uso.</p>
              </div>

              <div className="text-left md:text-right">
                <div className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Apenas</div>
                <div className="text-4xl sm:text-5xl font-black text-slate-900">
                  R$ 79<span className="text-lg font-semibold text-stone-500">/mês</span>
                </div>
                <div className="text-xs text-emerald-700 font-bold mt-1">30 dias grátis para testar</div>
              </div>
            </div>

            <div className="py-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {planFeatures.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                    <Check size={13} strokeWidth={3} />
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <div className="pt-8 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-stone-500 text-center sm:text-left">
                🔒 Pagamento seguro via Stripe · Cancele quando quiser com 1 clique
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer"
              >
                Ativar Meus 30 Dias Grátis
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER CHIQUE */}
      <footer className="bg-white border-t border-stone-200 py-16 px-4 sm:px-6 text-sm text-stone-600">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <img
              src={logoPriceUsLight}
              alt="PriceU$"
              className="h-8 w-auto object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo-priceus.png'; }}
            />
            <p className="text-xs text-stone-500">
              © {new Date().getFullYear()} PriceU$ Tecnologia. Todos os direitos reservados.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-xs font-semibold text-stone-600">
            <Link to="/termos-de-servico" className="hover:text-stone-900 transition-colors">Termos de Serviço</Link>
            <Link to="/politica-de-privacidade" className="hover:text-stone-900 transition-colors">Política de Privacidade</Link>
            <Link to="/tutoriais" className="hover:text-stone-900 transition-colors">Tutoriais</Link>
            <Link to="/celular" className="hover:text-stone-900 transition-colors">App Celular</Link>
            <Link to="/desktop" className="hover:text-stone-900 transition-colors">App Desktop</Link>
            <Link to="/login?tipo=noiva" className="text-rose-700 hover:text-rose-900 transition-colors">Espaço da Noiva</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
