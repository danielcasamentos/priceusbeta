import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';
import { AppInstallBanner } from '../components/AppInstallBanner';
import { BrideMarketplaceService } from '../services/brideMarketplaceService';
import { Heart, Briefcase, Sparkles, Mail, Lock, User, Phone, Calendar, MapPin, ArrowRight } from 'lucide-react';
import logoPriceUsLight from '../assets/logo-priceus.png';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Tipo de conta: 'vendor' (Fornecedor/Profissional) ou 'bride' (Noiva/Cliente)
  const initialType = searchParams.get('tipo') === 'noiva' ? 'bride' : 'vendor';
  const [accountType, setAccountType] = useState<'vendor' | 'bride'>(initialType);

  // Estados do Fornecedor
  const [isLogin, setIsLogin] = useState(true);

  // Estados da Noiva
  const [brideIsLogin, setBrideIsLogin] = useState(true);
  const [brideName, setBrideName] = useState('');
  const [brideEmail, setBrideEmail] = useState('');
  const [bridePhone, setBridePhone] = useState('');
  const [brideEventDate, setBrideEventDate] = useState('');
  const [brideCity, setBrideCity] = useState('');
  const [brideLoading, setBrideLoading] = useState(false);

  useEffect(() => {
    if (user && accountType === 'vendor') {
      navigate('/dashboard/meu-dia');
    }
  }, [user, accountType, navigate]);

  const handleSuccess = () => {
    navigate('/dashboard/meu-dia');
  };

  const handleBrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brideEmail.trim()) {
      alert('Por favor, informe seu e-mail para acessar.');
      return;
    }

    if (!brideIsLogin && !brideName.trim()) {
      alert('Por favor, informe seu nome.');
      return;
    }

    setBrideLoading(true);
    try {
      await BrideMarketplaceService.loginOrCreateBride({
        nome_noiva: brideName.trim() || brideEmail.split('@')[0],
        email: brideEmail.trim(),
        telefone: bridePhone.trim(),
        data_casamento: brideEventDate || undefined,
        cidade: brideCity.trim() || undefined,
        orcamento_planejado: 50000,
      });

      navigate('/beta/portal-noiva');
    } catch (err) {
      console.error(err);
      alert('Não foi possível acessar no momento. Verifique seus dados e tente novamente.');
    } finally {
      setBrideLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center p-4 selection:bg-stone-900 selection:text-white">
      <div className="w-full max-w-md">
        {/* Logo PriceU$ com link para a home */}
        <div className="text-center mb-6">
          <a href="/" className="inline-block hover:opacity-90 transition-opacity">
            <img
              src={logoPriceUsLight}
              alt="Price Us"
              className="h-14 sm:h-16 w-auto mx-auto object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo-priceus.png'; }}
            />
          </a>
        </div>

        {/* Card Principal em Fundo Branco Chique */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-stone-200/70 border border-stone-200/80 transition-all">
          {/* Seletor Chique: Fornecedor vs Noiva / Cliente */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => setAccountType('vendor')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                accountType === 'vendor'
                  ? 'bg-white text-slate-900 shadow-sm border border-stone-200/80'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <Briefcase size={15} className={accountType === 'vendor' ? 'text-stone-900' : 'text-stone-400'} />
              <span>Profissional</span>
            </button>

            <button
              type="button"
              onClick={() => setAccountType('bride')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                accountType === 'bride'
                  ? 'bg-white text-slate-900 shadow-sm border border-stone-200/80'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <Heart size={15} className={accountType === 'bride' ? 'fill-rose-500 text-rose-500' : 'text-stone-400'} />
              <span>Noiva / Cliente</span>
            </button>
          </div>

          {/* FLUXO 1: FORNECEDOR / PROFISSIONAL */}
          {accountType === 'vendor' ? (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {isLogin ? 'Painel do Profissional' : 'Crie sua conta profissional'}
                </h2>
                <p className="text-sm text-stone-500 mt-1">
                  {isLogin ? 'Acesse orçamentos, contratos, agenda e leads.' : 'Comece seu teste com templates e contratos ilimitados.'}
                </p>
              </div>

              {isLogin ? (
                <LoginForm onSuccess={handleSuccess} />
              ) : (
                <SignupForm onSuccess={handleSuccess} />
              )}

              <p className="mt-6 text-center text-sm text-stone-500">
                {isLogin ? 'Ainda não é cadastrado?' : 'Já tem uma conta de profissional?'}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="font-bold text-stone-900 hover:text-stone-700 ml-1 underline underline-offset-2 cursor-pointer"
                >
                  {isLogin ? 'Cadastre-se' : 'Fazer login'}
                </button>
              </p>
            </div>
          ) : (
            /* FLUXO 2: NOIVA / CLIENTE */
            <div>
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/70 text-rose-700 text-xs font-semibold mb-2">
                  <Sparkles size={13} className="text-rose-500" />
                  Espaço Exclusivo dos Noivos
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {brideIsLogin ? 'Bem-vinda de volta!' : 'Cadastre seu Casamento'}
                </h2>
                <p className="text-sm text-stone-500 mt-1">
                  {brideIsLogin
                    ? 'Acesse suas propostas salvas e converse com fornecedores.'
                    : 'Compare propostas, converse no chat e organize seu grande dia.'}
                </p>
              </div>

              <form onSubmit={handleBrideSubmit} className="space-y-3.5">
                {!brideIsLogin && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Seu Nome Completo
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={brideName}
                        onChange={(e) => setBrideName(e.target.value)}
                        placeholder="Ex: Mariana Silva"
                        required={!brideIsLogin}
                        className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-slate-900 placeholder:text-stone-400 focus:bg-white focus:border-stone-400 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      value={brideEmail}
                      onChange={(e) => setBrideEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-slate-900 placeholder:text-stone-400 focus:bg-white focus:border-stone-400 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {!brideIsLogin && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        WhatsApp / Celular
                      </label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="tel"
                          value={bridePhone}
                          onChange={(e) => setBridePhone(e.target.value)}
                          placeholder="(11) 99999-9999"
                          className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-slate-900 placeholder:text-stone-400 focus:bg-white focus:border-stone-400 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Data do Evento
                        </label>
                        <div className="relative">
                          <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                          <input
                            type="date"
                            value={brideEventDate}
                            onChange={(e) => setBrideEventDate(e.target.value)}
                            className="w-full pl-10 pr-2 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-stone-400 focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Cidade
                        </label>
                        <div className="relative">
                          <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                          <input
                            type="text"
                            value={brideCity}
                            onChange={(e) => setBrideCity(e.target.value)}
                            placeholder="Ex: São Paulo"
                            className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-900 placeholder:text-stone-400 focus:bg-white focus:border-stone-400 focus:outline-none transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={brideLoading}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 active:scale-98 text-white py-3 px-4 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <span>{brideLoading ? 'Conectando...' : brideIsLogin ? 'Entrar no Espaço da Noiva' : 'Cadastrar Meu Evento'}</span>
                  <ArrowRight size={16} />
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-stone-500">
                {brideIsLogin ? 'Ainda não cadastrou seu casamento?' : 'Já tem cadastro?'}
                <button
                  type="button"
                  onClick={() => setBrideIsLogin(!brideIsLogin)}
                  className="font-bold text-stone-900 hover:text-stone-700 ml-1 underline underline-offset-2 cursor-pointer"
                >
                  {brideIsLogin ? 'Cadastre-se grátis' : 'Fazer login'}
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Banner de Instalação do App */}
        <div className="mt-6">
          <AppInstallBanner />
        </div>
      </div>
    </div>
  );
}