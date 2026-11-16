import React, { useState } from 'react';
import {
  Calendar,
  DollarSign,
  TrendingDown,
  X,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  CreditCard,
  ChevronRight
} from 'lucide-react';
import { BrideProfile } from '../../services/brideMarketplaceService';
import { VendorQuoteSummary } from './BrideInvestmentSummary';

interface BrideCashFlowSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  brideProfile: BrideProfile;
  selectedQuotes: VendorQuoteSummary[];
}

export function BrideCashFlowSimulatorModal({
  isOpen,
  onClose,
  brideProfile,
  selectedQuotes,
}: BrideCashFlowSimulatorModalProps) {
  if (!isOpen) return null;

  const totalCommitted = selectedQuotes.reduce((acc, q) => acc + q.total, 0);

  // Calcula meses até o casamento (padrão 12 se não definido ou passado)
  const calculateMonthsUntilWedding = () => {
    if (!brideProfile.data_casamento) return 12;
    const today = new Date();
    const wedding = new Date(brideProfile.data_casamento);
    const diffMonths = (wedding.getFullYear() - today.getFullYear()) * 12 + (wedding.getMonth() - today.getMonth());
    return Math.max(3, Math.min(24, diffMonths || 12));
  };

  const monthsUntilWedding = calculateMonthsUntilWedding();
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(30); // 30% de entrada

  const downPaymentTotal = Math.round((totalCommitted * downPaymentPercent) / 100);
  const remainingTotal = totalCommitted - downPaymentTotal;
  const installmentMonths = Math.max(1, monthsUntilWedding - 1);
  const monthlyInstallment = Math.round(remainingTotal / installmentMonths);

  // Gera meses do cronograma
  const scheduleMonths = Array.from({ length: monthsUntilWedding }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    const monthName = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    const isFirstMonth = i === 0;
    const isLastMonth = i === monthsUntilWedding - 1;

    let monthCost = monthlyInstallment;
    if (isFirstMonth) monthCost = downPaymentTotal;
    if (isLastMonth) monthCost = monthlyInstallment;

    return {
      index: i + 1,
      name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      amount: monthCost,
      isFirstMonth,
      isLastMonth,
    };
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[70] flex items-center justify-center p-4">
      <div className="bg-white border border-stone-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header do Modal */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center font-bold">
              <Calendar size={22} className="text-rose-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Simulador de Fluxo de Caixa Global</h3>
              <p className="text-xs text-stone-500">
                Cronograma de parcelamento unificado para todos os fornecedores
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-slate-800 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Card Destaque: Desembolso Mensal Previsto */}
        <div className="rounded-3xl bg-slate-900 text-white p-6 space-y-4 shadow-lg shadow-slate-900/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} /> Desembolso Mensal Planejado
              </span>
              <div className="text-3xl sm:text-4xl font-black text-white mt-1">
                R$ {monthlyInstallment.toLocaleString('pt-BR')} <span className="text-sm font-normal text-stone-400">/ mês</span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Em {installmentMonths} parcelas fixas até o casamento sem comprometer sua renda
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/10 border border-white/10 text-right sm:text-right">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Total Consolidado</span>
              <p className="text-xl font-bold text-white mt-0.5">
                R$ {totalCommitted.toLocaleString('pt-BR')}
              </p>
              <p className="text-[11px] text-emerald-400 font-medium">
                {selectedQuotes.length} fornecedores selecionados
              </p>
            </div>
          </div>

          {/* Ajuste de Entrada */}
          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-stone-300 font-medium">Percentual de Entrada Inicial:</span>
            <div className="flex items-center gap-2">
              {[20, 30, 40].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setDownPaymentPercent(pct)}
                  className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                    downPaymentPercent === pct
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white/10 text-stone-300 hover:bg-white/20'
                  }`}
                >
                  {pct}% (R$ {Math.round((totalCommitted * pct) / 100).toLocaleString('pt-BR')})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Linha do Tempo de Pagamento Mês a Mês */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} className="text-rose-600" />
              Cronograma Mensal até o Casamento ({monthsUntilWedding} meses)
            </h4>
            <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Zero Juros PriceU$
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1">
            {scheduleMonths.map((m) => (
              <div
                key={m.index}
                className={`p-3 rounded-2xl border text-xs flex flex-col justify-between transition-all ${
                  m.isFirstMonth
                    ? 'bg-rose-50/60 border-rose-300 shadow-2xs'
                    : m.isLastMonth
                    ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                    : 'bg-stone-50 border-stone-200'
                }`}
              >
                <div className="flex items-center justify-between text-stone-400 text-[10px]">
                  <span>Mês {m.index}</span>
                  <span className="font-semibold text-slate-700">{m.name}</span>
                </div>

                <div className="mt-2">
                  <p className="font-black text-slate-900 text-sm">
                    R$ {m.amount.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-[10px] text-stone-500 mt-0.5">
                    {m.isFirstMonth ? 'Entrada (Sinal)' : m.isLastMonth ? 'Quitação Final' : 'Parcela Unificada'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detalhamento dos Profissionais Inclusos */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
          <p className="font-bold text-slate-800">Serviços Consolidados nesta Simulação:</p>
          <div className="space-y-1.5">
            {selectedQuotes.map((q) => (
              <div key={q.vendorId} className="flex items-center justify-between text-stone-600">
                <span className="truncate max-w-[240px] font-medium">• {q.vendorName} ({q.packageName})</span>
                <span className="font-bold text-slate-900">R$ {q.total.toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600" />
            Contratos protegidos e boletos gerados sem juros abusivos.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-md shadow-slate-900/10"
          >
            Entendido, Voltar ao Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
