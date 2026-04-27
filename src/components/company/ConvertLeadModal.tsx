import React, { useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import {
  X, CheckCircle2, DollarSign, Calendar, Tag, CreditCard,
  Plus, Minus, ChevronRight, Loader2, AlertCircle, Layers
} from 'lucide-react';

// Categorias serão carregadas do banco de dados (por usuário)

// ─────────────────────────────────────────────────────────────────────────────

interface ConvertLeadModalProps {
  userId: string;
  leadId: string;
  leadName: string;
  templateName: string;
  valorTotal: number;
  dataEvento?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface InstallmentPreview {
  numero: number;
  data: string;
  valor: number;
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function formatDateBR(dateStr: string): string {
  const [y, m, day] = dateStr.split('-');
  return `${day}/${m}/${y}`;
}

export function ConvertLeadModal({
  userId,
  leadId,
  leadName,
  templateName,
  valorTotal,
  dataEvento,
  onClose,
  onSuccess,
}: ConvertLeadModalProps) {
  // ── Estado do formulário ────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];

  const [numParcelas, setNumParcelas]     = useState(1);
  const [dataInicial, setDataInicial]     = useState(dataEvento?.split('T')[0] ?? today);
  const [valorOverride, setValorOverride] = useState(valorTotal);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');
  
  const [categoria, setCategoria]         = useState<string>('');
  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [status, setStatus]               = useState<'pendente' | 'pago'>('pendente');
  const [observacoes, setObservacoes]     = useState('');
  
  // Categorias reais do usuário
  const [categorias, setCategorias] = useState<{ id: string, nome: string }[]>([]);

  // Carrega as categorias do usuário
  React.useEffect(() => {
    const fetchCategorias = async () => {
      const { data } = await supabase
        .from('company_categories')
        .select('id, nome')
        .eq('user_id', userId)
        .order('nome');
      if (data) setCategorias(data);
    };
    fetchCategorias();
  }, [userId]);

  // ── Preview das parcelas ────────────────────────────────────────────
  const installments: InstallmentPreview[] = useMemo(() => {
    const valorParcela = valorOverride / numParcelas;
    return Array.from({ length: numParcelas }, (_, i) => ({
      numero: i + 1,
      data: addMonths(dataInicial, i),
      valor: valorParcela,
    }));
  }, [numParcelas, dataInicial, valorOverride]);

  // ── Handlers ───────────────────────────────────────────────────────
  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setValorOverride(Number(raw) / 100);
  };

  const formatValorInput = (v: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(v);

  const handleSave = async () => {
    if (valorOverride <= 0) {
      setError('O valor total deve ser maior que zero.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const baseDescricao = `Contratação: ${leadName} - ${templateName}`;
      const valorParcela  = parseFloat((valorOverride / numParcelas).toFixed(2));

      if (numParcelas === 1) {
        // ── Entrada única ───────────────────────────────────────────
        const { error: err } = await supabase.from('company_transactions').insert({
          user_id:        userId,
          tipo:           'receita',
          origem:         'lead',
          descricao:      baseDescricao,
          valor:          valorOverride,
          data:           dataInicial,
          status,
          forma_pagamento: formaPagamento,
          categoria_id:   categoria || null,
          observacoes:    observacoes || null,
          lead_id:        leadId,
          is_installment: false,
        });
        if (err) throw err;
      } else {
        // ── Parcelas ─────────────────────────────────────────────────
        const rows = installments.map((inst) => ({
          user_id:             userId,
          tipo:                'receita' as const,
          origem:              'lead' as const,
          descricao:           `${baseDescricao} (${inst.numero}/${numParcelas})`,
          valor:               valorParcela,
          data:                inst.data,
          status,
          forma_pagamento:     formaPagamento,
          categoria_id:        categoria || null,
          observacoes:         observacoes || null,
          lead_id:             leadId,
          is_installment:      true,
          installment_number:  inst.numero,
          total_installments:  numParcelas,
        }));

        const { data: inserted, error: err } = await supabase
          .from('company_transactions')
          .insert(rows)
          .select('id');

        if (err) throw err;

        // Aponta todas as parcelas para a primeira como parent
        if (inserted && inserted.length > 0) {
          const parentId = inserted[0].id;
          await supabase
            .from('company_transactions')
            .update({ parent_transaction_id: parentId })
            .in('id', inserted.map((t: { id: string }) => t.id));
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[ConvertLeadModal] erro:', err);
      setError(err?.message ?? 'Erro ao criar entradas. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0a1628] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border dark:border-[rgba(255,255,255,0.06)]">

        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Lead Convertido! 🎉</h2>
              <p className="text-green-100 text-sm mt-0.5">
                Criar entradas financeiras para <strong>{leadName}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Valor Total */}
          <div className="bg-gray-50 dark:bg-[rgba(255,255,255,0.03)] rounded-xl p-4 border border-gray-200 dark:border-[rgba(255,255,255,0.06)]">
            <label className="block text-xs font-semibold text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase tracking-wider mb-2">
              <DollarSign className="inline w-3.5 h-3.5 mr-1" />
              Valor Total do Serviço
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">R$</span>
              <input
                type="text"
                value={formatValorInput(valorOverride)}
                onChange={handleValorChange}
                className="w-full pl-10 pr-4 py-3 text-xl font-bold text-gray-900 dark:text-white border border-gray-300 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#07101f] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          {/* Parcelas */}
          <div className="bg-gray-50 dark:bg-[rgba(255,255,255,0.03)] rounded-xl p-4 border border-gray-200 dark:border-[rgba(255,255,255,0.06)]">
            <label className="block text-xs font-semibold text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase tracking-wider mb-3">
              <Layers className="inline w-3.5 h-3.5 mr-1" />
              Número de Parcelas
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setNumParcelas(p => Math.max(1, p - 1))}
                className="p-2 rounded-lg border border-gray-300 dark:border-[rgba(255,255,255,0.1)] hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.07)] dark:text-white transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="flex-1 text-center">
                <span className="text-3xl font-black text-gray-900 dark:text-white">{numParcelas}</span>
                <span className="text-gray-500 dark:text-[rgba(255,255,255,0.5)] ml-2 text-sm">
                  {numParcelas === 1 ? 'pagamento único' : `parcela${numParcelas > 1 ? 's' : ''} de ${formatCurrency(valorOverride / numParcelas)}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setNumParcelas(p => Math.min(48, p + 1))}
                className="p-2 rounded-lg border border-gray-300 dark:border-[rgba(255,255,255,0.1)] hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.07)] dark:text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {/* Atalhos rápidos */}
            <div className="flex gap-2 mt-3 flex-wrap">
              {[1, 2, 3, 6, 10, 12].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNumParcelas(n)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    numParcelas === n
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 dark:bg-[rgba(255,255,255,0.08)] text-gray-600 dark:text-[rgba(255,255,255,0.6)] hover:bg-gray-300 dark:hover:bg-[rgba(255,255,255,0.12)]'
                  }`}
                >
                  {n === 1 ? 'À vista' : `${n}x`}
                </button>
              ))}
            </div>
          </div>

          {/* Data + Categoria + Forma de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Data da primeira parcela */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase tracking-wider mb-2">
                <Calendar className="inline w-3.5 h-3.5 mr-1" />
                Data da {numParcelas > 1 ? '1ª Parcela' : 'Entrada'}
              </label>
              <input
                type="date"
                value={dataInicial}
                onChange={e => setDataInicial(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#07101f] dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase tracking-wider mb-2">
                <Tag className="inline w-3.5 h-3.5 mr-1" />
                Categoria
              </label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#07101f] dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 text-sm appearance-none"
              >
                <option value="">Sem categoria</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            {/* Forma de Pagamento */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase tracking-wider mb-2">
                <CreditCard className="inline w-3.5 h-3.5 mr-1" />
                Forma de Pagamento
              </label>
              <select
                value={formaPagamento}
                onChange={e => setFormaPagamento(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#07101f] dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 text-sm appearance-none"
              >
                <option value="pix">PIX</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao_credito">Cartão de Crédito</option>
                <option value="cartao_debito">Cartão de Débito</option>
                <option value="transferencia">Transferência Bancária</option>
                <option value="boleto">Boleto</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            {/* Status inicial */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase tracking-wider mb-2">
                <CheckCircle2 className="inline w-3.5 h-3.5 mr-1" />
                Status Inicial
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as 'pendente' | 'pago')}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#07101f] dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 text-sm appearance-none"
              >
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </select>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase tracking-wider mb-2">
              Observações (opcional)
            </label>
            <textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              rows={2}
              placeholder="Ex: 50% na contratação, 50% no dia do evento..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#07101f] dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 text-sm resize-none"
            />
          </div>

          {/* Preview das parcelas */}
          {numParcelas > 1 && (
            <div className="bg-green-50 dark:bg-[rgba(34,197,94,0.07)] rounded-xl border border-green-200 dark:border-[rgba(34,197,94,0.2)] overflow-hidden">
              <div className="px-4 py-3 bg-green-100 dark:bg-[rgba(34,197,94,0.12)] border-b border-green-200 dark:border-[rgba(34,197,94,0.15)]">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                  Preview — {numParcelas} parcelas geradas
                </p>
              </div>
              <div className="divide-y divide-green-200 dark:divide-[rgba(34,197,94,0.12)] max-h-48 overflow-y-auto">
                {installments.map(inst => (
                  <div key={inst.numero} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-green-700 dark:text-green-400 bg-green-200 dark:bg-[rgba(34,197,94,0.2)] px-2 py-0.5 rounded-full">
                        {inst.numero}/{numParcelas}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-sm text-green-800 dark:text-green-300">{formatDateBR(inst.data)}</span>
                    </div>
                    <span className="text-sm font-bold text-green-700 dark:text-green-400">
                      {formatCurrency(inst.valor)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-[rgba(239,68,68,0.1)] border border-red-200 dark:border-[rgba(239,68,68,0.2)] rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-[rgba(255,255,255,0.06)] px-6 py-4 flex justify-between items-center shrink-0 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 text-gray-600 dark:text-[rgba(255,255,255,0.7)] hover:text-gray-900 dark:hover:text-white font-medium hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.07)] rounded-lg transition-colors disabled:opacity-50"
          >
            Pular por agora
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Criar {numParcelas > 1 ? `${numParcelas} Entradas` : 'Entrada'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
