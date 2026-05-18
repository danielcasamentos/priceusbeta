import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calendar, DollarSign, CheckSquare, Clock, ChevronLeft, ChevronRight, Filter, Sun, AlertTriangle, RefreshCw } from 'lucide-react';

interface MeuDiaProps { userId: string; }

type Periodo = 'hoje' | 'semana' | 'mes' | 'ano' | 'custom';

interface EventoAgenda {
  id: string; data_evento: string; tipo_evento: string;
  cliente_nome: string; cidade?: string; status: string;
}
interface Transacao {
  id: string; descricao: string; valor: number; data: string;
  status: string; tipo: string; forma_pagamento?: string;
}
interface TarefaWorkflow {
  leadId: string; leadNome: string; stepId: string; stepNome: string;
  status: string; prazo?: string | null;
}

function fmt(d: string) { return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }); }
function fmtCurrency(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }

function getRangeForPeriodo(periodo: Periodo, customStart: string, customEnd: string): { start: string; end: string; label: string } {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (periodo === 'hoje') {
    const s = dateStr(today);
    return { start: s, end: s, label: `Hoje, ${today.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}` };
  }
  if (periodo === 'semana') {
    const day = today.getDay();
    const mon = new Date(today); mon.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { start: dateStr(mon), end: dateStr(sun), label: `${fmt(dateStr(mon))} – ${fmt(dateStr(sun))}` };
  }
  if (periodo === 'mes') {
    const s = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
    const e = dateStr(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    return { start: s, end: e, label: today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) };
  }
  if (periodo === 'ano') {
    return { start: `${today.getFullYear()}-01-01`, end: `${today.getFullYear()}-12-31`, label: String(today.getFullYear()) };
  }
  return { start: customStart, end: customEnd, label: `${fmt(customStart)} – ${fmt(customEnd)}` };
}

