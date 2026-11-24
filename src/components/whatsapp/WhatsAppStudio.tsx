import { useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  TrendingUp,
  Settings,
  Bot,
  AlertTriangle
} from 'lucide-react';
import { useWhatsAppAccess } from '../../hooks/useWhatsAppAccess';
import { WhatsAppLiveCommandCenter } from './WhatsAppLiveCommandCenter';
import { WhatsAppTrainingStudio } from './WhatsAppTrainingStudio';
import { WhatsAppBusinessAdvisory } from './WhatsAppBusinessAdvisory';
import { WhatsAppSettings } from './WhatsAppSettings';

interface WhatsAppStudioProps {
  userEmail?: string;
}

export function WhatsAppStudio({ userEmail }: WhatsAppStudioProps) {
  const [activeTab, setActiveTab] = useState<'command' | 'training' | 'advisory' | 'settings'>('command');
  const access = useWhatsAppAccess(userEmail);

  // Se não estiver em ambiente localhost ou se o e-mail não for liberado
  if (!access.hasAccess) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-6">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-lg">Acesso Restrito - Módulo em Desenvolvimento</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              O módulo <span className="text-emerald-400 font-medium">Priceus Sales AI</span> está ativado exclusivamente para ambiente <code className="bg-slate-950 px-1.5 py-0.5 rounded text-xs text-amber-300">Localhost / Docker Dev</code> e e-mails pré-autorizados.
            </p>
          </div>
          <p className="text-xs text-slate-500 bg-slate-950 p-3 rounded-xl border border-slate-800">
            {access.reason}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 🚀 Header Principal do Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Priceus Sales AI</h1>
              <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/20">
                PROTÓTIPO ATIVO
              </span>
            </div>
            <p className="text-sm text-slate-400">
              Time de Vendas 24/7 alimentado pelo Google Gemini com cruzamento multidimensional de dados e inteligência comercial.
            </p>
          </div>
        </div>

        {/* Status de Conexão Rápida */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-medium">WhatsApp Conectado</span>
          </div>
        </div>
      </div>

      {/* 📑 Navegação em Abas Intuitivas */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('command')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm rounded-t-xl transition border-b-2 whitespace-nowrap ${
            activeTab === 'command'
              ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Central de Comando ao Vivo</span>
        </button>

        <button
          onClick={() => setActiveTab('training')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm rounded-t-xl transition border-b-2 whitespace-nowrap ${
            activeTab === 'training'
              ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Treinamento & Sandbox</span>
        </button>

        <button
          onClick={() => setActiveTab('advisory')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm rounded-t-xl transition border-b-2 whitespace-nowrap ${
            activeTab === 'advisory'
              ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Diagnóstico Commercial</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm rounded-t-xl transition border-b-2 whitespace-nowrap ${
            activeTab === 'settings'
              ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Configurações & Google Auth</span>
        </button>
      </div>

      {/* 📺 Conteúdo da Aba Ativa */}
      <div className="pt-2">
        {activeTab === 'command' && <WhatsAppLiveCommandCenter />}
        {activeTab === 'training' && <WhatsAppTrainingStudio />}
        {activeTab === 'advisory' && <WhatsAppBusinessAdvisory />}
        {activeTab === 'settings' && <WhatsAppSettings />}
      </div>
    </div>
  );
}
