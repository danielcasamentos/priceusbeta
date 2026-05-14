import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { X, CheckCircle2, DollarSign, Calendar, Tag, CreditCard, Trash2, Loader2, AlertCircle, FileSignature } from 'lucide-react';

interface PaymentMethodData {
  id?: string;
  nome?: string;
  entrada_tipo?: 'percentual' | 'fixo';
  entrada_valor?: number;
  max_parcelas?: number;
  acrescimo?: number;
}

interface Installment {
  numero: number;
  valor: number;
  data: string;
  status: 'pago' | 'pendente';
}

interface ConvertLeadModalProps {
  userId: string;
  leadId: string;
  leadName: string;
  templateName: string;
  valorTotal: number;
  dataEvento?: string | null;
  paymentMethodData?: PaymentMethodData | null;
  fromContract?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentMode = 'avista' | 'parcelado' | 'entrada_parcelas';

function addMonths(d: string, n: number) {
  const dt = new Date(d + 'T12:00:00');
  dt.setMonth(dt.getMonth() + n);
  return dt.toISOString().split('T')[0];
}


function detectMode(pm: PaymentMethodData | null | undefined, valorTotal: number): { mode: PaymentMode; entradaVal: number } {
  if (!pm) return { mode: 'avista', entradaVal: 0 };
  const ev = pm.entrada_valor ?? 0;
  const mp = pm.max_parcelas ?? 1;
  if (ev > 0) {
    const entradaVal = pm.entrada_tipo === 'percentual' ? (valorTotal * ev) / 100 : ev;
    return { mode: 'entrada_parcelas', entradaVal };
  }
  if (mp > 1) return { mode: 'parcelado', entradaVal: 0 };
  return { mode: 'avista', entradaVal: 0 };
}

export function ConvertLeadModal({ userId, leadId, leadName, templateName, valorTotal, dataEvento, paymentMethodData, fromContract, onClose, onSuccess }: ConvertLeadModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const eventoDate = dataEvento?.split('T')[0] ?? today;

  const detected = useMemo(() => detectMode(paymentMethodData, valorTotal), [paymentMethodData, valorTotal]);

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
  const [dataInicial, setDataInicial] = useState(eventoDate);

  const [parcelas, setParcelas] = useState<Installment[]>([]);

  const valorRestante = mode === 'entrada_parcelas' ? valorOverride - entradaValor : valorOverride;

  const buildParcelas = (n: number, valRest: number, startDate: string): Installment[] => {
    const valParc = parseFloat((valRest / n).toFixed(2));
    return Array.from({ length: n }, (_, i) => ({
      numero: i + 1,
      valor: i === n - 1 ? parseFloat((valRest - valParc * (n - 1)).toFixed(2)) : valParc,
      data: addMonths(startDate, i),
      status: 'pendente' as const,
    }));
  };

  useEffect(() => {
    setParcelas(buildParcelas(numParcelas, valorRestante, dataInicial));
  }, [numParcelas, dataInicial, valorOverride, entradaValor, mode]);

  useEffect(() => {
    supabase.from('company_categories').select('id, nome').eq('user_id', userId).order('nome')
      .then(({ data }) => { if (data) setCategorias(data); });
  }, [userId]);

  const totalParcelas = parcelas.reduce((s, p) => s + p.valor, 0);
  const totalGeral = mode === 'entrada_parcelas' ? entradaValor + totalParcelas : mode === 'parcelado' ? totalParcelas : valorOverride;
  const diff = Math.abs(totalGeral - valorOverride);
  const hasDiff = diff > 0.05;

  const updateParcela = (i: number, field: keyof Installment, val: any) => {
    setParcelas(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  };


  const removeParcela = (i: number) => {
    setParcelas(prev => prev.filter((_, idx) => idx !== i).map((p, idx) => ({ ...p, numero: idx + 1 })));
    setNumParcelas(p => Math.max(1, p - 1));
  };

  const fmtInput = (v: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(v);

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValorOverride(Number(e.target.value.replace(/\D/g, '')) / 100);
  };

  const handleEntradaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEntradaValor(Number(e.target.value.replace(/\D/g, '')) / 100);
  };

  const handleParcelaValorChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    updateParcela(i, 'valor', Number(e.target.value.replace(/\D/g, '')) / 100);
  };

