import React, { useState, useEffect } from 'react';
import { MessageSquare, Sparkles, X, ChevronUp, CheckCircle, ShieldCheck } from 'lucide-react';

export interface QuoteLiveChatDockProps {
  vendorName: string;
  vendorAvatar?: string;
  clientName?: string;
  totalValue: number;
  hasSelectedItems: boolean;
  isFormFilled: boolean;
  hasExistingChat: boolean;
  isChatOpen: boolean;
  isStartingChat?: boolean;
  onOpenChat: () => void;
  formatCurrency: (val: number) => string;
}

export function QuoteLiveChatDock({
  vendorName,
  vendorAvatar,
  clientName,
  totalValue,
  hasSelectedItems,
  isFormFilled,
  hasExistingChat,
  isChatOpen,
  isStartingChat,
  onOpenChat,
  formatCurrency,
}: QuoteLiveChatDockProps) {
  // Controle de estado minimizado/expandido do balão proativo
  const [isDismissed, setIsDismissed] = useState(false);
  const [pulseInvite, setPulseInvite] = useState(false);

  // Quando o cliente seleciona itens ou preenche dados pela primeira vez, ativa um pulso convidativo sutil
  useEffect(() => {
    if (hasSelectedItems || isFormFilled) {
      setPulseInvite(true);
      const timer = setTimeout(() => setPulseInvite(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [hasSelectedItems, isFormFilled]);

  // Se o drawer já estiver aberto, não precisa exibir o dock flutuante
  if (isChatOpen) return null;

  // Só exibe se houver itens selecionados, ou formulário começado, ou se já tiver chat criado
  if (!hasSelectedItems && !isFormFilled && !hasExistingChat) return null;

  const firstName = clientName?.trim().split(' ')[0] || '';

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-40 flex flex-col items-end max-w-[340px] sm:max-w-sm pointer-events-auto animate-fade-in">
      {/* Balão Proativo Inteligente Chique (Fundo Branco Luxo) */}
      {!isDismissed && (hasSelectedItems || isFormFilled) && !hasExistingChat && (
        <div className="mb-2 w-full bg-white/98 backdrop-blur-xl border border-stone-200 rounded-2xl shadow-2xl shadow-stone-400/25 p-4 text-slate-900 transition-all transform hover:scale-[1.01] border-t-2 border-t-emerald-600">
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                {vendorAvatar ? (
                  <img
                    src={vendorAvatar}
                    alt={vendorName}
                    className="w-9 h-9 rounded-full object-cover border border-stone-200 shadow-xs"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {vendorName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-white"></span>
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-800 flex items-center gap-1 leading-tight">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Atendimento Online em Tempo Real
                </p>
                <p className="text-[12px] text-slate-700 font-semibold truncate max-w-[170px]">
                  {vendorName}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="text-stone-400 hover:text-stone-700 p-1 rounded-full hover:bg-stone-100 transition-colors"
              title="Minimizar aviso"
              aria-label="Minimizar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed mb-3">
            {firstName ? (
              <>
                Olá, <strong>{firstName}</strong>! Sua proposta foi calculada em{' '}
                <span className="text-stone-900 font-extrabold">{formatCurrency(totalValue)}</span>.
                Gostaria de negociar bônus exclusivos e formas de pagamento diretamente conosco?
              </>
            ) : (
              <>
                Proposta calculada em{' '}
                <span className="text-stone-900 font-extrabold">{formatCurrency(totalValue)}</span>.
                Converse ao vivo com {vendorName} para tirar dúvidas, ajustar pacotes e garantir benefícios!
              </>
            )}
          </p>

          <button
            type="button"
            onClick={onOpenChat}
            disabled={isStartingChat}
            className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 active:scale-98 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{isStartingChat ? 'Iniciando...' : 'Conversar & Negociar Online'}</span>
          </button>
        </div>
      )}

      {/* Botão Flutuante / Pill Principal Chique */}
      <button
        type="button"
        onClick={onOpenChat}
        disabled={isStartingChat}
        className={`group flex items-center gap-2.5 px-4 py-3 bg-white hover:bg-stone-50 text-slate-900 rounded-full shadow-xl shadow-stone-400/30 hover:scale-105 active:scale-95 transition-all border border-stone-200 cursor-pointer ${
          pulseInvite ? 'ring-4 ring-emerald-500/20' : ''
        }`}
        title="Abrir chat de negociação em tempo real"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>

        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />

        <div className="flex flex-col text-left leading-none">
          <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
            {hasExistingChat ? 'Negociação Aberta' : 'Negociar no Chat PriceU$'}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            {hasExistingChat ? 'Clique para continuar' : 'Resposta imediata'}
          </span>
        </div>

        {isDismissed && (
          <ChevronUp className="w-3.5 h-3.5 text-stone-400 group-hover:-translate-y-0.5 transition-transform" />
        )}
      </button>
    </div>
  );
}
