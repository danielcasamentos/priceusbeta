import React, { useState } from 'react';
import { DollarSign, ChevronUp, ChevronDown, CheckCircle2, Mail, FileText, Sparkles } from 'lucide-react';

export interface VendorQuoteSummary {
  vendorId: string;
  vendorName: string;
  category: string;
  packageName: string;
  total: number;
}

interface BrideInvestmentSummaryProps {
  plannedBudget: number;
  selectedQuotes: VendorQuoteSummary[];
  onOpenContractList: () => void;
  onSendEmailSummary: () => void;
  onOpenCashFlowSimulator?: () => void;
}

export function BrideInvestmentSummary({
  plannedBudget,
  selectedQuotes,
  onOpenContractList,
  onSendEmailSummary,
  onOpenCashFlowSimulator,
}: BrideInvestmentSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalCommitted = selectedQuotes.reduce((acc, q) => acc + q.total, 0);
  const percentageUsed = plannedBudget > 0 ? Math.min(100, Math.round((totalCommitted / plannedBudget) * 100)) : 0;
  const remainingBudget = Math.max(0, plannedBudget - totalCommitted);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-stone-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom,0px)] transition-all">
      {/* Popover Expandido com Detalhamento dos Serviços Clean */}
      {isExpanded && (
        <div className="max-w-7xl mx-auto px-4 py-4 border-b border-stone-200/70 bg-stone-50/95 animate-in slide-in-from-bottom-2 duration-200 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={13} className="text-rose-600" />
              Detalhamento de Investimento por Categoria
            </h4>
            <span className="text-xs text-stone-500">
              Saldo restante: <strong className="text-emerald-700 font-bold">R$ {remainingBudget.toLocaleString('pt-BR')}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {selectedQuotes.map((q) => (
              <div
                key={q.vendorId}
                className="p-3.5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900 truncate max-w-[130px]">{q.vendorName}</p>
                  <p className="text-[10px] text-stone-500 capitalize">{q.category} • {q.packageName}</p>
                </div>
                <span className="font-black text-slate-900 whitespace-nowrap">
                  R$ {q.total.toLocaleString('pt-BR')}
                </span>
              </div>
            ))}

            {selectedQuotes.length === 0 && (
              <p className="text-xs text-stone-500 col-span-full py-2">
                Nenhuma proposta selecionada ainda. Navegue nas abas acima para montar seu casamento.
              </p>
            )}
          </div>

          {/* Ações Rápidas no Painel Expandido para Mobile */}
          <div className="mt-4 pt-3 border-t border-stone-200/60 flex flex-wrap gap-2 md:hidden">
            {onOpenCashFlowSimulator && (
              <button
                type="button"
                onClick={onOpenCashFlowSimulator}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>📊</span>
                <span>Simular Parcelas</span>
              </button>
            )}
            <button
              type="button"
              onClick={onSendEmailSummary}
              className="flex-1 py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Mail size={13} className="text-stone-500" />
              <span>Enviar por E-mail</span>
            </button>
          </div>
        </div>
      )}

      {/* Barra Principal Fixa no Rodapé Clean & Sofisticada */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3.5">
        {/* Visual Mobile Compacto (< md) */}
        <div className="flex md:hidden items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-left cursor-pointer flex-1 min-w-0"
          >
            <div className="p-1 rounded-lg bg-stone-100 text-stone-600 flex-shrink-0">
              {isExpanded ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-stone-400 block truncate">Total Selecionado:</span>
              <span className="text-sm font-black text-slate-900 block truncate">
                R$ {totalCommitted.toLocaleString('pt-BR')}
              </span>
            </div>
          </button>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={onOpenContractList}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md shadow-slate-900/10 cursor-pointer flex items-center gap-1.5"
            >
              <FileText size={13} />
              <span>Contratos ({selectedQuotes.length})</span>
            </button>
          </div>
        </div>

        {/* Visual Desktop (md+) */}
        <div className="hidden md:flex items-center justify-between gap-3">
          {/* Esquerda: Totalizador e Barra de Progresso do Orçamento da Noiva */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <span>{isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</span>
              <span className="font-semibold">Resumo do Casamento</span>
            </button>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-stone-500">Investimento Total Selecionado:</span>
                <span className="text-base sm:text-xl font-black text-slate-900">
                  R$ {totalCommitted.toLocaleString('pt-BR')}
                </span>
                <span className="text-xs text-stone-400">
                  de R$ {plannedBudget.toLocaleString('pt-BR')} planejado
                </span>
              </div>

              {/* Barra de Progresso com Cores Suaves */}
              <div className="w-64 h-1.5 bg-stone-100 rounded-full overflow-hidden mt-1.5 border border-stone-200/50">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    percentageUsed > 90
                      ? 'bg-rose-600'
                      : percentageUsed > 70
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                  }`}
                  style={{ width: `${percentageUsed}%` }}
                />
              </div>
            </div>
          </div>

          {/* Direita: Ações Rápidas */}
          <div className="flex items-center gap-2.5">
            {onOpenCashFlowSimulator && (
              <button
                type="button"
                onClick={onOpenCashFlowSimulator}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <span>📊</span>
                <span>Simular Parcelas Globais</span>
              </button>
            )}

            <button
              type="button"
              onClick={onSendEmailSummary}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200/80 text-stone-700 border border-stone-200 text-xs font-semibold transition-all cursor-pointer"
            >
              <Mail size={14} className="text-stone-500" />
              <span>Enviar Orçamentos por E-mail</span>
            </button>

            <button
              type="button"
              onClick={onOpenContractList}
              className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md shadow-slate-900/10 cursor-pointer"
            >
              <FileText size={14} />
              <span>Meus Contratos ({selectedQuotes.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
