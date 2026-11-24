import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { LoginForm } from './LoginForm';
import { ShieldCheck, CheckCircle2, Laptop, ArrowRight, Copy, Check } from 'lucide-react';

export function DesktopAuthBridge() {
  const { user } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [sessionData, setSessionData] = useState<{ access_token: string; refresh_token: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionData({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      }
    });
  }, [user]);

  const handleAuthorizeDesktop = async () => {
    if (!sessionData) return;
    setConnecting(true);

    try {
      // 1. Tenta enviar para o servidor loopback local do Electron (Porta 54321)
      try {
        await fetch(
          `http://127.0.0.1:54321/auth-callback?access_token=${encodeURIComponent(
            sessionData.access_token
          )}&refresh_token=${encodeURIComponent(sessionData.refresh_token)}`,
          { method: 'GET', mode: 'no-cors' }
        );
      } catch (e) {
        console.warn('Loopback fetch fallback:', e);
      }

      // 2. Dispara Deep Link do protocolo nativo priceus://
      const deepLink = `priceus://auth/callback#access_token=${sessionData.access_token}&refresh_token=${sessionData.refresh_token}`;
      window.location.href = deepLink;

      setConnected(true);
    } catch (err) {
      console.error('Erro ao conectar desktop:', err);
    } finally {
      setConnecting(false);
    }
  };

  const handleCopyToken = () => {
    if (!sessionData?.access_token) return;
    navigator.clipboard.writeText(sessionData.access_token);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Cabeçalho */}
        <div className="text-center mb-6 relative">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Laptop className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Conectar PriceU$ Desktop
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Autenticação rápida com 1 clique para o aplicativo instalado no seu computador.
          </p>
        </div>

        {!user ? (
          <div>
            <div className="mb-4 text-xs text-amber-400 bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 text-center">
              Faça login na sua conta para autorizar o aplicativo Desktop automaticamente:
            </div>
            <LoginForm />
          </div>
        ) : connected ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-white">
              App Desktop Conectado!
            </h2>
            <p className="text-xs text-slate-400">
              Seu aplicativo <strong>PriceU$ Desktop</strong> foi autenticado com sucesso e já está pronto para uso. Você pode voltar para a janela do aplicativo.
            </p>
            <button
              onClick={() => window.close()}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Fechar esta página
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Card do Usuário Logado */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-500 to-purple-600 flex items-center justify-center text-white font-black text-sm uppercase">
                {user.email?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400">Conectando como:</p>
                <p className="text-sm font-bold text-white truncate">{user.email}</p>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            </div>

            {/* Botão Principal de Conexão */}
            <button
              type="button"
              onClick={handleAuthorizeDesktop}
              disabled={connecting}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition transform active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              {connecting ? (
                <span>Conectando ao Desktop...</span>
              ) : (
                <>
                  <span>⚡ Confirmar e Conectar PriceU$ Desktop</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Opção de Copiar Código Alternativo */}
            <div className="border-t border-slate-800/80 pt-4 text-center">
              <p className="text-[11px] text-slate-500 mb-2">
                O aplicativo não abriu automaticamente?
              </p>
              <button
                type="button"
                onClick={handleCopyToken}
                className="text-xs text-slate-400 hover:text-emerald-400 transition flex items-center justify-center gap-1.5 mx-auto font-medium cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Código copiado com sucesso!' : 'Copiar token de autorização manual'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