export function MeuDia({ userId }: MeuDiaProps) {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<Periodo>('hoje');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [tarefas, setTarefas] = useState<TarefaWorkflow[]>([]);

  const range = getRangeForPeriodo(periodo, customStart, customEnd);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [evRes, trRes, leadsRes] = await Promise.all([
        supabase.from('eventos_agenda').select('*').eq('user_id', userId).gte('data_evento', range.start).lte('data_evento', range.end).order('data_evento'),
        supabase.from('company_transactions').select('*').eq('user_id', userId).gte('data', range.start).lte('data', range.end).order('data'),
        supabase.from('leads').select('id, nome_cliente, workflow').eq('user_id', userId).eq('status', 'convertido'),
      ]);
      setEventos(evRes.data || []);
      setTransacoes(trRes.data || []);

      const tarefasRaw: TarefaWorkflow[] = [];
      for (const lead of (leadsRes.data || [])) {
        const wf = Array.isArray(lead.workflow) ? lead.workflow : [];
        for (const step of wf) {
          if (step.status !== 'concluido') {
            const prazo = step.prazo || step.deadline || null;
            const inRange = !prazo || (prazo >= range.start && prazo <= range.end);
            if (inRange || periodo === 'hoje') {
              tarefasRaw.push({ leadId: lead.id, leadNome: lead.nome_cliente, stepId: step.id, stepNome: step.nome || step.title || 'Tarefa', status: step.status, prazo });
            }
          }
        }
      }
      
      // Ordena tarefas: das mais urgentes (menor prazo/atrasadas) para as menos urgentes
      tarefasRaw.sort((a, b) => {
        if (!a.prazo && !b.prazo) return 0;
        if (!a.prazo) return 1; // Sem prazo vai para o final
        if (!b.prazo) return -1;
        return new Date(a.prazo).getTime() - new Date(b.prazo).getTime();
      });
      
      setTarefas(tarefasRaw);
    } finally { setLoading(false); }
  }, [userId, range.start, range.end]);

  useEffect(() => { load(); }, [load]);

  const receitasPagas = transacoes.filter(t => t.tipo === 'receita' && t.status === 'pago').reduce((s, t) => s + t.valor, 0);
  const receitasPendentes = transacoes.filter(t => t.tipo === 'receita' && t.status === 'pendente').reduce((s, t) => s + t.valor, 0);
  const despesas = transacoes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);

  const tarefasAtrasadas = tarefas.filter(t => t.prazo && t.prazo < new Date().toISOString().split('T')[0]);

  const statusColor = (s: string) => ({
    confirmado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    pendente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    concluido: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    cancelado: 'bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400',
  }[s] || 'bg-gray-100 text-gray-600');

  const periodos: { id: Periodo; label: string }[] = [
    { id: 'hoje', label: 'Hoje' }, { id: 'semana', label: 'Semana' },
    { id: 'mes', label: 'Mês' }, { id: 'ano', label: 'Ano' }, { id: 'custom', label: 'Período' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl">
            <Sun className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Meu Dia</h2>
            <p className="text-sm text-gray-500 dark:text-[rgba(255,255,255,0.5)]">{range.label}</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {/* Filtros de Período */}
      <div className="flex gap-2 flex-wrap">
        {periodos.map(p => (
          <button key={p.id} onClick={() => setPeriodo(p.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${periodo === p.id ? 'bg-amber-500 text-white shadow-md' : 'bg-white dark:bg-[#0a1628] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[rgba(255,255,255,0.08)] hover:border-amber-300'}`}>
            {p.label}
          </button>
        ))}
        {periodo === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#07101f] dark:text-white rounded-lg text-sm" />
            <span className="text-gray-400 text-sm">até</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#07101f] dark:text-white rounded-lg text-sm" />
          </div>
        )}
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Calendar, label: 'Eventos', value: String(eventos.length), color: 'blue', sub: `${eventos.filter(e => e.status === 'confirmado').length} confirmados` },
          { icon: DollarSign, label: 'Recebido', value: fmtCurrency(receitasPagas), color: 'green', sub: `${fmtCurrency(receitasPendentes)} pendente` },
          { icon: DollarSign, label: 'Despesas', value: fmtCurrency(despesas), color: 'red', sub: `${transacoes.filter(t => t.tipo === 'despesa').length} lançamentos` },
          { icon: CheckSquare, label: 'Tarefas', value: String(tarefas.length), color: tarefasAtrasadas.length > 0 ? 'red' : 'purple', sub: tarefasAtrasadas.length > 0 ? `${tarefasAtrasadas.length} atrasadas!` : 'em produção' },
        ].map(c => (
          <div key={c.label} className="bg-white dark:bg-[#0a1628] rounded-2xl p-4 border border-gray-100 dark:border-[rgba(255,255,255,0.05)] shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-${c.color}-100 dark:bg-${c.color}-900/20`}>
              <c.icon className={`w-5 h-5 text-${c.color}-600 dark:text-${c.color}-400`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{c.value}</p>
            <p className="text-xs font-semibold text-gray-500 dark:text-[rgba(255,255,255,0.4)] mt-0.5">{c.label}</p>
            <p className="text-xs text-gray-400 dark:text-[rgba(255,255,255,0.3)] mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-amber-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Eventos da Agenda */}
          <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-100 dark:border-[rgba(255,255,255,0.05)] shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-[rgba(255,255,255,0.05)]">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900 dark:text-white">Eventos ({eventos.length})</h3>
            </div>
            {eventos.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">Nenhum evento no período</div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-[rgba(255,255,255,0.03)] max-h-72 overflow-y-auto">
                {eventos.map(ev => (
                  <div key={ev.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.02)]">
                    <div className="text-center shrink-0 w-10">
                      <p className="text-lg font-black text-blue-600">{new Date(ev.data_evento + 'T12:00:00').getDate()}</p>
                      <p className="text-xs text-gray-400 -mt-1">{new Date(ev.data_evento + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' })}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{ev.cliente_nome}</p>
                      <p className="text-xs text-gray-500 truncate">{ev.tipo_evento}{ev.cidade ? ` • ${ev.cidade}` : ''}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusColor(ev.status)}`}>{ev.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tarefas Workflow */}
          <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-100 dark:border-[rgba(255,255,255,0.05)] shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-[rgba(255,255,255,0.05)]">
              <CheckSquare className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-gray-900 dark:text-white">Tarefas Pendentes ({tarefas.length})</h3>
              {tarefasAtrasadas.length > 0 && (
                <span className="ml-auto flex items-center gap-1 text-xs text-red-600 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />{tarefasAtrasadas.length} atrasadas
                </span>
              )}
            </div>
            {tarefas.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">Sem tarefas pendentes 🎉</div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-[rgba(255,255,255,0.03)] max-h-72 overflow-y-auto">
                {tarefas.map(t => {
                  const atrasada = t.prazo && t.prazo < new Date().toISOString().split('T')[0];
                  return (
                    <button 
                      key={`${t.leadId}-${t.stepId}`} 
                      onClick={() => navigate(`/dashboard/leads?tab=producao&leadId=${t.leadId}`)}
                      className={`w-full text-left flex items-center gap-3 px-5 py-3 transition-colors ${atrasada ? 'bg-red-50 dark:bg-[rgba(239,68,68,0.04)] hover:bg-red-100 dark:hover:bg-[rgba(239,68,68,0.08)]' : 'hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.02)]'}`}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${atrasada ? 'bg-red-500' : 'bg-purple-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 dark:text-[rgba(255,255,255,0.4)] truncate">{t.leadNome}</p>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{t.stepNome}</p>
                      </div>
                      {t.prazo && (
                        <div className={`text-xs shrink-0 font-semibold flex items-center gap-1 ${atrasada ? 'text-red-600' : 'text-gray-400'}`}>
                          <Clock className="w-3 h-3" />{fmt(t.prazo)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Financeiro do Período */}
          <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-100 dark:border-[rgba(255,255,255,0.05)] shadow-sm overflow-hidden lg:col-span-2">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-[rgba(255,255,255,0.05)]">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-gray-900 dark:text-white">Movimentações Financeiras ({transacoes.length})</h3>
            </div>
            {transacoes.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">Nenhuma transação no período</div>
            ) : (
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] text-xs text-gray-500 dark:text-[rgba(255,255,255,0.4)] uppercase">
                    <tr>
                      <th className="px-5 py-2 text-left">Descrição</th>
                      <th className="px-5 py-2 text-left">Data</th>
                      <th className="px-5 py-2 text-right">Valor</th>
                      <th className="px-5 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-[rgba(255,255,255,0.03)]">
                    {transacoes.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.02)]">
                        <td className="px-5 py-2.5 text-gray-800 dark:text-white font-medium max-w-[200px] truncate">{t.descricao}</td>
                        <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">{fmt(t.data)}</td>
                        <td className={`px-5 py-2.5 font-bold text-right whitespace-nowrap ${t.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.tipo === 'despesa' ? '- ' : '+ '}{fmtCurrency(t.valor)}
                        </td>
                        <td className="px-5 py-2.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
