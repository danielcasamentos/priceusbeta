import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Calendar, DollarSign, CheckSquare, Clock, Sun, AlertTriangle,
  RefreshCw, TrendingUp, Zap, Award, ChevronRight, Filter,
  Lightbulb, Heart,
} from 'lucide-react';

interface MeuDiaProps { userId: string; }

type Periodo = 'hoje' | 'semana' | 'mes' | 'ano' | 'custom';
type FiltroUrgencia = 'todos' | 'atrasadas' | 'hoje' | 'amanha' | 'depois_amanha' | 'futuras';

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
  status: string; prazo?: string | null; completedAt?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(d: string) {
  if (!d) return '';
  const parsed = new Date(d + 'T12:00:00');
  if (isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const pad = (n: number) => String(n).padStart(2, '0');
const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function getToday() { return dateStr(new Date()); }
function getAmanha() { const d = new Date(); d.setDate(d.getDate() + 1); return dateStr(d); }
function getDepoisAmanha() { const d = new Date(); d.setDate(d.getDate() + 2); return dateStr(d); }

function prazoInfo(prazo: string | null | undefined): {
  texto: string; colorClass: string; dotColor: string; urgencia: FiltroUrgencia;
} {
  const hoje = getToday();
  const amanha = getAmanha();
  const depoisAmanha = getDepoisAmanha();
  if (!prazo) return { texto: 'Sem prazo', colorClass: 'text-gray-400 dark:text-gray-500', dotColor: 'bg-gray-300 dark:bg-gray-600', urgencia: 'futuras' };
  if (prazo < hoje) {
    const dias = Math.round((new Date().setHours(0,0,0,0) - new Date(prazo + 'T00:00:00').getTime()) / 86400000);
    return { texto: `Atrasada há ${dias}d`, colorClass: 'text-red-600 dark:text-red-400', dotColor: 'bg-red-500 animate-pulse', urgencia: 'atrasadas' };
  }
  if (prazo === hoje) return { texto: 'Vence hoje!', colorClass: 'text-amber-600 dark:text-amber-400', dotColor: 'bg-amber-400 animate-pulse', urgencia: 'hoje' };
  if (prazo === amanha) return { texto: 'Amanhã', colorClass: 'text-orange-500 dark:text-orange-400', dotColor: 'bg-orange-400', urgencia: 'amanha' };
  if (prazo === depoisAmanha) return { texto: 'Depois de amanhã', colorClass: 'text-violet-500 dark:text-violet-400', dotColor: 'bg-violet-400', urgencia: 'depois_amanha' };
  const dias = Math.round((new Date(prazo + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000);
  return { texto: `${dias}d restantes`, colorClass: 'text-emerald-600 dark:text-emerald-400', dotColor: 'bg-emerald-500', urgencia: 'futuras' };
}

function getRangeForPeriodo(periodo: Periodo, customStart: string, customEnd: string) {
  const today = new Date();
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
  const startLbl = fmt(customStart) || '...';
  const endLbl = fmt(customEnd) || '...';
  return { start: customStart, end: customEnd, label: `${startLbl} – ${endLbl}` };
}

// ── Componente Principal ──────────────────────────────────────────────────────
export function MeuDia({ userId }: MeuDiaProps) {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<Periodo>('hoje');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [filtroUrgencia, setFiltroUrgencia] = useState<FiltroUrgencia>('todos');

  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [tarefas, setTarefas] = useState<TarefaWorkflow[]>([]);
  const [tarefasConcluidas, setTarefasConcluidas] = useState<TarefaWorkflow[]>([]);

  // Previsão amanhã
  const [eventosAmanha, setEventosAmanha] = useState<EventoAgenda[]>([]);
  const [transacoesAmanha, setTransacoesAmanha] = useState<Transacao[]>([]);
  const [tarefasAmanha, setTarefasAmanha] = useState<TarefaWorkflow[]>([]);

  // Totais financeiros anuais/mensais para insights
  const [receitaMes, setReceitaMes] = useState(0);
  const [receitaAno, setReceitaAno] = useState(0);

  const range = getRangeForPeriodo(periodo, customStart, customEnd);

  const load = useCallback(async () => {
    setLoading(true);
    const hoje = getToday();
    const amanha = getAmanha();
    const todayObj = new Date();
    const inicioMes = `${todayObj.getFullYear()}-${pad(todayObj.getMonth() + 1)}-01`;
    const inicioAno = `${todayObj.getFullYear()}-01-01`;

    try {
      let evQuery = supabase.from('eventos_agenda').select('*').eq('user_id', userId);
      if (range.start && range.start.trim() !== '') {
        evQuery = evQuery.gte('data_evento', range.start);
      }
      if (range.end && range.end.trim() !== '') {
        evQuery = evQuery.lte('data_evento', range.end);
      }
      evQuery = evQuery.order('data_evento');

      let trQuery = supabase.from('company_transactions').select('*').eq('user_id', userId);
      if (range.start && range.start.trim() !== '') {
        trQuery = trQuery.gte('data', range.start);
      }
      if (range.end && range.end.trim() !== '') {
        trQuery = trQuery.lte('data', range.end);
      }
      trQuery = trQuery.order('data');

      const [evRes, trRes, leadsRes, evAmanhaRes, trAmanhaRes, trMesRes, trAnoRes] = await Promise.all([
        evQuery,
        trQuery,
        supabase.from('leads').select('id, nome_cliente, workflow').eq('user_id', userId)
          .eq('status', 'convertido'),
        supabase.from('eventos_agenda').select('*').eq('user_id', userId).eq('data_evento', amanha),
        supabase.from('company_transactions').select('*').eq('user_id', userId).eq('data', amanha),
        supabase.from('company_transactions').select('valor, tipo, status').eq('user_id', userId)
          .gte('data', inicioMes).lte('data', hoje),
        supabase.from('company_transactions').select('valor, tipo, status').eq('user_id', userId)
          .gte('data', inicioAno).lte('data', hoje),
      ]);

      setEventos(evRes.data || []);
      setTransacoes(trRes.data || []);
      setEventosAmanha(evAmanhaRes.data || []);
      setTransacoesAmanha(trAmanhaRes.data || []);

      // Receita confirmada do mês e do ano
      const calcReceita = (rows: any[]) =>
        (rows || []).filter((t: any) => t.tipo === 'receita' && t.status === 'pago').reduce((s: number, t: any) => s + (t.valor || 0), 0);
      setReceitaMes(calcReceita(trMesRes.data || []));
      setReceitaAno(calcReceita(trAnoRes.data || []));

      const tarefasRaw: TarefaWorkflow[] = [];
      const tarefasAmanhaRaw: TarefaWorkflow[] = [];
      const concluidasRaw: TarefaWorkflow[] = [];

      for (const lead of (leadsRes.data || [])) {
        const wf = Array.isArray(lead.workflow) ? lead.workflow : [];
        for (const step of wf) {
          const prazo = step.prazo || step.deadline || null;
          const completedAt = step.completedAt || null;
          const stepNome = step.nome || step.label || step.title || 'Tarefa';

          if (step.status === 'concluido') {
            // Inclui TODAS as concluídas, independente de quando
            concluidasRaw.push({ leadId: lead.id, leadNome: lead.nome_cliente, stepId: step.id, stepNome, status: step.status, prazo, completedAt });
          } else {
            const inRange = !prazo || (prazo >= range.start && prazo <= range.end);
            if (inRange || periodo === 'hoje') {
              tarefasRaw.push({ leadId: lead.id, leadNome: lead.nome_cliente, stepId: step.id, stepNome, status: step.status, prazo, completedAt });
            }
            if (prazo === amanha) {
              tarefasAmanhaRaw.push({ leadId: lead.id, leadNome: lead.nome_cliente, stepId: step.id, stepNome, status: step.status, prazo, completedAt });
            }
          }
        }
      }

      tarefasRaw.sort((a, b) => {
        if (!a.prazo && !b.prazo) return 0;
        if (!a.prazo) return 1;
        if (!b.prazo) return -1;
        return new Date(a.prazo).getTime() - new Date(b.prazo).getTime();
      });

      setTarefas(tarefasRaw);
      setTarefasAmanha(tarefasAmanhaRaw);
      setTarefasConcluidas(concluidasRaw);
    } finally { setLoading(false); }
  }, [userId, range.start, range.end]);

  useEffect(() => { load(); }, [load]);

  // ── Produtividade ─────────────────────────────────────────────────────────
  const produtividade = useMemo(() => {
    const hoje = getToday();
    const todayObj = new Date();
    const day = todayObj.getDay();
    const mon = new Date(todayObj); mon.setDate(todayObj.getDate() - day + (day === 0 ? -6 : 1));
    const inicioSemana = dateStr(mon);
    const inicioMes = `${todayObj.getFullYear()}-${pad(todayObj.getMonth() + 1)}-01`;

    // Hoje: só com completedAt hoje
    const hojeCount = tarefasConcluidas.filter(t => t.completedAt?.startsWith(hoje)).length;
    // Semana: com completedAt nesta semana
    const semanaCount = tarefasConcluidas.filter(t => {
      if (!t.completedAt) return false;
      const d = t.completedAt.split('T')[0];
      return d >= inicioSemana && d <= hoje;
    }).length;
    // Total histórico: TODAS as concluídas (com ou sem completedAt)
    const totalCount = tarefasConcluidas.length;

    return { hoje: hojeCount, semana: semanaCount, total: totalCount };
  }, [tarefasConcluidas]);

  // ── Agrupamento por urgência ──────────────────────────────────────────────
  const agrupamento = useMemo(() => {
    const hoje = getToday();
    const amanha = getAmanha();
    const depoisAmanha = getDepoisAmanha();
    return {
      atrasadas: tarefas.filter(t => t.prazo && t.prazo < hoje),
      hoje: tarefas.filter(t => t.prazo === hoje),
      amanha: tarefas.filter(t => t.prazo === amanha),
      depois_amanha: tarefas.filter(t => t.prazo === depoisAmanha),
      futuras: tarefas.filter(t => !t.prazo || t.prazo > depoisAmanha),
    };
  }, [tarefas]);

  // ── Insights e Saúde da Empresa ───────────────────────────────────────────
  const insights = useMemo(() => {
    const totalPendentes = tarefas.length;
    const totalConcluidas = tarefasConcluidas.length;
    const totalGeral = totalPendentes + totalConcluidas;
    const taxaConclusao = totalGeral > 0 ? Math.round((totalConcluidas / totalGeral) * 100) : 100;
    const atrasadasCount = agrupamento.atrasadas.length;
    const hojeCount = agrupamento.hoje.length;

    // Saúde: começa em 100, desconta por atrasos e urgências
    let score = 100;
    score -= Math.min(atrasadasCount * 12, 50);
    score -= Math.min(hojeCount * 4, 20);
    score = Math.max(score, 0);

    let saudeLabel: string;
    let saudeColor: string;
    let saudeBg: string;
    let saudeEmoji: string;
    if (score >= 80) { saudeLabel = 'Saudável'; saudeColor = 'text-emerald-600 dark:text-emerald-400'; saudeBg = 'bg-emerald-100 dark:bg-emerald-900/30'; saudeEmoji = '💚'; }
    else if (score >= 50) { saudeLabel = 'Atenção'; saudeColor = 'text-amber-600 dark:text-amber-400'; saudeBg = 'bg-amber-100 dark:bg-amber-900/30'; saudeEmoji = '🟡'; }
    else { saudeLabel = 'Crítico'; saudeColor = 'text-red-600 dark:text-red-400'; saudeBg = 'bg-red-100 dark:bg-red-900/30'; saudeEmoji = '🔴'; }

    // Mensagens dinâmicas (máximo 3, ordenadas por prioridade)
    const msgs: { emoji: string; texto: string }[] = [];

    if (atrasadasCount > 0) {
      msgs.push({ emoji: '⚠️', texto: `${atrasadasCount} tarefa${atrasadasCount > 1 ? 's atrasadas' : ' atrasada'}. Priorize agora para não impactar clientes.` });
    }
    if (hojeCount > 0 && atrasadasCount === 0) {
      msgs.push({ emoji: '⚡', texto: `${hojeCount} tarefa${hojeCount > 1 ? 's vencem' : ' vence'} hoje. Comece pelas mais rápidas.` });
    }
    if (produtividade.hoje > 0) {
      msgs.push({ emoji: '✅', texto: `Você já concluiu ${produtividade.hoje} tarefa${produtividade.hoje > 1 ? 's' : ''} hoje. Ótimo ritmo!` });
    } else if (atrasadasCount === 0 && hojeCount === 0 && totalPendentes > 0) {
      msgs.push({ emoji: '🌟', texto: `Tarefas em dia. Antecipe as de amanhã para aliviar a semana.` });
    }
    if (totalPendentes === 0) {
      msgs.push({ emoji: '🎉', texto: `Nenhuma tarefa pendente no período. Aproveite para planejar os próximos passos.` });
    }
    if (receitaMes > 0 && msgs.length < 3) {
      msgs.push({ emoji: '💰', texto: `${fmtCurrency(receitaMes)} confirmados este mês. ${receitaAno > receitaMes ? `Total no ano: ${fmtCurrency(receitaAno)}.` : ''}` });
    }

    return { score, taxaConclusao, saudeLabel, saudeColor, saudeBg, saudeEmoji, msgs: msgs.slice(0, 3) };
  }, [tarefas, tarefasConcluidas, agrupamento, produtividade.hoje, receitaMes, receitaAno]);

  // ── Tarefas filtradas ─────────────────────────────────────────────────────
  const tarefasFiltradas = useMemo(() => {
    if (filtroUrgencia === 'todos') return tarefas;
    return tarefas.filter(t => prazoInfo(t.prazo).urgencia === filtroUrgencia);
  }, [tarefas, filtroUrgencia]);

  // ── Financeiro do período ─────────────────────────────────────────────────
  const receitasPagas = transacoes.filter(t => t.tipo === 'receita' && t.status === 'pago').reduce((s, t) => s + t.valor, 0);
  const receitasPendentes = transacoes.filter(t => t.tipo === 'receita' && t.status === 'pendente').reduce((s, t) => s + t.valor, 0);
  const despesas = transacoes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);
  const tarefasAtrasadas = agrupamento.atrasadas;

  const statusColor = (s: string) => ({
    confirmado: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    pendente: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    concluido: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    cancelado: 'bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400',
  }[s] || 'bg-gray-100 text-gray-600');

  const periodos: { id: Periodo; label: string }[] = [
    { id: 'hoje', label: 'Hoje' }, { id: 'semana', label: 'Semana' },
    { id: 'mes', label: 'Mês' }, { id: 'ano', label: 'Ano' }, { id: 'custom', label: 'Período' },
  ];

  const filtros: { id: FiltroUrgencia; label: string; count: number; color: string; bg: string; active: string }[] = [
    { id: 'atrasadas', label: 'Atrasadas', count: agrupamento.atrasadas.length, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30', active: 'ring-red-400' },
    { id: 'hoje', label: 'Hoje', count: agrupamento.hoje.length, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30', active: 'ring-amber-400' },
    { id: 'amanha', label: 'Amanhã', count: agrupamento.amanha.length, color: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/30', active: 'ring-orange-400' },
    { id: 'depois_amanha', label: 'Depois Amanhã', count: agrupamento.depois_amanha.length, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-800/30', active: 'ring-violet-400' },
    { id: 'futuras', label: 'Futuras', count: agrupamento.futuras.length, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30', active: 'ring-emerald-400' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-md shadow-amber-200/40 dark:shadow-amber-900/20">
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

      {/* ── Filtros de Período ──────────────────────────────────────────────── */}
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

      {/* ── Painel de Produtividade (paleta suave) ─────────────────────────── */}
      <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-100 dark:border-[rgba(255,255,255,0.05)] shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-[rgba(255,255,255,0.05)]">
          <TrendingUp className="w-4 h-4 text-indigo-500" />
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">Produtividade</h3>
          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">Tarefas concluídas</span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-[rgba(255,255,255,0.05)]">
          {[
            { label: 'Hoje', value: produtividade.hoje, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/10' },
            { label: 'Esta semana', value: produtividade.semana, icon: Award, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/10' },
            { label: 'Total histórico', value: produtividade.total, icon: CheckSquare, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
          ].map(stat => (
            <div key={stat.label} className="flex flex-col items-center py-5 px-3 gap-1">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className={`text-3xl font-black leading-none ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-tight mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Cards de Resumo ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Calendar, label: 'Eventos', value: String(eventos.length), color: 'blue', sub: `${eventos.filter(e => e.status === 'confirmado').length} confirmados` },
          { icon: DollarSign, label: 'Recebido', value: fmtCurrency(receitasPagas), color: 'green', sub: `${fmtCurrency(receitasPendentes)} pendente` },
          { icon: DollarSign, label: 'Despesas', value: fmtCurrency(despesas), color: 'red', sub: `${transacoes.filter(t => t.tipo === 'despesa').length} lançamentos` },
          { icon: CheckSquare, label: 'Pendentes', value: String(tarefas.length), color: tarefasAtrasadas.length > 0 ? 'red' : 'purple', sub: tarefasAtrasadas.length > 0 ? `${tarefasAtrasadas.length} atrasadas!` : 'em produção' },
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
        <div className="space-y-6">

          {/* ── Insights & Saúde da Empresa ──────────────────────────────────── */}
          <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-100 dark:border-[rgba(255,255,255,0.05)] shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-[rgba(255,255,255,0.05)]">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">Insights & Saúde</h3>
              {/* Badge de saúde */}
              <span className={`ml-auto flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${insights.saudeBg} ${insights.saudeColor}`}>
                <Heart className="w-3 h-3" />
                {insights.saudeEmoji} {insights.saudeLabel}
              </span>
            </div>

            <div className="px-5 py-4 space-y-2.5">
              {/* Barra de taxa de conclusão */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Taxa de conclusão</span>
                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${insights.taxaConclusao >= 70 ? 'bg-emerald-500' : insights.taxaConclusao >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${insights.taxaConclusao}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 shrink-0">{insights.taxaConclusao}%</span>
              </div>

              {/* Mensagens de insight */}
              {insights.msgs.map((m, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                  <span className="text-base leading-none mt-0.5 shrink-0">{m.emoji}</span>
                  <p className="leading-snug">{m.texto}</p>
                </div>
              ))}

              {/* Mini analytics financeiro */}
              {(receitaMes > 0 || receitaAno > 0) && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[rgba(255,255,255,0.05)] grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl px-3 py-2">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Receita do mês</p>
                    <p className="text-sm font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{fmtCurrency(receitaMes)}</p>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-xl px-3 py-2">
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Receita do ano</p>
                    <p className="text-sm font-black text-indigo-700 dark:text-indigo-300 mt-0.5">{fmtCurrency(receitaAno)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Mini Painel de Cronograma ────────────────────────────────────── */}
          <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-100 dark:border-[rgba(255,255,255,0.05)] shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-[rgba(255,255,255,0.05)]">
              <Filter className="w-4 h-4 text-gray-400" />
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">Tarefas por Prazo</h3>
              {filtroUrgencia !== 'todos' && (
                <button onClick={() => setFiltroUrgencia('todos')} className="ml-auto text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold">
                  Ver todas
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4">
              {filtros.map(f => (
                <button key={f.id}
                  onClick={() => setFiltroUrgencia(prev => prev === f.id ? 'todos' : f.id)}
                  className={`rounded-xl border p-3 text-center transition-all hover:scale-105 active:scale-95 ${f.bg} ${filtroUrgencia === f.id ? `ring-2 ring-offset-1 ${f.active} scale-105 shadow-sm` : ''}`}>
                  <p className={`text-2xl font-black leading-none ${f.color}`}>{f.count}</p>
                  <p className={`text-xs font-semibold mt-1 ${f.color}`}>{f.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── Eventos ──────────────────────────────────────────────────── */}
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

            {/* ── Tarefas Pendentes ─────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-100 dark:border-[rgba(255,255,255,0.05)] shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-[rgba(255,255,255,0.05)]">
                <CheckSquare className="w-5 h-5 text-violet-600" />
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Tarefas Pendentes ({tarefasFiltradas.length}{filtroUrgencia !== 'todos' ? ` / ${tarefas.length}` : ''})
                </h3>
                {tarefasAtrasadas.length > 0 && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-red-600 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />{tarefasAtrasadas.length}
                  </span>
                )}
              </div>
              {tarefasFiltradas.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">
                  {filtroUrgencia !== 'todos' ? 'Nenhuma nesta categoria 🎉' : 'Sem tarefas pendentes 🎉'}
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-[rgba(255,255,255,0.03)] max-h-96 overflow-y-auto">
                  {tarefasFiltradas.map(t => {
                    const pi = prazoInfo(t.prazo);
                    const isHoje = pi.urgencia === 'hoje';
                    const isAtrasada = pi.urgencia === 'atrasadas';
                    return (
                      <button
                        key={`${t.leadId}-${t.stepId}`}
                        onClick={() => navigate(`/dashboard/leads?tab=producao&leadId=${t.leadId}&stepId=${t.stepId}`)}
                        className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-all group ${
                          isHoje
                            ? 'bg-gradient-to-r from-amber-50 to-amber-50/30 dark:from-amber-950/15 dark:to-transparent border-l-4 border-amber-400 dark:border-amber-500'
                            : isAtrasada
                            ? 'bg-red-50/50 dark:bg-[rgba(239,68,68,0.03)] border-l-4 border-red-300 dark:border-red-700'
                            : 'hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.02)]'
                        }`}>
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${pi.dotColor}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400 dark:text-[rgba(255,255,255,0.35)] truncate">{t.leadNome}</p>
                          <p className={`font-semibold text-sm truncate ${isHoje ? 'text-amber-800 dark:text-amber-200' : 'text-gray-900 dark:text-white'}`}>
                            {t.stepNome}
                          </p>
                          {isHoje && <span className="text-xs font-bold text-amber-600 dark:text-amber-400">⚠️ Vence hoje</span>}
                        </div>
                        <div className={`text-xs shrink-0 font-semibold flex items-center gap-1 ${pi.colorClass}`}>
                          <Clock className="w-3 h-3" />{pi.texto}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition-colors shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Financeiro ───────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-100 dark:border-[rgba(255,255,255,0.05)] shadow-sm overflow-hidden lg:col-span-2">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-[rgba(255,255,255,0.05)]">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900 dark:text-white">Movimentações Financeiras ({transacoes.length})</h3>
              </div>
              {transacoes.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">Nenhuma transação no período</div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <div className="hidden md:block overflow-x-auto">
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
                          <tr key={t.id} onClick={() => navigate('/dashboard/financeiro')}
                            className="hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.02)] cursor-pointer transition-colors">
                            <td className="px-5 py-2.5 text-gray-800 dark:text-white font-medium max-w-[200px] truncate">{t.descricao}</td>
                            <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">{fmt(t.data)}</td>
                            <td className={`px-5 py-2.5 font-bold text-right whitespace-nowrap ${t.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
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
                  <div className="md:hidden flex flex-col p-4 gap-3">
                    {transacoes.map(t => (
                      <div key={t.id} onClick={() => navigate('/dashboard/financeiro')}
                        className="bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] p-4 rounded-xl border border-gray-100 dark:border-[rgba(255,255,255,0.05)] cursor-pointer">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{t.descricao}</p>
                          <p className={`font-bold shrink-0 ml-2 ${t.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {t.tipo === 'despesa' ? '- ' : '+ '}{fmtCurrency(t.valor)}
                          </p>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500">{fmt(t.data)}</span>
                          <span className={`font-semibold px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Previsão Amanhã ─────────────────────────────────────────────────── */}
      {!loading && (
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">O que temos para amanhã?</h3>
            <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs font-semibold px-2.5 py-1 rounded-full">Preview</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Trabalhos */}
            <div className="bg-white dark:bg-[#0a1628] rounded-xl border border-gray-100 dark:border-[rgba(255,255,255,0.05)] p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <CheckSquare className="w-5 h-5 text-violet-600" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Trabalhos</h4>
                <span className="ml-auto text-sm font-bold text-gray-500 bg-gray-100 dark:bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded-full">{tarefasAmanha.length}</span>
              </div>
              {tarefasAmanha.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhum prazo para amanhã</p>
              ) : (
                <div className="space-y-2">
                  {tarefasAmanha.map(t => (
                    <button key={`${t.leadId}-${t.stepId}`}
                      onClick={() => navigate(`/dashboard/leads?tab=producao&leadId=${t.leadId}&stepId=${t.stepId}`)}
                      className="w-full text-left bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.04)] transition-colors group">
                      <p className="text-xs text-violet-600 font-semibold truncate">{t.leadNome}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-sm text-gray-900 dark:text-white font-medium truncate">{t.stepNome}</p>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Entradas */}
            <div className="bg-white dark:bg-[#0a1628] rounded-xl border border-gray-100 dark:border-[rgba(255,255,255,0.05)] p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Entradas</h4>
                <span className="ml-auto text-sm font-bold text-gray-500 bg-gray-100 dark:bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded-full">{transacoesAmanha.filter(t => t.tipo === 'receita').length}</span>
              </div>
              {transacoesAmanha.filter(t => t.tipo === 'receita').length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma entrada agendada</p>
              ) : (
                <div className="space-y-2">
                  {transacoesAmanha.filter(t => t.tipo === 'receita').map(t => (
                    <div key={t.id} className="bg-emerald-50 dark:bg-[rgba(34,197,94,0.05)] border border-emerald-100 dark:border-[rgba(34,197,94,0.1)] p-3 rounded-lg flex justify-between items-center">
                      <p className="text-sm text-gray-900 dark:text-white font-medium truncate pr-2">{t.descricao}</p>
                      <p className="text-sm font-bold text-emerald-600 shrink-0">{fmtCurrency(t.valor)}</p>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-100 dark:border-[rgba(255,255,255,0.05)] flex justify-between">
                    <span className="text-xs font-semibold text-gray-500">Total a receber:</span>
                    <span className="font-bold text-emerald-600 text-sm">{fmtCurrency(transacoesAmanha.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0))}</span>
                  </div>
                </div>
              )}
            </div>
            {/* Eventos */}
            <div className="bg-white dark:bg-[#0a1628] rounded-xl border border-gray-100 dark:border-[rgba(255,255,255,0.05)] p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Eventos</h4>
                <span className="ml-auto text-sm font-bold text-gray-500 bg-gray-100 dark:bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded-full">{eventosAmanha.length}</span>
              </div>
              {eventosAmanha.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhum evento na agenda</p>
              ) : (
                <div className="space-y-2">
                  {eventosAmanha.map(ev => (
                    <div key={ev.id} className="bg-blue-50 dark:bg-[rgba(59,130,246,0.05)] border border-blue-100 dark:border-[rgba(59,130,246,0.1)] p-3 rounded-lg">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{ev.cliente_nome}</p>
                      <p className="text-xs text-blue-600 font-medium truncate mt-0.5">{ev.tipo_evento}{ev.cidade ? ` • ${ev.cidade}` : ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