  const handleSave = async () => {
    if (valorOverride <= 0) { setError('Valor deve ser maior que zero.'); return; }
    setSaving(true); setError('');
    const desc = `Contratação: ${leadName} - ${templateName}`;

    try {
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

      const planoJson = {
        modo: mode,
        forma_pagamento_nome: formaPagamento,
        valor_total: valorOverride,
        ...(mode === 'entrada_parcelas' ? { entrada: { valor: entradaValor, data: entradaData, status: entradaStatus } } : {}),
        parcelas: mode !== 'avista' ? parcelas : [],
      };

      await supabase.from('leads').update({
        orcamento_detalhe: { ...(await getOrcamentoDetalhe()), plano_pagamento: planoJson }
      }).eq('id', leadId);

      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const getOrcamentoDetalhe = async () => {
    const { data } = await supabase.from('leads').select('orcamento_detalhe').eq('id', leadId).single();
    return data?.orcamento_detalhe ?? {};
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#07101f] dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 text-sm';
  const labelCls = 'block text-xs font-semibold text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase tracking-wider mb-1.5';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0a1628] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border dark:border-[rgba(255,255,255,0.06)]">

        <div className={`px-6 py-4 flex items-center justify-between shrink-0 ${fromContract ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-gradient-to-r from-green-600 to-emerald-600'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              {fromContract ? <FileSignature className="w-5 h-5 text-white" /> : <CheckCircle2 className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {fromContract ? 'Contrato enviado! 🎉' : 'Painel Financeiro 🎉'}
              </h2>
              <p className={`text-xs mt-0.5 ${fromContract ? 'text-purple-100' : 'text-green-100'}`}>
                {fromContract
                  ? <>Agora configure o <strong>plano de pagamento</strong> para <strong>{leadName}</strong></>
                  : <>Configure as entradas para <strong>{leadName}</strong></>
                }
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Banner explicativo quando vem do contrato */}
        {fromContract && (
          <div className="bg-purple-50 dark:bg-[rgba(139,92,246,0.08)] border-b border-purple-200 dark:border-[rgba(139,92,246,0.2)] px-5 py-3 flex items-start gap-2.5 shrink-0">
            <span className="text-lg">📋</span>
            <p className="text-xs text-purple-800 dark:text-purple-300 leading-relaxed">
              O contrato foi gerado e o lead marcado como <strong>Convertido</strong>.
              Configure abaixo como será feito o pagamento — entrada, parcelas e datas.
              Tudo será lançado automaticamente no seu <strong>Caixa</strong>.
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Valor Total */}
          <div className="bg-gray-50 dark:bg-[rgba(255,255,255,0.03)] rounded-xl p-4 border border-gray-200 dark:border-[rgba(255,255,255,0.06)]">
            <label className={labelCls}><DollarSign className="inline w-3.5 h-3.5 mr-1" />Valor Total do Serviço</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">R$</span>
              <input type="text" value={fmtInput(valorOverride)} onChange={handleValorChange} className="w-full pl-10 pr-4 py-2.5 text-lg font-bold text-gray-900 dark:text-white border border-gray-300 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#07101f] rounded-lg focus:ring-2 focus:ring-green-500" />
            </div>
          </div>

          {/* Modo */}
          <div>
            <label className={labelCls}>Modo de Pagamento</label>
            <div className="grid grid-cols-3 gap-2">
              {([['avista', 'À Vista'], ['parcelado', 'Parcelado'], ['entrada_parcelas', 'Entrada + Parcelas']] as [PaymentMode, string][]).map(([m, label]) => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border-2 transition-all ${mode === m ? 'border-green-500 bg-green-50 dark:bg-[rgba(34,197,94,0.1)] text-green-700 dark:text-green-400' : 'border-gray-200 dark:border-[rgba(255,255,255,0.1)] text-gray-600 dark:text-[rgba(255,255,255,0.5)] hover:border-gray-300'}`}>
                  {label}
                </button>
              ))}
            </div>
            {paymentMethodData?.nome && (
              <p className="text-xs text-gray-400 dark:text-[rgba(255,255,255,0.35)] mt-1.5 flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Forma do lead: <strong>{paymentMethodData.nome}</strong>
              </p>
            )}
          </div>

          {/* Entrada */}
          {mode === 'entrada_parcelas' && (
            <div className="bg-blue-50 dark:bg-[rgba(59,130,246,0.07)] border border-blue-200 dark:border-[rgba(59,130,246,0.2)] rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">💰 Entrada</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Valor</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
                    <input type="text" value={fmtInput(entradaValor)} onChange={handleEntradaChange} className={inputCls + ' pl-8'} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}><Calendar className="inline w-3 h-3 mr-1" />Data</label>
                  <input type="date" value={entradaData} onChange={e => setEntradaData(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={entradaStatus} onChange={e => setEntradaStatus(e.target.value as any)} className={inputCls}>
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Parcelas */}
          {mode !== 'avista' && (
            <div className="space-y-3">
              {/* Cabeçalho com campo numérico */}
              <div>
                <label className={labelCls}>
                  Número de Parcelas {mode === 'entrada_parcelas' ? `— restante: ${formatCurrency(valorRestante)}` : `— total: ${formatCurrency(valorOverride)}`}
                </label>
                <div className="flex items-center gap-3">
                  {/* Campo numérico livre */}
                  <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[rgba(255,255,255,0.04)] border border-gray-200 dark:border-[rgba(255,255,255,0.1)] rounded-xl px-3 py-2">
                    <button type="button"
                      onClick={() => setNumParcelas(p => Math.max(1, p - 1))}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-[#07101f] border border-gray-200 dark:border-[rgba(255,255,255,0.1)] text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.1)] font-bold text-base transition-colors shadow-sm">
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={numParcelas}
                      onChange={e => {
                        const v = Math.min(24, Math.max(1, Number(e.target.value) || 1));
                        setNumParcelas(v);
                      }}
                      className="w-14 text-center text-xl font-black text-gray-900 dark:text-white bg-transparent border-none outline-none"
                    />
                    <button type="button"
                      onClick={() => setNumParcelas(p => Math.min(24, p + 1))}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-[#07101f] border border-gray-200 dark:border-[rgba(255,255,255,0.1)] text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.1)] font-bold text-base transition-colors shadow-sm">
                      +
                    </button>
                    <span className="text-sm text-gray-500 dark:text-[rgba(255,255,255,0.4)] ml-1 font-medium">
                      {numParcelas === 1 ? 'parcela' : 'parcelas'} de {formatCurrency(valorRestante / numParcelas)}
                    </span>
                  </div>
                  {/* Botão redistribuir */}
                  <button
                    type="button"
                    onClick={() => setParcelas(buildParcelas(numParcelas, valorRestante, dataInicial))}
                    title="Redistribuir valores igualmente"
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors shadow-sm whitespace-nowrap">
                    ↺ Redistribuir
                  </button>
                </div>
                {/* Atalhos rápidos */}
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {[1,2,3,4,6,8,10,12,18,24].map(n => (
                    <button key={n} type="button" onClick={() => setNumParcelas(n)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                        numParcelas === n
                          ? 'bg-green-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-[rgba(255,255,255,0.07)] text-gray-600 dark:text-[rgba(255,255,255,0.5)] hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.12)]'
                      }`}>
                      {n}x
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {parcelas.map((p, i) => (
                  <div key={i} className="grid grid-cols-[32px_1fr_130px_110px_32px] gap-2 items-center bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2">
                    <span className="text-xs font-bold text-gray-400 dark:text-[rgba(255,255,255,0.3)]">{p.numero}</span>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
                      <input type="text" value={fmtInput(p.valor)} onChange={e => handleParcelaValorChange(i, e)} className="w-full pl-7 pr-2 py-1.5 text-sm font-semibold text-gray-900 dark:text-white border border-gray-300 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#07101f] rounded-md focus:ring-1 focus:ring-green-500" />
                    </div>
                    <input type="date" value={p.data} onChange={e => updateParcela(i, 'data', e.target.value)} className="px-2 py-1.5 text-xs border border-gray-300 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#07101f] dark:text-white rounded-md focus:ring-1 focus:ring-green-500" />
                    <select value={p.status} onChange={e => updateParcela(i, 'status', e.target.value)} className="px-2 py-1.5 text-xs border border-gray-300 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#07101f] dark:text-white rounded-md focus:ring-1 focus:ring-green-500">
                      <option value="pendente">Pendente</option>
                      <option value="pago">Pago</option>
                    </select>
                    <button type="button" onClick={() => removeParcela(i)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>

              {/* Preview total */}
              <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${hasDiff ? 'bg-amber-50 dark:bg-[rgba(245,158,11,0.1)] border border-amber-300 dark:border-[rgba(245,158,11,0.3)]' : 'bg-green-50 dark:bg-[rgba(34,197,94,0.07)] border border-green-200 dark:border-[rgba(34,197,94,0.2)]'}`}>
                <span className="text-xs font-semibold text-gray-600 dark:text-[rgba(255,255,255,0.5)]">Total configurado</span>
                <span className={`text-sm font-bold ${hasDiff ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400'}`}>
                  {formatCurrency(totalGeral)}
                  {hasDiff && <span className="text-xs ml-2 opacity-70">(dif: {formatCurrency(diff)})</span>}
                </span>
              </div>
            </div>
          )}

          {/* Data para modo à vista */}
          {mode === 'avista' && (
            <div>
              <label className={labelCls}><Calendar className="inline w-3.5 h-3.5 mr-1" />Data do Pagamento</label>
              <input type="date" value={dataInicial} onChange={e => setDataInicial(e.target.value)} className={inputCls} />
            </div>
          )}

          {/* Data inicial para modo parcelado */}
          {mode === 'parcelado' && (
            <div>
              <label className={labelCls}><Calendar className="inline w-3.5 h-3.5 mr-1" />Data da 1ª Parcela</label>
              <input type="date" value={dataInicial} onChange={e => setDataInicial(e.target.value)} className={inputCls} />
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}><Tag className="inline w-3 h-3 mr-1" />Categoria</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value)} className={inputCls}>
                <option value="">Sem categoria</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}><CreditCard className="inline w-3 h-3 mr-1" />Forma de Pagamento</label>
              <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} className={inputCls}>
                <option value="pix">PIX</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao_credito">Cartão de Crédito</option>
                <option value="cartao_debito">Cartão de Débito</option>
                <option value="transferencia">Transferência</option>
                <option value="boleto">Boleto</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Observações (opcional)</label>
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} placeholder="Ex: 50% na contratação, 50% no dia do evento..." className={inputCls + ' resize-none'} />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-[rgba(239,68,68,0.1)] border border-red-200 dark:border-[rgba(239,68,68,0.2)] rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-[rgba(255,255,255,0.06)] px-6 py-4 flex justify-between items-center shrink-0 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]">
          <button type="button" onClick={onClose} disabled={saving} className="px-5 py-2.5 text-gray-600 dark:text-[rgba(255,255,255,0.7)] hover:text-gray-900 dark:hover:text-white font-medium hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.07)] rounded-lg transition-colors disabled:opacity-50">
            Pular por agora
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 shadow-sm">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><CheckCircle2 className="w-4 h-4" /> Confirmar Financeiro</>}
          </button>
        </div>
      </div>
    </div>
  );
}
