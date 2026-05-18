import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { X, CheckCircle2, DollarSign, Calendar, Tag, CreditCard, Trash2, Loader2, AlertCircle, FileSignature, Plus } from 'lucide-react';

interface PaymentMethodData {
  id?: string; nome?: string; entrada_tipo?: 'percentual' | 'fixo';
  entrada_valor?: number; max_parcelas?: number; acrescimo?: number;
}
interface Installment { numero: number; valor: number; data: string; status: 'pago' | 'pendente'; }
interface AgendaDate { id: string; data: string; tipo_evento: string; }

interface ConvertLeadModalProps {
  userId: string; leadId: string; leadName: string; templateName: string;
  valorTotal: number; dataEvento?: string | null; paymentMethodData?: PaymentMethodData | null;
  fromContract?: boolean; onClose: () => void; onSuccess: () => void;
}

type PaymentMode = 'avista' | 'parcelado' | 'entrada_parcelas';

function addMonths(d: string, n: number) {
  const dt = new Date(d + 'T12:00:00'); dt.setMonth(dt.getMonth() + n);
  return dt.toISOString().split('T')[0];
}

function detectMode(pm: PaymentMethodData | null | undefined, valorTotal: number): { mode: PaymentMode; entradaVal: number } {
  if (!pm) return { mode: 'avista', entradaVal: 0 };
  const ev = pm.entrada_valor ?? 0; const mp = pm.max_parcelas ?? 1;
  if (ev > 0) { const entradaVal = pm.entrada_tipo === 'percentual' ? (valorTotal * ev) / 100 : ev; return { mode: 'entrada_parcelas', entradaVal }; }
  if (mp > 1) return { mode: 'parcelado', entradaVal: 0 };
  return { mode: 'avista', entradaVal: 0 };
}

function uid() { return Math.random().toString(36).slice(2, 9); }

