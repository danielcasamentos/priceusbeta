import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Calendar, DollarSign, CheckSquare, Clock, Sun,
  RefreshCw, Zap, ChevronRight, Filter,
  Plus, ArrowRight, TrendingDown,
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
    <div className="space-y-8 pb-12">
      {/* ── Top Bar / Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/40 dark:bg-black/10 backdrop-blur-md p-4 rounded-2xl border border-gray-200/50 dark:border-white/5">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-xl shadow-lg shadow-orange-500/20 dark:shadow-orange-900/30 transform hover:scale-105 transition-all">
            <Sun className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Meu Dia</h2>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{range.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={load} 
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0a1628] border border-gray-200 dark:border-white/5 rounded-xl hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.03)] hover:shadow-sm active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
            Atualizar
          </button>
        </div>
      </div>

      {/* ── Filtros de Período ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap bg-gray-100/80 dark:bg-[#07101f] p-1.5 rounded-2xl border border-gray-250/20">
          {periodos.map(p => (
            <button 
              key={p.id} 
              onClick={() => setPeriodo(p.id)}
              className={`px-4.5 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
                periodo === p.id 
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md' 
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        
        {periodo === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-[#0a1628] p-2 rounded-2xl border border-gray-250/25">
            <input 
              type="date" 
              value={customStart} 
              onChange={e => setCustomStart(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 dark:border-white/5 dark:bg-[#07101f] dark:text-white rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 outline-none" 
            />
            <span className="text-gray-400 text-xs font-bold uppercase">até</span>
            <input 
              type="date" 
              value={customEnd} 
              onChange={e => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 dark:border-white/5 dark:bg-[#07101f] dark:text-white rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 outline-none" 
            />
          </div>
        )}
      </div>

      {/* ── Banner de Boas-Vindas e Saúde da Empresa ── */}
      <div className="bg-gradient-to-r from-gray-900 via-slate-900 to-zinc-900 text-white rounded-3xl p-6 sm:p-8 border border-white/5 shadow-2xl relative overflow-hidden">
        {/* Decorative blur balls */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold tracking-wider text-orange-400 uppercase">
              <Zap className="w-3 h-3 text-orange-400 animate-pulse" />
              Painel de Desempenho
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              Como está o seu negócio hoje?
            </h3>
            
            <div className="space-y-2 mt-4">
              {insights.msgs.map((m, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/5 backdrop-blur-sm p-3 rounded-xl border border-white/5">
                  <span className="text-lg leading-none shrink-0">{m.emoji}</span>
                  <p className="text-sm text-gray-300 font-medium leading-relaxed">{m.texto}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Health index circle */}
          <div className="shrink-0 flex flex-col items-center bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 text-center w-full md:w-56">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Índice de Saúde</p>
            <div className="relative w-28 h-28 flex items-center justify-center">
              {/* Outer Glow Ring */}
              <div className={`absolute inset-0 rounded-full blur-lg opacity-25 ${
                insights.score >= 80 ? 'bg-emerald-500' : insights.score >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`}></div>
              
              {/* SVG circular track */}
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" className="stroke-white/10 fill-none" strokeWidth="8" />
                <circle 
                  cx="56" 
                  cy="56" 
                  r="48" 
                  className={`fill-none transition-all duration-1000 ${
                    insights.score >= 80 ? 'stroke-emerald-500' : insights.score >= 50 ? 'stroke-amber-500' : 'stroke-red-500'
                  }`} 
                  strokeWidth="8" 
                  strokeDasharray={2 * Math.PI * 48} 
                  strokeDashoffset={2 * Math.PI * 48 * (1 - insights.score / 100)} 
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-black tracking-tight">{insights.score}%</span>
                <span className="text-[10px] font-bold uppercase text-gray-400 mt-0.5">{insights.saudeLabel}</span>
              </div>
            </div>
            
            <div className="w-full mt-4 flex items-center gap-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Conclusões</span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500 rounded-full transition-all duration-700" 
                  style={{ width: `${insights.taxaConclusao}%` }}
                ></div>
              </div>
              <span className="text-xs font-black">{insights.taxaConclusao}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Ações Rápidas (CRM Core) ── */}
      <div className="bg-white dark:bg-[#0a1628] rounded-3xl p-6 border border-gray-200/50 dark:border-white/5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-500" />
          Ações Rápidas do CRM
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button 
            onClick={() => navigate('/dashboard/leads?new=true')}
            className="flex items-center justify-between p-4 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-2xl hover:shadow-lg hover:shadow-indigo-500/20 active:scale-98 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl">
                <Plus className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">Novo Lead</p>
                <p className="text-[10px] text-white/70 font-medium">Cadastrar contato comercial</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            onClick={() => navigate('/dashboard/empresa-transacoes?new=true')}
            className="flex items-center justify-between p-4 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl hover:shadow-lg hover:shadow-emerald-500/20 active:scale-98 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl">
                <Plus className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">Nova Transação</p>
                <p className="text-[10px] text-white/70 font-medium">Lançar receita ou despesa</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            onClick={() => navigate('/dashboard/agenda?new=true')}
            className="flex items-center justify-between p-4 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-2xl hover:shadow-lg hover:shadow-orange-500/20 active:scale-98 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl">
                <Plus className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">Novo Compromisso</p>
                <p className="text-[10px] text-white/70 font-medium">Agendar ensaio ou reunião</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* ── KPIs de Negócio ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Calendar, label: 'Eventos', value: String(eventos.length), color: 'indigo', sub: `${eventos.filter(e => e.status === 'confirmado').length} confirmados`, bg: 'from-indigo-500/10 to-blue-500/5', iconBg: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30', route: '/dashboard/agenda' },
          { icon: DollarSign, label: 'Recebido', value: fmtCurrency(receitasPagas), color: 'emerald', sub: `${fmtCurrency(receitasPendentes)} pendente`, bg: 'from-emerald-500/10 to-teal-500/5', iconBg: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30', route: '/dashboard/empresa-transacoes' },
          { icon: TrendingDown, label: 'Despesas', value: fmtCurrency(despesas), color: 'red', sub: `${transacoes.filter(t => t.tipo === 'despesa').length} lançamentos`, bg: 'from-red-500/10 to-rose-500/5', iconBg: 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30', route: '/dashboard/empresa-transacoes' },
          { icon: CheckSquare, label: 'Pendentes', value: String(tarefas.length), color: tarefasAtrasadas.length > 0 ? 'red' : 'amber', sub: tarefasAtrasadas.length > 0 ? `${tarefasAtrasadas.length} atrasadas!` : 'em produção', bg: 'from-amber-500/10 to-yellow-500/5', iconBg: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30', route: '/dashboard/leads' },
        ].map(c => (
          <div
            key={c.label}
            onClick={() => navigate(c.route)}
            className="bg-white dark:bg-[#0a1628] rounded-3xl p-5 border border-gray-200/50 dark:border-white/5 shadow-sm cursor-pointer hover:-translate-y-1 hover:shadow-md active:scale-98 transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-20 pointer-events-none rounded-full blur-2xl"></div>
            
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.iconBg}`}>
                <c.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Painel</span>
            </div>
            
            <p className="text-2xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">{c.value}</p>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">{c.label}</p>
            <p className={`text-[10px] font-semibold mt-2.5 ${c.color === 'red' ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>{c.sub}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-orange-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ── COLUNA ESQUERDA: Produção e Foco (7 cols) ── */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Urgência Filter Tabs */}
            <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200/50 dark:border-white/5 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Tarefas por Prazo</h3>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {filtros.map(f => (
                  <button 
                    key={f.id}
                    onClick={() => setFiltroUrgencia(prev => prev === f.id ? 'todos' : f.id)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-bold tracking-wide transition-all hover:scale-102 active:scale-95 ${
                      filtroUrgencia === f.id 
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-sm' 
                        : 'bg-gray-50 dark:bg-[#07101f] text-gray-600 dark:text-gray-400 border-gray-200/50 dark:border-white/5'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      filtroUrgencia === f.id 
                        ? 'bg-white text-orange-600' 
                        : 'bg-gray-200/60 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                    }`}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* List of Tasks */}
            <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200/50 dark:border-white/5 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-150 dark:border-white/5 bg-gray-50/50 dark:bg-white/2">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-gray-900 dark:text-white">Foco na Produção</h3>
                </div>
                {tarefasFiltradas.length > 0 && (
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
                    {tarefasFiltradas.length} pendentes
                  </span>
                )}
              </div>

              {tarefasFiltradas.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-sm flex flex-col items-center justify-center gap-3">
                  <CheckSquare className="w-10 h-10 text-gray-300 dark:text-gray-700" />
                  <p className="font-medium">Nenhuma tarefa pendente nesta categoria 🎉</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-150 dark:divide-white/5 max-h-[500px] overflow-y-auto">
                  {tarefasFiltradas.map(t => {
                    const pi = prazoInfo(t.prazo);
                    const isHoje = pi.urgencia === 'hoje';
                    const isAtrasada = pi.urgencia === 'atrasadas';
                    
                    return (
                      <div
                        key={`${t.leadId}-${t.stepId}`}
                        onClick={() => navigate(`/dashboard/leads?tab=producao&leadId=${t.leadId}&stepId=${t.stepId}`)}
                        className={`group w-full flex items-center justify-between gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-white/2 transition-all border-l-4 ${
                          isHoje 
                            ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/5' 
                            : isAtrasada 
                            ? 'border-red-500 bg-red-50/10 dark:bg-red-950/2' 
                            : 'border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${pi.dotColor}`} />
                          <div className="min-w-0">
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider truncate mb-0.5">{t.leadNome}</p>
                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate group-hover:text-orange-500 transition-colors">
                              {t.stepNome}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                            isHoje 
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400' 
                              : isAtrasada 
                              ? 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400' 
                              : 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-400'
                          }`}>
                            <Clock className="w-3 h-3" />
                            {pi.texto}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* ── COLUNA DIREITA: Agenda, Caixa e Preview Amanhã (5 cols) ── */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* O Que Temos Para Amanhã Preview Card */}
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-zinc-950 text-white rounded-3xl p-6 border border-white/5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex items-center gap-2 mb-5">
                <h3 className="text-base font-black uppercase tracking-wider text-white">Amanhã</h3>
                <span className="bg-indigo-500/35 border border-indigo-500/30 text-indigo-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Preview</span>
              </div>

              <div className="space-y-4">
                {/* Tarefas */}
                <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5 text-indigo-400" /> Tarefas</span>
                    <span className="text-xs font-black text-indigo-400">{tarefasAmanha.length}</span>
                  </div>
                  {tarefasAmanha.length === 0 ? (
                    <p className="text-xs text-gray-400">Nenhuma tarefa programada.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {tarefasAmanha.slice(0, 2).map(t => (
                        <p key={`${t.leadId}-${t.stepId}`} className="text-xs font-medium text-gray-200 truncate">• {t.stepNome}</p>
                      ))}
                      {tarefasAmanha.length > 2 && <p className="text-[10px] text-indigo-400 font-bold">+ {tarefasAmanha.length - 2} tarefas</p>}
                    </div>
                  )}
                </div>

                {/* Financeiro */}
                <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Caixa</span>
                    <span className="text-xs font-black text-emerald-400">
                      {fmtCurrency(transacoesAmanha.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0))}
                    </span>
                  </div>
                  {transacoesAmanha.filter(t => t.tipo === 'receita').length === 0 ? (
                    <p className="text-xs text-gray-400">Nenhum pagamento agendado.</p>
                  ) : (
                    <div className="space-y-1">
                      {transacoesAmanha.filter(t => t.tipo === 'receita').slice(0, 2).map(t => (
                        <p key={t.id} className="text-xs font-medium text-gray-200 truncate">• {t.descricao}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Eventos */}
                <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-orange-400" /> Agenda</span>
                    <span className="text-xs font-black text-orange-400">{eventosAmanha.length}</span>
                  </div>
                  {eventosAmanha.length === 0 ? (
                    <p className="text-xs text-gray-400">Nenhum evento agendado.</p>
                  ) : (
                    <div className="space-y-1">
                      {eventosAmanha.slice(0, 2).map(ev => (
                        <p key={ev.id} className="text-xs font-medium text-gray-200 truncate">• {ev.cliente_nome}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Eventos do Período */}
            <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200/50 dark:border-white/5 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-150 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">Próximos Eventos</h3>
                </div>
                <button 
                  onClick={() => navigate('/dashboard/agenda')} 
                  className="text-xs font-bold text-blue-600 hover:text-blue-500 uppercase tracking-wider flex items-center gap-1"
                >
                  Ver todos
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {eventos.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs font-medium">
                  Sem compromissos no período
                </div>
              ) : (
                <div className="divide-y divide-gray-150 dark:divide-white/5 max-h-60 overflow-y-auto">
                  {eventos.map(ev => (
                    <div 
                      key={ev.id} 
                      onClick={() => navigate('/dashboard/agenda')}
                      className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-white/2 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="text-center w-8 shrink-0">
                          <p className="text-sm font-black text-blue-600">{new Date(ev.data_evento + 'T12:00:00').getDate()}</p>
                          <p className="text-[9px] text-gray-400 uppercase font-bold -mt-0.5">{new Date(ev.data_evento + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' })}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800 dark:text-gray-200 text-xs truncate">{ev.cliente_nome}</p>
                          <p className="text-[10px] text-gray-400 truncate">{ev.tipo_evento}{ev.cidade ? ` • ${ev.cidade}` : ''}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${statusColor(ev.status)}`}>
                        {ev.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financeiro do Período */}
            <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200/50 dark:border-white/5 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-150 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">Caixa Recente</h3>
                </div>
                <button 
                  onClick={() => navigate('/dashboard/empresa-transacoes')} 
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-500 uppercase tracking-wider flex items-center gap-1"
                >
                  Ir para Caixa
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {transacoes.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs font-medium">
                  Sem movimentações no período
                </div>
              ) : (
                <div className="divide-y divide-gray-150 dark:divide-white/5 max-h-64 overflow-y-auto">
                  {transacoes.map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => navigate('/dashboard/empresa-transacoes')}
                      className="px-6 py-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-white/2 cursor-pointer transition-all"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-gray-800 dark:text-gray-200 text-xs truncate">{t.descricao}</p>
                        <p className="text-[10px] text-gray-400">{fmt(t.data)}</p>
                      </div>
                      
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <span className={`text-xs font-black ${
                          t.tipo === 'receita' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                        }`}>
                          {t.tipo === 'despesa' ? '- ' : '+ '}{fmtCurrency(t.valor)}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${statusColor(t.status)}`}>
                          {t.status === 'pago' ? 'pago' : 'pend'}
                        </span>
                      </div>
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
