import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Sparkles, ArrowRight, ShieldCheck, Calendar, MapPin, DollarSign, Mail, User, Phone } from 'lucide-react';
import logoPriceUs from '../../assets/logo-priceus.png';
import { BrideMarketplaceService } from '../../services/brideMarketplaceService';

export function BrideLoginPage() {
  const navigate = useNavigate();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataCasamento, setDataCasamento] = useState('');
  const [cidade, setCidade] = useState('São Paulo - SP');
  const [orcamento, setOrcamento] = useState(60000);
  const [loading, setLoading] = useState(false);

  const handleLoginOrRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) {
      alert('Por favor, informe seu nome e e-mail.');
      return;
    }

    setLoading(true);
    try {
      await BrideMarketplaceService.loginOrCreateBride({
        nome_noiva: nome,
        email,
        telefone,
        data_casamento: dataCasamento,
        cidade,
        orcamento_planejado: orcamento,
      });

      navigate('/beta/portal-noiva');
    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro ao entrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setLoading(true);
    try {
      await BrideMarketplaceService.loginOrCreateBride({
        nome_noiva: 'Mariana Silva',
        email: 'mariana.noiva@priceus.com.br',
        telefone: '(11) 99887-6655',
        data_casamento: '2027-10-24',
        cidade: 'São Paulo - SP',
        orcamento_planejado: 65000,
      });

      navigate('/beta/portal-noiva');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] text-slate-800 flex flex-col justify-between selection:bg-rose-500 selection:text-white">
      {/* Top Header Sofisticado & Clean */}
      <header className="p-5 sm:p-6 max-w-7xl mx-auto w-full flex items-center justify-between border-b border-stone-200/70 bg-white/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img
            src={logoPriceUs}
            alt="Price Us"
            className="h-9 sm:h-10 w-auto object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo-priceus.png'; }}
          />
          <div className="h-5 w-px bg-stone-200 hidden sm:block" />
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-semibold shadow-xs">
            💍 Portal dos Noivos
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Espaço da Noiva
          </span>
        </div>
      </header>

      {/* Hero Central */}
      <main className="max-w-5xl mx-auto px-4 py-10 flex-1 flex flex-col items-center justify-center">
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
          {/* Coluna da Esquerda: Apresentação Editorial */}
          <div className="md:col-span-6 space-y-6 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200/70 text-rose-700 text-xs font-semibold shadow-xs">
              <Heart size={14} className="fill-rose-500 text-rose-500" />
              Experiência VIP para Noivas & Noivos
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 leading-[1.15] tracking-tight">
              Todos os seus fornecedores em uma só mesa.
            </h1>

            <p className="text-base text-slate-600 leading-relaxed">
              Consulte fotógrafos, cineastas, decoradores e maquiadores em <strong>abas simultâneas</strong>, receba propostas em tempo real pelo <strong>Chat do Quotes</strong> e acompanhe seu orçamento com total elegância.
            </p>

            {/* Botão de Teste Rápido de 1 Clique */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleQuickDemoLogin}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-rose-500/25 transition-all scale-100 hover:scale-[1.02] cursor-pointer"
              >
                <Sparkles size={16} />
                <span>Entrar Imediatamente como Noiva (Mariana)</span>
              </button>
              <p className="text-xs text-stone-500 mt-2 font-medium">
                * Demonstração pronta em 1 clique com orçamentos e chat interativo.
              </p>
            </div>
          </div>

          {/* Coluna da Direita: Card de Acesso Personalizado Clean */}
          <div className="md:col-span-6">
            <div className="p-7 sm:p-8 rounded-3xl bg-white border border-stone-200/80 shadow-2xl shadow-stone-200/60 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <User size={18} className="text-rose-600" />
                  Personalize seu Acesso
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Informe seus dados para carregar fornecedores da sua região
                </p>
              </div>

              <form onSubmit={handleLoginOrRegister} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-700 font-semibold mb-1.5">Seu Nome Completo *</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Mariana Silva"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50/70 border border-stone-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-700 font-semibold mb-1.5">Seu E-mail *</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                    <input
                      type="email"
                      required
                      placeholder="mariana@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50/70 border border-stone-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-700 font-semibold mb-1.5">Data do Casamento</label>
                    <input
                      type="date"
                      value={dataCasamento}
                      onChange={(e) => setDataCasamento(e.target.value)}
                      className="w-full px-3 py-2.5 bg-stone-50/70 border border-stone-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-700 font-semibold mb-1.5">Cidade</label>
                    <input
                      type="text"
                      placeholder="São Paulo - SP"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      className="w-full px-3 py-2.5 bg-stone-50/70 border border-stone-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-700 font-semibold mb-1.5">
                    Orçamento Planejado (R$)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                    <input
                      type="number"
                      step="1000"
                      value={orcamento}
                      onChange={(e) => setOrcamento(Number(e.target.value))}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50/70 border border-stone-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 transition-all cursor-pointer"
                >
                  <span>{loading ? 'Acessando Workspace...' : 'Entrar no Workspace dos Noivos'}</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Clean */}
      <footer className="p-4 border-t border-stone-200/80 bg-white text-center text-xs text-slate-400">
        PriceU$ © 2026 • Ecossistema Inteligente para Noivos & Fornecedores de Casamento
      </footer>
    </div>
  );
}