export function ConvertLeadModal({ userId, leadId, leadName, templateName, valorTotal, dataEvento, paymentMethodData, fromContract, onClose, onSuccess }: ConvertLeadModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const eventoDate = dataEvento?.split('T')[0] ?? '';
  const detected = useMemo(() => detectMode(paymentMethodData, valorTotal), [paymentMethodData, valorTotal]);

  // --- Financeiro ---
  const [mode, setMode] = useState<PaymentMode>(detected.mode);
  const [valorOverride, setValorOverride] = useState(valorTotal);
  const [categoria, setCategoria] = useState('');
  const [formaPagamento, setFormaPagamento] = useState(paymentMethodData?.nome ?? 'pix');
  const [observacoes, setObservacoes] = useState('');
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [entradaValor, setEntradaValor] = useState(detected.entradaVal);
  const [entradaData, setEntradaData] = useState(today);
  const [entradaStatus, setEntradaStatus] = useState<'pago' | 'pendente'>('pendente');
  const [numParcelas, setNumParcelas] = useState(Math.max(1, paymentMethodData?.max_parcelas ?? 1));
  const [dataInicial, setDataInicial] = useState(eventoDate || today);
  const [parcelas, setParcelas] = useState<Installment[]>([]);
  const [salvarFinanceiro, setSalvarFinanceiro] = useState(true);

  // --- Agenda (múltiplas datas) ---
  const [agendaDates, setAgendaDates] = useState<AgendaDate[]>(
    eventoDate ? [{ id: uid(), data: eventoDate, tipo_evento: templateName || 'Evento' }] : []
  );

  const valorRestante = mode === 'entrada_parcelas' ? valorOverride - entradaValor : valorOverride;

  const buildParcelas = (n: number, valRest: number, startDate: string): Installment[] => {
    const valParc = parseFloat((valRest / n).toFixed(2));
    return Array.from({ length: n }, (_, i) => ({
      numero: i + 1,
      valor: i === n - 1 ? parseFloat((valRest - valParc * (n - 1)).toFixed(2)) : valParc,
      data: addMonths(startDate, i), status: 'pendente' as const,
    }));
  };

  useEffect(() => { setParcelas(buildParcelas(numParcelas, valorRestante, dataInicial)); }, [numParcelas, dataInicial, valorOverride, entradaValor, mode]);
  useEffect(() => {
    supabase.from('company_categories').select('id, nome').eq('user_id', userId).eq('tipo', 'receita').order('nome')
      .then(({ data }) => { if (data) setCategorias(data); });
  }, [userId]);

  const totalParcelas = parcelas.reduce((s, p) => s + p.valor, 0);
  const totalGeral = mode === 'entrada_parcelas' ? entradaValor + totalParcelas : mode === 'parcelado' ? totalParcelas : valorOverride;
  const diff = Math.abs(totalGeral - valorOverride);
  const hasDiff = diff > 0.05;

  const updateParcela = (i: number, field: keyof Installment, val: any) => setParcelas(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  const removeParcela = (i: number) => { setParcelas(prev => prev.filter((_, idx) => idx !== i).map((p, idx) => ({ ...p, numero: idx + 1 }))); setNumParcelas(p => Math.max(1, p - 1)); };

  const addAgendaDate = () => setAgendaDates(prev => [...prev, { id: uid(), data: '', tipo_evento: templateName || 'Evento' }]);
  const removeAgendaDate = (id: string) => setAgendaDates(prev => prev.filter(d => d.id !== id));
  const updateAgendaDate = (id: string, field: keyof AgendaDate, val: string) => setAgendaDates(prev => prev.map(d => d.id === id ? { ...d, [field]: val } : d));

  const handleSave = async () => {
    const temFinanceiro = salvarFinanceiro && valorOverride > 0;
    const datasValidas = agendaDates.filter(d => d.data.trim() !== '');
    setSaving(true); setError('');
    const desc = `Contratação: ${leadName} - ${templateName}`;
    try {
      // 1. Salvar financeiro
      if (temFinanceiro) {
        const rows: any[] = [];
        if (mode === 'avista') {
          rows.push({ user_id: userId, tipo: 'receita', origem: 'lead', descricao: desc, valor: valorOverride, data: dataInicial, status: 'pendente', forma_pagamento: formaPagamento, categoria_id: categoria || null, observacoes: observacoes || null, lead_id: leadId, is_installment: false });
        } else if (mode === 'parcelado') {
          parcelas.forEach(p => rows.push({ user_id: userId, tipo: 'receita', origem: 'lead', descricao: `${desc} (${p.numero}/${parcelas.length})`, valor: p.valor, data: p.data, status: p.status, forma_pagamento: formaPagamento, categoria_id: categoria || null, observacoes: observacoes || null, lead_id: leadId, is_installment: true, installment_number: p.numero, total_installments: parcelas.length }));
        } else {
          rows.push({ user_id: userId, tipo: 'receita', origem: 'lead', descricao: `Entrada: ${desc}`, valor: entradaValor, data: entradaData, status: entradaStatus, forma_pagamento: formaPagamento, categoria_id: categoria || null, observacoes: observacoes || null, lead_id: leadId, is_installment: false });
          parcelas.forEach(p => rows.push({ user_id: userId, tipo: 'receita', origem: 'lead', descricao: `${desc} (${p.numero}/${parcelas.length})`, valor: p.valor, data: p.data, status: p.status, forma_pagamento: formaPagamento, categoria_id: categoria || null, observacoes: observacoes || null, lead_id: leadId, is_installment: true, installment_number: p.numero, total_installments: parcelas.length }));
        }
        const { data: inserted, error: err } = await supabase.from('company_transactions').insert(rows).select('id');
        if (err) throw err;
        if (inserted && inserted.length > 1) {
          const parentId = inserted[0].id;
          await supabase.from('company_transactions').update({ parent_transaction_id: parentId }).in('id', inserted.map((t: any) => t.id));
        }
        const planoJson = { modo: mode, forma_pagamento_nome: formaPagamento, valor_total: valorOverride, ...(mode === 'entrada_parcelas' ? { entrada: { valor: entradaValor, data: entradaData, status: entradaStatus } } : {}), parcelas: mode !== 'avista' ? parcelas : [] };
        const { data: leadCurrent } = await supabase.from('leads').select('orcamento_detalhe').eq('id', leadId).single();
        await supabase.from('leads').update({ orcamento_detalhe: { ...(leadCurrent?.orcamento_detalhe ?? {}), plano_pagamento: planoJson } }).eq('id', leadId);
      }

      // 2. Inserir datas na agenda
      for (const d of datasValidas) {
        try {
          const { data: leadData } = await supabase.from('leads').select('cidade_evento').eq('id', leadId).single();
          await supabase.from('eventos_agenda').insert({
            user_id: userId, data_evento: d.data, tipo_evento: d.tipo_evento || templateName || 'Evento',
            cliente_nome: leadName || 'Cliente', cidade: leadData?.cidade_evento || '',
            status: 'confirmado', origem: 'lead_convertido',
            observacoes: 'Gerado via conversão de lead',
          });
        } catch (agErr) { console.error('Erro ao inserir data na agenda:', agErr); }
      }

      onSuccess(); onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao salvar. Tente novamente.');
    } finally { setSaving(false); }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#07101f] dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 text-sm';
  const labelCls = 'block text-xs font-semibold text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase tracking-wider mb-1.5';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0a1628] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border dark:border-[rgba(255,255,255,0.06)]">

        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between shrink-0 ${fromContract ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-gradient-to-r from-green-600 to-emerald-600'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              {fromContract ? <FileSignature className="w-5 h-5 text-white" /> : <CheckCircle2 className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{fromContract ? 'Contrato enviado! 🎉' : 'Painel Financeiro & Agenda 🎉'}</h2>
              <p className={`text-xs mt-0.5 ${fromContract ? 'text-purple-100' : 'text-green-100'}`}>
                Configure pagamentos e datas do evento para <strong>{leadName}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* ── SEÇÃO AGENDA ── */}
          <div className="bg-blue-50 dark:bg-[rgba(59,130,246,0.07)] rounded-xl p-4 border border-blue-200 dark:border-[rgba(59,130,246,0.2)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-blue-900 dark:text-blue-300 text-sm">Datas do Evento / Agenda</h3>
              </div>
              <button onClick={addAgendaDate} className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 bg-white dark:bg-[rgba(59,130,246,0.1)] px-3 py-1.5 rounded-lg border border-blue-300 dark:border-[rgba(59,130,246,0.3)] transition-colors">
                <Plus className="w-3.5 h-3.5" /> Adicionar data
              </button>
            </div>
            {agendaDates.length === 0 ? (
              <p className="text-xs text-blue-600/70 dark:text-blue-400/60 text-center py-2">Nenhuma data adicionada. O evento não será inserido na agenda.</p>
            ) : (
              <div className="space-y-2">
                {agendaDates.map((d, i) => (
                  <div key={d.id} className="flex items-center gap-2 bg-white dark:bg-[rgba(255,255,255,0.04)] rounded-lg p-2 border border-blue-200 dark:border-[rgba(59,130,246,0.15)]">
                    <span className="text-xs font-bold text-blue-500 w-5 text-center shrink-0">{i + 1}</span>
                    <input type="date" value={d.data} onChange={e => updateAgendaDate(d.id, 'data', e.target.value)}
                      className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#07101f] dark:text-white rounded-md text-sm focus:ring-2 focus:ring-blue-500" />
                    <input type="text" value={d.tipo_evento} onChange={e => updateAgendaDate(d.id, 'tipo_evento', e.target.value)}
                      placeholder="Tipo (ex: Casamento)" className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#07101f] dark:text-white rounded-md text-sm focus:ring-2 focus:ring-blue-500" />
                    <button onClick={() => removeAgendaDate(d.id)} className="shrink-0 text-gray-400 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-blue-500/70 dark:text-blue-400/50 mt-2">
              {agendaDates.filter(d => d.data).length} data(s) serão inseridas na agenda ao confirmar.
            </p>
          </div>

          {/* ── SEÇÃO FINANCEIRO ── */}
          <div className="flex items-center gap-3">
            <button onClick={() => setSalvarFinanceiro(!salvarFinanceiro)}
              className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${salvarFinanceiro ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${salvarFinanceiro ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
            <div>
              <span className="text-sm font-semibold text-gray-800 dark:text-white">Registrar entrada financeira</span>
              <p className="text-xs text-gray-500 dark:text-[rgba(255,255,255,0.4)]">Desative para salvar apenas a(s) data(s) na agenda</p>
            </div>
          </div>

          {salvarFinanceiro && (
            <>
              {/* Modo de pagamento */}
              <div>
                <label className={labelCls}><CreditCard className="inline w-3.5 h-3.5 mr-1" />Modalidade</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['avista', 'parcelado', 'entrada_parcelas'] as PaymentMode[]).map(m => (
                    <button key={m} onClick={() => setMode(m)}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${mode === m ? 'bg-green-600 text-white border-green-600' : 'bg-white dark:bg-[rgba(255,255,255,0.03)] border-gray-300 dark:border-[rgba(255,255,255,0.1)] text-gray-600 dark:text-[rgba(255,255,255,0.6)] hover:border-green-400'}`}>
                      {m === 'avista' ? 'À Vista' : m === 'parcelado' ? 'Parcelado' : 'Entrada + Parcelas'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}><DollarSign className="inline w-3.5 h-3.5 mr-1" />Valor Total</label>
                  <input type="text" value={new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(valorOverride)}
                    onChange={e => setValorOverride(Number(e.target.value.replace(/\D/g, '')) / 100)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}><Calendar className="inline w-3.5 h-3.5 mr-1" />Data 1ª Parcela / Vencimento</label>
                  <input type="date" value={dataInicial} onChange={e => setDataInicial(e.target.value)} className={inputCls} />
                </div>
              </div>

              {mode === 'entrada_parcelas' && (
                <div className="grid grid-cols-3 gap-3 p-3 bg-amber-50 dark:bg-[rgba(245,158,11,0.07)] rounded-xl border border-amber-200 dark:border-[rgba(245,158,11,0.2)]">
                  <div>
                    <label className={labelCls}>Valor Entrada</label>
                    <input type="text" value={new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(entradaValor)}
                      onChange={e => setEntradaValor(Number(e.target.value.replace(/\D/g, '')) / 100)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Data Entrada</label>
                    <input type="date" value={entradaData} onChange={e => setEntradaData(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Status Entrada</label>
                    <select value={entradaStatus} onChange={e => setEntradaStatus(e.target.value as any)} className={inputCls}>
                      <option value="pendente">Pendente</option>
                      <option value="pago">Pago</option>
                    </select>
                  </div>
                </div>
              )}

              {(mode === 'parcelado' || mode === 'entrada_parcelas') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls}>Parcelas</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setNumParcelas(p => Math.max(1, p - 1))} className="w-7 h-7 rounded-full bg-gray-200 dark:bg-[rgba(255,255,255,0.1)] text-sm font-bold">-</button>
                      <span className="text-sm font-bold dark:text-white">{numParcelas}x</span>
                      <button onClick={() => setNumParcelas(p => Math.min(24, p + 1))} className="w-7 h-7 rounded-full bg-gray-200 dark:bg-[rgba(255,255,255,0.1)] text-sm font-bold">+</button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {parcelas.map((p, i) => (
                      <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
                        <span className="text-xs font-bold text-gray-400 w-6 text-right">{p.numero}x</span>
                        <input type="text" value={new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(p.valor)}
                          onChange={e => updateParcela(i, 'valor', Number(e.target.value.replace(/\D/g, '')) / 100)} className={inputCls} />
                        <input type="date" value={p.data} onChange={e => updateParcela(i, 'data', e.target.value)} className={inputCls} />
                        <button onClick={() => removeParcela(i)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                  {hasDiff && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Diferença de {formatCurrency(diff)} em relação ao valor total
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}><Tag className="inline w-3.5 h-3.5 mr-1" />Categoria</label>
                  <select value={categoria} onChange={e => setCategoria(e.target.value)} className={inputCls}>
                    <option value="">Sem categoria</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Forma de Pagamento</label>
                  <input type="text" value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} className={inputCls} placeholder="PIX, transferência..." />
                </div>
              </div>

              <div>
                <label className={labelCls}>Observações</label>
                <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} className={inputCls} placeholder="Notas adicionais..." />
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-[rgba(239,68,68,0.1)] rounded-xl border border-red-200 dark:border-[rgba(239,68,68,0.2)]">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-[rgba(255,255,255,0.05)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] shrink-0 flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500 dark:text-[rgba(255,255,255,0.4)]">
            {agendaDates.filter(d => d.data).length} data(s) na agenda
            {salvarFinanceiro && ` • ${formatCurrency(valorOverride)} financeiro`}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.7)] bg-white dark:bg-[rgba(255,255,255,0.05)] border border-gray-300 dark:border-[rgba(255,255,255,0.1)] rounded-xl hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className={`flex items-center gap-2 px-6 py-2 text-sm font-bold text-white rounded-xl transition-all ${fromContract ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'} disabled:opacity-50`}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><CheckCircle2 className="w-4 h-4" /> Confirmar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
