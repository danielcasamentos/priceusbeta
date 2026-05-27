import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Calendar, DollarSign, CheckSquare, Clock, Sun, RefreshCw,
  Zap, ChevronRight, Filter, Plus, ArrowRight, TrendingDown,
  TrendingUp, Target, Trash2, BarChart2, MessageCircle, Users,
  Share2, Link, AlertCircle, Star, Sliders, X,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface MeuDiaProps { userId: string; }
type Periodo = 'hoje' | 'semana' | 'mes' | 'ano' | 'custom';
type FiltroUrgencia = 'todos' | 'atrasadas' | 'hoje' | 'amanha' | 'depois_amanha' | 'futuras';
type GrowthTab = 'sazonal' | 'clientes' | 'whatsapp' | 'redes' | 'parcerias';

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
interface CompanyTask {
  id: string; descricao: string;
  prioridade: 'baixa' | 'media' | 'alta';
  data_limite?: string | null; concluida: boolean;
  concluida_em?: string | null; created_at: string;
}
interface CashflowPeriod {
  entradas: number; entradasPendentes: number;
  saidas: number; lucro: number;
}
interface Cashflow {
  hoje: CashflowPeriod; semana: CashflowPeriod;
  mes: CashflowPeriod; futuro: CashflowPeriod;
}
interface SeasonalEvent {
  data: string; nome: string; daysAway: number;
  dica: string; emoji: string; urgency: 'high' | 'medium' | 'low';
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmt(d: string) {
  if (!d) return '';
  const p = new Date(d + 'T12:00:00');
  if (isNaN(p.getTime())) return '';
  return p.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function fmtK(v: number) {
  if (Math.abs(v) >= 10000)
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v);
  return fmtCurrency(v);
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
    const dias = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(prazo + 'T00:00:00').getTime()) / 86400000);
    return { texto: `Atrasada há ${dias}d`, colorClass: 'text-red-600 dark:text-red-400', dotColor: 'bg-red-500 animate-pulse', urgencia: 'atrasadas' };
  }
  if (prazo === hoje) return { texto: 'Vence hoje!', colorClass: 'text-amber-600 dark:text-amber-400', dotColor: 'bg-amber-400 animate-pulse', urgencia: 'hoje' };
  if (prazo === amanha) return { texto: 'Amanhã', colorClass: 'text-orange-500 dark:text-orange-400', dotColor: 'bg-orange-400', urgencia: 'amanha' };
  if (prazo === depoisAmanha) return { texto: 'Depois de amanhã', colorClass: 'text-violet-500 dark:text-violet-400', dotColor: 'bg-violet-400', urgencia: 'depois_amanha' };
  const dias = Math.round((new Date(prazo + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
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
  return { start: customStart, end: customEnd, label: `${fmt(customStart) || '...'} – ${fmt(customEnd) || '...'}` };
}

function calcCashflowPeriod(transacoes: Transacao[], start: string, end: string): CashflowPeriod {
  const inRange = transacoes.filter(t => t.data >= start && t.data <= end);
  const entradas = inRange.filter(t => t.tipo === 'receita' && t.status === 'pago').reduce((s, t) => s + t.valor, 0);
  const entradasPendentes = inRange.filter(t => t.tipo === 'receita' && t.status === 'pendente').reduce((s, t) => s + t.valor, 0);
  const saidas = inRange.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);
  return { entradas, entradasPendentes, saidas, lucro: entradas - saidas };
}

// ─────────────────────────────────────────────────────────────────────────────
// Seasonal Events
// ─────────────────────────────────────────────────────────────────────────────
function getUpcomingSeasonalEvents(): SeasonalEvent[] {
  const now = new Date();
  const today = dateStr(now);
  const year = now.getFullYear();

  function getNthSunday(y: number, month: number, n: number): Date {
    const d = new Date(y, month - 1, 1);
    let count = 0;
    while (count < n) {
      if (d.getDay() === 0) count++;
      if (count < n) d.setDate(d.getDate() + 1);
    }
    return d;
  }

  const fixedEvents = [
    { month: 6, day: 12, nome: 'Dia dos Namorados', emoji: '❤️', dica: 'Sessões de casal e pedidos de casamento. Crie um pacote especial com desconto de reserva antecipada e anuncie 3 semanas antes!' },
    { month: 8, day: 19, nome: 'Dia do Fotógrafo', emoji: '📷', dica: 'Compartilhe sua história nas redes, mostre bastidores emocionantes e peça indicações aos seus melhores clientes com uma mensagem personalizada.' },
    { month: 10, day: 12, nome: 'Dia das Crianças', emoji: '👶', dica: 'Mini-sessions temáticas de 30min são perfeitas: alta lucratividade, tempo reduzido. Ofereça 6-8 horários em um único dia para maximizar o faturamento!' },
    { month: 10, day: 31, nome: 'Halloween', emoji: '🎃', dica: 'Ensaios temáticos de Halloween são virais no Instagram e TikTok. Conteúdo de bastidores gera muito alcance orgânico — ótima vitrine do seu estilo!' },
    { month: 12, day: 25, nome: 'Natal e Festas de Fim de Ano', emoji: '🎄', dica: 'Sessões de família e cartões de Natal: comece a divulgar em outubro. Clientes antigos são seu público mais fácil de reconverter nessa data!' },
  ];

  const dynamicEvents = [
    { month: 5, n: 2, nome: 'Dia das Mães', emoji: '👩‍👧', dica: 'Ensaios de mãe e filho são os mais compartilhados do Instagram. Lance um mini-session exclusivo 3 semanas antes — é um dos meses com maior demanda para ensaios!' },
    { month: 8, n: 2, nome: 'Dia dos Pais', emoji: '👨‍👦', dica: 'Ensaios de pai e filho criam memórias únicas. Promova mini-sessions e kits de presente com álbum impresso — aumenta o ticket médio significativamente.' },
  ];

  const candidates: { dateStr: string; nome: string; emoji: string; dica: string }[] = [];

  for (const ev of fixedEvents) {
    for (const y of [year, year + 1]) {
      const d = dateStr(new Date(y, ev.month - 1, ev.day));
      if (d >= today) { candidates.push({ dateStr: d, nome: ev.nome, emoji: ev.emoji, dica: ev.dica }); break; }
    }
  }

  for (const ev of dynamicEvents) {
    for (const y of [year, year + 1]) {
      const d = dateStr(getNthSunday(y, ev.month, ev.n));
      if (d >= today) { candidates.push({ dateStr: d, nome: ev.nome, emoji: ev.emoji, dica: ev.dica }); break; }
    }
  }

  return candidates
    .map(c => {
      const daysAway = Math.ceil((new Date(c.dateStr + 'T12:00:00').getTime() - new Date(today + 'T12:00:00').getTime()) / 86400000);
      return { data: c.dateStr, nome: c.nome, daysAway, dica: c.dica, emoji: c.emoji, urgency: (daysAway <= 21 ? 'high' : daysAway <= 45 ? 'medium' : 'low') as SeasonalEvent['urgency'] };
    })
    .filter(e => e.daysAway >= 0 && e.daysAway <= 90)
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, 5);
}

// ─────────────────────────────────────────────────────────────────────────────
// Growth Hub Tips Content
// ─────────────────────────────────────────────────────────────────────────────
const GROWTH_TIPS: Record<Exclude<GrowthTab, 'sazonal'>, { emoji: string; titulo: string; dica: string; tag: string }[]> = {
  clientes: [
    { emoji: '📋', titulo: 'Mapeie os inativos', dica: 'Liste todos os clientes de 1-2 anos atrás que não voltaram. Um simples "Oi [nome], passando para te desejar um ótimo dia!" quebra o gelo e reabre a conversa.', tag: 'Reativação' },
    { emoji: '💍', titulo: 'Aniversário de casamento', dica: '"Feliz 1 ano! Que tal registrar essa data novamente com um ensaio especial?" — Casais ficam emocionados com a atenção. Ensaio de aniversário tem alto ticket e baixo custo de aquisição.', tag: 'LTV' },
    { emoji: '📸', titulo: 'Venda álbuns físicos', dica: 'A maioria dos clientes guarda as fotos só no celular. "Sabia que criamos álbuns premium personalizados? Suas fotos merecem ser expostas!" Ticket de R$800 a R$3.500.', tag: 'Upsell' },
    { emoji: '🎂', titulo: 'Maternidade / Newborn', dica: 'Para clientes de casamento de 1-2 anos atrás: "Pronto para as fotos do bebê?" — O timing é perfeito. Esse cross-sell tem taxa de conversão altíssima pois já há confiança.', tag: 'Cross-sell' },
    { emoji: '⭐', titulo: 'Peça indicações diretas', dica: '"Você tem alguma amiga noivando ou querendo fazer um ensaio? Você ganha 10% de desconto no próximo ensaio por cada indicação que fechar contrato comigo!"', tag: 'Referral' },
    { emoji: '📱', titulo: 'Lista VIP no WhatsApp', dica: 'Crie uma lista de transmissão com seus 30-50 melhores clientes. Envie novidades exclusivas, mini-sessions surpresa e promoções de aniversário de contrato — sem custo algum.', tag: 'Fidelização' },
  ],
  whatsapp: [
    { emoji: '👋', titulo: 'Script: Primeiro contato', dica: '"Olá [Nome]! 😊 Vi que você entrou em contato sobre fotos para [evento]. Adoro registrar momentos assim! Posso te enviar algumas informações sobre meu trabalho e disponibilidade?"', tag: 'Abordagem' },
    { emoji: '🔄', titulo: 'Script: Reativação (3-7 dias)', dica: '"Oi [Nome]! Ainda pensando no ensaio? 📸 Tenho uma data disponível no próximo fim de semana que pode ser perfeita. Quero muito registrar esse momento com você!"', tag: 'Follow-up' },
    { emoji: '💫', titulo: 'Script: Urgência com escassez', dica: '"[Nome], tenho só 2 datas livres em [mês]. Clientes que reservam com antecedência garantem [benefício: desconto/brinde/sessão extra]. Quer confirmar a sua antes de fechar?"', tag: 'Conversão' },
    { emoji: '🌟', titulo: 'Status diário estratégico', dica: 'Publique no Status todo dia: fotos de clientes satisfeitos, bastidores, transformações e depoimentos. Quem vê o status todo dia compra com muito mais facilidade. Consistência = receita.', tag: 'Orgânico' },
    { emoji: '🎯', titulo: 'Script: Pós-entrega (indicação)', dica: '"[Nome], acabei de enviar suas fotos! 🥰 Ficaram incríveis! Se gostar e quiser indicar alguém, você ganha [benefício]. E amaria um depoimento seu para compartilhar!"', tag: 'Pós-venda' },
    { emoji: '📢', titulo: 'Grupo VIP de clientes', dica: 'Crie um grupo "Família [Seu Nome]" com seus melhores clientes. Compartilhe novidades, peça feedback e gere comunidade. Clientes de grupo fecham novas sessões 2x mais rápido.', tag: 'Comunidade' },
  ],
  redes: [
    { emoji: '🎬', titulo: 'Reels: Antes e depois', dica: 'Mostre a transformação da edição em 30 segundos. "RAW vs Editado" é o conteúdo mais salvo e compartilhado para fotógrafos. No TikTok, esse formato gera virais com facilidade.', tag: 'Viral' },
    { emoji: '🎥', titulo: 'Bastidores do ensaio', dica: '"Um dia na vida de fotógrafo" gera identificação e humaniza sua marca. Mostre a montagem do equipamento, direção de poses e a reação emocional do cliente no final.', tag: 'Humanização' },
    { emoji: '📖', titulo: 'Carrossel educativo', dica: '"5 coisas para preparar antes do seu ensaio comigo" — Carrosséis educativos têm 3× mais saves que fotos simples e constroem autoridade. Cada save é um sinal de intenção de compra.', tag: 'Autoridade' },
    { emoji: '⏰', titulo: 'Horários de pico', dica: 'Instagram: 18h–21h (seg-sex) e 10h–12h (sáb). TikTok: 19h–22h. Poste nos horários de maior atividade do seu público para maximizar o alcance e as interações orgânicas.', tag: 'Algoritmo' },
    { emoji: '#️⃣', titulo: 'SEO local e hashtags', dica: 'Use: #fotografo[SuaCidade] #fotografodecasamento #ensaiocasal + 5 hashtags de nicho. Coloque palavras-chave na bio: "Fotógrafo de casamento em [Cidade] — [seu diferencial]".', tag: 'Descoberta' },
    { emoji: '🤝', titulo: 'Collabs e co-criação', dica: 'Faça posts em Collab com noivados, salões de beleza e maquiadoras. O conteúdo aparece para o público dos dois perfis simultaneamente — alcance duplo com o mesmo esforço.', tag: 'Parceria' },
  ],
  parcerias: [
    { emoji: '💒', titulo: 'Cerimonialistas e Wedding Planners', dica: 'Ofereça indicação mútua com comissão de 5-10% por contrato fechado. Construa relacionamento de confiança — eles indicam para dezenas de casais anualmente. Alta alavancagem.', tag: 'Alto impacto' },
    { emoji: '🍽️', titulo: 'Buffets e salões de festa', dica: 'Peça para expor um álbum físico do seu trabalho no espaço deles. Quando clientes visitam para fechar o buffet, veem seu portfólio naturalmente. Custo zero, visibilidade alta.', tag: 'Visibilidade' },
    { emoji: '👗', titulo: 'Lojas de noiva e vestidos', dica: '"Posso fotografar vestidos e noivas para o Instagram de vocês gratuitamente em troca de indicações aos clientes." Troca de valor sem investimento financeiro — muito eficiente.', tag: 'Troca' },
    { emoji: '🌸', titulo: 'Decoradores e floristas', dica: 'Crie portfólio colaborativo: fotografe os trabalhos deles com autorização e eles te indicam. Conteúdo de qualidade para todos + exposição cruzada para exatamente o mesmo público.', tag: 'Conteúdo' },
    { emoji: '🏨', titulo: 'Hotéis e pousadas', dica: '"Pacote Lua de Mel com Ensaio Incluso" — parceria com hotéis para casais. Você oferece ensaio de 1h no local, eles vendem mais. Contratos fechados sem custo de marketing.', tag: 'Pacote' },
    { emoji: '📝', titulo: 'Script de abordagem B2B', dica: '"Olá [Nome], admiro muito o trabalho de vocês! Creio que atendemos o mesmo público e poderíamos crescer juntos. Podemos conversar 15 min sobre uma parceria estratégica?"', tag: 'Prospecção' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export function MeuDia({ userId }: MeuDiaProps) {
  const navigate = useNavigate();

  // ── Period ─────────────────────────────────────────────────────────────────
  const [periodo, setPeriodo] = useState<Periodo>('hoje');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [filtroUrgencia, setFiltroUrgencia] = useState<FiltroUrgencia>('todos');

  // ── CRM data ───────────────────────────────────────────────────────────────
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [tarefas, setTarefas] = useState<TarefaWorkflow[]>([]);
  const [tarefasConcluidas, setTarefasConcluidas] = useState<TarefaWorkflow[]>([]);
  const [eventosAmanha, setEventosAmanha] = useState<EventoAgenda[]>([]);
  const [transacoesAmanha, setTransacoesAmanha] = useState<Transacao[]>([]);
  const [tarefasAmanha, setTarefasAmanha] = useState<TarefaWorkflow[]>([]);
  const [receitaMes, setReceitaMes] = useState(0);
  const [receitaAno, setReceitaAno] = useState(0);

  // ── Company Tasks (new) ───────────────────────────────────────────────────
  const [companyTasks, setCompanyTasks] = useState<CompanyTask[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [taskFilter, setTaskFilter] = useState<'pendentes' | 'todas'>('pendentes');

  // ── Cashflow & Profile (new) ──────────────────────────────────────────────
  const [cashflowTr, setCashflowTr] = useState<Transacao[]>([]);
  const [lucroDesejado, setLucroDesejado] = useState(3000);

  // ── Growth Hub (new) ──────────────────────────────────────────────────────
  const [growthTab, setGrowthTab] = useState<GrowthTab>('sazonal');

  // ── ROI Simulator (new) ───────────────────────────────────────────────────
  const [roiInvestimento, setRoiInvestimento] = useState(1000);
  const [roiTicket, setRoiTicket] = useState(5000);
  const [roiConversao, setRoiConversao] = useState(8);

  const range = getRangeForPeriodo(periodo, customStart, customEnd);

  // ── Main Load ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const hoje = getToday();
    const amanha = getAmanha();
    const todayObj = new Date();
    const inicioMes = `${todayObj.getFullYear()}-${pad(todayObj.getMonth() + 1)}-01`;
    const inicioAno = `${todayObj.getFullYear()}-01-01`;
    const fim3Meses = dateStr(new Date(todayObj.getFullYear(), todayObj.getMonth() + 4, 0));

    try {
      let evQuery = supabase.from('eventos_agenda').select('*').eq('user_id', userId);
      if (range.start?.trim()) evQuery = evQuery.gte('data_evento', range.start);
      if (range.end?.trim()) evQuery = evQuery.lte('data_evento', range.end);
      evQuery = evQuery.order('data_evento');

      let trQuery = supabase.from('company_transactions').select('*').eq('user_id', userId);
      if (range.start?.trim()) trQuery = trQuery.gte('data', range.start);
      if (range.end?.trim()) trQuery = trQuery.lte('data', range.end);
      trQuery = trQuery.order('data');

      const [evRes, trRes, leadsRes, evAmanhaRes, trAmanhaRes, trMesRes, trAnoRes, cashflowRes, profileRes] =
        await Promise.all([
          evQuery,
          trQuery,
          supabase.from('leads').select('id, nome_cliente, workflow').eq('user_id', userId).eq('status', 'convertido'),
          supabase.from('eventos_agenda').select('*').eq('user_id', userId).eq('data_evento', amanha),
          supabase.from('company_transactions').select('*').eq('user_id', userId).eq('data', amanha),
          supabase.from('company_transactions').select('valor, tipo, status').eq('user_id', userId).gte('data', inicioMes).lte('data', hoje),
          supabase.from('company_transactions').select('valor, tipo, status').eq('user_id', userId).gte('data', inicioAno).lte('data', hoje),
          supabase.from('company_transactions').select('id, descricao, valor, data, status, tipo').eq('user_id', userId).gte('data', inicioMes).lte('data', fim3Meses).order('data'),
          supabase.from('profiles').select('lucro_desejado').eq('id', userId).maybeSingle(),
        ]);

      setEventos(evRes.data || []);
      setTransacoes(trRes.data || []);
      setEventosAmanha(evAmanhaRes.data || []);
      setTransacoesAmanha(trAmanhaRes.data || []);
      setCashflowTr((cashflowRes.data as Transacao[]) || []);

      const pd = profileRes.data as { lucro_desejado?: number } | null;
      if (pd?.lucro_desejado) setLucroDesejado(pd.lucro_desejado);

      const calcReceita = (rows: { tipo: string; status: string; valor: number }[]) =>
        rows.filter(t => t.tipo === 'receita' && t.status === 'pago').reduce((s, t) => s + (t.valor || 0), 0);
      setReceitaMes(calcReceita((trMesRes.data as { tipo: string; status: string; valor: number }[]) || []));
      setReceitaAno(calcReceita((trAnoRes.data as { tipo: string; status: string; valor: number }[]) || []));

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
  }, [userId, range.start, range.end, periodo]);

  const loadCompanyTasks = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('company_tasks').select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setCompanyTasks((data as CompanyTask[]) || []);
    } catch { setCompanyTasks([]); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCompanyTasks(); }, [loadCompanyTasks]);

  // ── Company Task CRUD ──────────────────────────────────────────────────────
  const addTask = useCallback(async () => {
    const text = newTaskText.trim();
    if (!text) return;
    try {
      const { data, error } = await supabase
        .from('company_tasks')
        .insert({ user_id: userId, descricao: text, prioridade: 'media', concluida: false })
        .select().single();
      if (!error && data) {
        setCompanyTasks(prev => [data as CompanyTask, ...prev]);
        setNewTaskText('');
      }
    } catch { /* table may not exist yet */ }
  }, [newTaskText, userId]);

  const toggleTask = useCallback(async (id: string, current: boolean) => {
    const next = !current;
    setCompanyTasks(prev => prev.map(t => t.id === id ? { ...t, concluida: next } : t));
    try {
      await supabase.from('company_tasks').update({
        concluida: next, concluida_em: next ? new Date().toISOString() : null,
      }).eq('id', id).eq('user_id', userId);
    } catch { }
  }, [userId]);

  const deleteTask = useCallback(async (id: string) => {
    setCompanyTasks(prev => prev.filter(t => t.id !== id));
    try { await supabase.from('company_tasks').delete().eq('id', id).eq('user_id', userId); } catch { }
  }, [userId]);

  // ── Computed: Cashflow Matrix ──────────────────────────────────────────────
  const cashflow = useMemo((): Cashflow => {
    const hoje = getToday();
    const todayObj = new Date();
    const day = todayObj.getDay();
    const mon = new Date(todayObj); mon.setDate(todayObj.getDate() - day + (day === 0 ? -6 : 1));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const inicioMes = `${todayObj.getFullYear()}-${pad(todayObj.getMonth() + 1)}-01`;
    const fimMes = dateStr(new Date(todayObj.getFullYear(), todayObj.getMonth() + 1, 0));
    const inicioFuturo = dateStr(new Date(todayObj.getFullYear(), todayObj.getMonth() + 1, 1));
    const fim3Meses = dateStr(new Date(todayObj.getFullYear(), todayObj.getMonth() + 4, 0));
    return {
      hoje: calcCashflowPeriod(cashflowTr, hoje, hoje),
      semana: calcCashflowPeriod(cashflowTr, dateStr(mon), dateStr(sun)),
      mes: calcCashflowPeriod(cashflowTr, inicioMes, fimMes),
      futuro: calcCashflowPeriod(cashflowTr, inicioFuturo, fim3Meses),
    };
  }, [cashflowTr]);

  const metaProgress = useMemo(() => {
    if (lucroDesejado <= 0) return 0;
    return Math.min(150, Math.max(0, (cashflow.mes.lucro / lucroDesejado) * 100));
  }, [cashflow.mes.lucro, lucroDesejado]);

  // ── Computed: ROI ──────────────────────────────────────────────────────────
  const roiCalc = useMemo(() => {
    const cpl = Math.max(20, roiTicket * 0.008);
    const leads = Math.floor(roiInvestimento / cpl);
    const contratos = Math.round(leads * (roiConversao / 100) * 10) / 10;
    const faturamento = Math.round(contratos * roiTicket);
    const roi = roiInvestimento > 0 ? ((faturamento - roiInvestimento) / roiInvestimento) * 100 : 0;
    return { leads, contratos, faturamento, roi };
  }, [roiInvestimento, roiTicket, roiConversao]);

  const seasonalEvents = useMemo(() => getUpcomingSeasonalEvents(), []);

  // ── Computed: Productivity & Urgency ──────────────────────────────────────
  const produtividade = useMemo(() => {
    const hoje = getToday();
    const todayObj = new Date();
    const day = todayObj.getDay();
    const mon = new Date(todayObj); mon.setDate(todayObj.getDate() - day + (day === 0 ? -6 : 1));
    const inicioSemana = dateStr(mon);
    const hojeCount = tarefasConcluidas.filter(t => t.completedAt?.startsWith(hoje)).length;
    const semanaCount = tarefasConcluidas.filter(t => {
      if (!t.completedAt) return false;
      const d = t.completedAt.split('T')[0];
      return d >= inicioSemana && d <= hoje;
    }).length;
    return { hoje: hojeCount, semana: semanaCount, total: tarefasConcluidas.length };
  }, [tarefasConcluidas]);

  const agrupamento = useMemo(() => {
    const hoje = getToday(); const amanha = getAmanha(); const depoisAmanha = getDepoisAmanha();
    return {
      atrasadas: tarefas.filter(t => t.prazo && t.prazo < hoje),
      hoje: tarefas.filter(t => t.prazo === hoje),
      amanha: tarefas.filter(t => t.prazo === amanha),
      depois_amanha: tarefas.filter(t => t.prazo === depoisAmanha),
      futuras: tarefas.filter(t => !t.prazo || t.prazo > depoisAmanha),
    };
  }, [tarefas]);

  const insights = useMemo(() => {
    const totalPendentes = tarefas.length;
    const totalConcluidas = tarefasConcluidas.length;
    const totalGeral = totalPendentes + totalConcluidas;
    const taxaConclusao = totalGeral > 0 ? Math.round((totalConcluidas / totalGeral) * 100) : 100;
    const atrasadasCount = agrupamento.atrasadas.length;
    const hojeCount = agrupamento.hoje.length;
    let score = 100;
    score -= Math.min(atrasadasCount * 12, 50);
    score -= Math.min(hojeCount * 4, 20);
    score = Math.max(score, 0);
    let saudeLabel: string, saudeColor: string, saudeEmoji: string;
    if (score >= 80) { saudeLabel = 'Saudável'; saudeColor = 'text-emerald-600 dark:text-emerald-400'; saudeEmoji = '💚'; }
    else if (score >= 50) { saudeLabel = 'Atenção'; saudeColor = 'text-amber-600 dark:text-amber-400'; saudeEmoji = '🟡'; }
    else { saudeLabel = 'Crítico'; saudeColor = 'text-red-600 dark:text-red-400'; saudeEmoji = '🔴'; }
    const msgs: { emoji: string; texto: string }[] = [];
    if (atrasadasCount > 0) msgs.push({ emoji: '⚠️', texto: `${atrasadasCount} tarefa${atrasadasCount > 1 ? 's atrasadas' : ' atrasada'}. Priorize agora para não impactar clientes.` });
    if (hojeCount > 0 && atrasadasCount === 0) msgs.push({ emoji: '⚡', texto: `${hojeCount} tarefa${hojeCount > 1 ? 's vencem' : ' vence'} hoje. Comece pelas mais rápidas.` });
    if (produtividade.hoje > 0) msgs.push({ emoji: '✅', texto: `Você já concluiu ${produtividade.hoje} tarefa${produtividade.hoje > 1 ? 's' : ''} hoje. Ótimo ritmo!` });
    else if (atrasadasCount === 0 && hojeCount === 0 && totalPendentes > 0) msgs.push({ emoji: '🌟', texto: 'Tarefas em dia. Antecipe as de amanhã para aliviar a semana.' });
    if (totalPendentes === 0) msgs.push({ emoji: '🎉', texto: 'Nenhuma tarefa pendente no período. Aproveite para planejar os próximos passos!' });
    if (receitaMes > 0 && msgs.length < 3) msgs.push({ emoji: '💰', texto: `${fmtCurrency(receitaMes)} confirmados este mês.${receitaAno > receitaMes ? ` Total no ano: ${fmtCurrency(receitaAno)}.` : ''}` });
    return { score, taxaConclusao, saudeLabel, saudeColor, saudeEmoji, msgs: msgs.slice(0, 3) };
  }, [tarefas, tarefasConcluidas, agrupamento, produtividade.hoje, receitaMes, receitaAno]);

  const tarefasFiltradas = useMemo(() => {
    if (filtroUrgencia === 'todos') return tarefas;
    return tarefas.filter(t => prazoInfo(t.prazo).urgencia === filtroUrgencia);
  }, [tarefas, filtroUrgencia]);

  const filteredCompanyTasks = useMemo(() =>
    taskFilter === 'pendentes' ? companyTasks.filter(t => !t.concluida) : companyTasks,
    [companyTasks, taskFilter]);

  const receitasPagas = transacoes.filter(t => t.tipo === 'receita' && t.status === 'pago').reduce((s, t) => s + t.valor, 0);
  const receitasPendentes = transacoes.filter(t => t.tipo === 'receita' && t.status === 'pendente').reduce((s, t) => s + t.valor, 0);
  const despesasPeriodo = transacoes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);
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

  const filtros = [
    { id: 'atrasadas' as FiltroUrgencia, label: 'Atrasadas', count: agrupamento.atrasadas.length, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30' },
    { id: 'hoje' as FiltroUrgencia, label: 'Hoje', count: agrupamento.hoje.length, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30' },
    { id: 'amanha' as FiltroUrgencia, label: 'Amanhã', count: agrupamento.amanha.length, color: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/30' },
    { id: 'depois_amanha' as FiltroUrgencia, label: 'Depois', count: agrupamento.depois_amanha.length, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-800/30' },
    { id: 'futuras' as FiltroUrgencia, label: 'Futuras', count: agrupamento.futuras.length, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30' },
  ];

  const growthTabs: { id: GrowthTab; label: string; icon: React.ElementType; emoji: string }[] = [
    { id: 'sazonal', label: 'Sazonalidade', icon: Calendar, emoji: '📅' },
    { id: 'clientes', label: 'Clientes Antigos', icon: Users, emoji: '♻️' },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, emoji: '💬' },
    { id: 'redes', label: 'Redes Sociais', icon: Share2, emoji: '📱' },
    { id: 'parcerias', label: 'Parcerias B2B', icon: Link, emoji: '🤝' },
  ];

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-12">

      {/* ── Header ── */}
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
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0a1628] border border-gray-200 dark:border-white/5 rounded-xl hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.03)] hover:shadow-sm active:scale-95 transition-all">
          <RefreshCw className="w-4 h-4 text-gray-500" />
          Atualizar
        </button>
      </div>

      {/* ── Filtros de Período ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap bg-gray-100/80 dark:bg-[#07101f] p-1.5 rounded-2xl border border-gray-250/20">
          {periodos.map(p => (
            <button key={p.id} onClick={() => setPeriodo(p.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${periodo === p.id
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'}`}>
              {p.label}
            </button>
          ))}
        </div>
        {periodo === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-[#0a1628] p-2 rounded-2xl border border-gray-250/25">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 dark:border-white/5 dark:bg-[#07101f] dark:text-white rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 outline-none" />
            <span className="text-gray-400 text-xs font-bold uppercase">até</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 dark:border-white/5 dark:bg-[#07101f] dark:text-white rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 outline-none" />
          </div>
        )}
      </div>

      {/* ── Health Banner ── */}
      <div className="bg-gradient-to-r from-gray-900 via-slate-900 to-zinc-900 text-white rounded-3xl p-6 sm:p-8 border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold tracking-wider text-orange-400 uppercase">
              <Zap className="w-3 h-3 text-orange-400 animate-pulse" />
              Painel de Desempenho
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">Como está o seu negócio hoje?</h3>
            <div className="space-y-2 mt-4">
              {insights.msgs.map((m, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/5 backdrop-blur-sm p-3 rounded-xl border border-white/5">
                  <span className="text-lg leading-none shrink-0">{m.emoji}</span>
                  <p className="text-sm text-gray-300 font-medium leading-relaxed">{m.texto}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-center bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 text-center w-full md:w-56">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Índice de Saúde</p>
            <div className="relative w-28 h-28 flex items-center justify-center">
              <div className={`absolute inset-0 rounded-full blur-lg opacity-25 ${insights.score >= 80 ? 'bg-emerald-500' : insights.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} />
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" className="stroke-white/10 fill-none" strokeWidth="8" />
                <circle cx="56" cy="56" r="48" className={`fill-none transition-all duration-1000 ${insights.score >= 80 ? 'stroke-emerald-500' : insights.score >= 50 ? 'stroke-amber-500' : 'stroke-red-500'}`}
                  strokeWidth="8" strokeDasharray={2 * Math.PI * 48} strokeDashoffset={2 * Math.PI * 48 * (1 - insights.score / 100)} strokeLinecap="round" />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-black tracking-tight">{insights.score}%</span>
                <span className="text-[10px] font-bold uppercase text-gray-400 mt-0.5">{insights.saudeLabel}</span>
              </div>
            </div>
            <div className="w-full mt-4 flex items-center gap-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Conclusões</span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full transition-all duration-700" style={{ width: `${insights.taxaConclusao}%` }} />
              </div>
              <span className="text-xs font-black">{insights.taxaConclusao}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cashflow Matrix (NEW) ── */}
      <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200/50 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/5 bg-gradient-to-r from-emerald-50/50 to-teal-50/30 dark:from-emerald-900/10 dark:to-teal-900/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/15 rounded-xl">
              <BarChart2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 dark:text-white text-sm">💰 Fluxo de Caixa Consolidado</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Entradas, saídas e lucro líquido por período</p>
            </div>
          </div>
          {/* Monthly goal progress */}
          <div className="flex items-center gap-3 mt-3 sm:mt-0 min-w-[200px]">
            <div className="flex-1">
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span className="font-bold uppercase tracking-wider">Meta Mensal</span>
                <span className="font-black">{Math.round(metaProgress)}% de {fmtK(lucroDesejado)}</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${metaProgress >= 100 ? 'bg-emerald-500' : metaProgress >= 60 ? 'bg-amber-400' : 'bg-orange-500'}`}
                  style={{ width: `${Math.min(100, metaProgress)}%` }}
                />
              </div>
              {metaProgress >= 100 && <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">🎉 Meta atingida!</p>}
            </div>
          </div>
        </div>

        {/* Matrix Grid */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5">
                <th className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Período</th>
                {[
                  { label: '☀️ Hoje', period: cashflow.hoje },
                  { label: '📅 Semana', period: cashflow.semana },
                  { label: '🗓️ Este Mês', period: cashflow.mes },
                  { label: '🔮 Próx. 3 Meses', period: cashflow.futuro },
                ].map(col => (
                  <th key={col.label} className="px-4 py-3 text-center text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Entradas (pagas) */}
              <tr className="border-b border-gray-50 dark:border-white/3 hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">⬆️ Entradas</span>
                  </div>
                </td>
                {[cashflow.hoje, cashflow.semana, cashflow.mes, cashflow.futuro].map((p, i) => (
                  <td key={i} className="px-4 py-4 text-center">
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{fmtK(p.entradas)}</p>
                    {p.entradasPendentes > 0 && (
                      <p className="text-[10px] text-amber-500 font-semibold mt-0.5">+{fmtK(p.entradasPendentes)} pend.</p>
                    )}
                  </td>
                ))}
              </tr>
              {/* Saídas */}
              <tr className="border-b border-gray-50 dark:border-white/3 hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">⬇️ Saídas</span>
                  </div>
                </td>
                {[cashflow.hoje, cashflow.semana, cashflow.mes, cashflow.futuro].map((p, i) => (
                  <td key={i} className="px-4 py-4 text-center">
                    <p className="text-sm font-black text-red-500 dark:text-red-400">{fmtK(p.saidas)}</p>
                  </td>
                ))}
              </tr>
              {/* Lucro Líquido */}
              <tr className="bg-gradient-to-r from-gray-50/80 to-transparent dark:from-white/3 dark:to-transparent">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-black text-gray-700 dark:text-gray-200">💎 Lucro Líq.</span>
                  </div>
                </td>
                {[cashflow.hoje, cashflow.semana, cashflow.mes, cashflow.futuro].map((p, i) => (
                  <td key={i} className="px-4 py-4 text-center">
                    <p className={`text-sm font-black ${p.lucro >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                      {fmtK(p.lucro)}
                    </p>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Ações Rápidas ── */}
      <div className="bg-white dark:bg-[#0a1628] rounded-3xl p-6 border border-gray-200/50 dark:border-white/5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-500" />Ações Rápidas do CRM
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Novo Lead', sub: 'Cadastrar contato comercial', color: 'from-indigo-500 to-blue-600', shadow: 'shadow-indigo-500/20', route: '/dashboard/leads?new=true' },
            { label: 'Nova Transação', sub: 'Lançar receita ou despesa', color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20', route: '/dashboard/empresa-transacoes?new=true' },
            { label: 'Novo Compromisso', sub: 'Agendar ensaio ou reunião', color: 'from-orange-500 to-amber-600', shadow: 'shadow-orange-500/20', route: '/dashboard/agenda?new=true' },
          ].map(btn => (
            <button key={btn.label} onClick={() => navigate(btn.route)}
              className={`flex items-center justify-between p-4 bg-gradient-to-br ${btn.color} text-white rounded-2xl hover:shadow-lg hover:${btn.shadow} active:scale-98 transition-all group`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl"><Plus className="w-5 h-5" /></div>
                <div className="text-left">
                  <p className="font-bold text-sm">{btn.label}</p>
                  <p className="text-[10px] text-white/70 font-medium">{btn.sub}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Calendar, label: 'Eventos', value: String(eventos.length), sub: `${eventos.filter(e => e.status === 'confirmado').length} confirmados`, iconBg: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30', route: '/dashboard/agenda' },
          { icon: DollarSign, label: 'Recebido', value: fmtK(receitasPagas), sub: `${fmtK(receitasPendentes)} pendente`, iconBg: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30', route: '/dashboard/empresa-transacoes' },
          { icon: TrendingDown, label: 'Despesas', value: fmtK(despesasPeriodo), sub: `${transacoes.filter(t => t.tipo === 'despesa').length} lançamentos`, iconBg: 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30', route: '/dashboard/empresa-transacoes' },
          { icon: CheckSquare, label: 'Pendentes', value: String(tarefas.length), sub: tarefasAtrasadas.length > 0 ? `${tarefasAtrasadas.length} atrasadas!` : 'em produção', iconBg: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30', route: '/dashboard/leads' },
        ].map(c => (
          <div key={c.label} onClick={() => navigate(c.route)}
            className="bg-white dark:bg-[#0a1628] rounded-3xl p-5 border border-gray-200/50 dark:border-white/5 shadow-sm cursor-pointer hover:-translate-y-1 hover:shadow-md active:scale-98 transition-all relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.iconBg}`}><c.icon className="w-5 h-5" /></div>
              <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Painel</span>
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">{c.value}</p>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">{c.label}</p>
            <p className={`text-[10px] font-semibold mt-2.5 ${c.label === 'Pendentes' && tarefasAtrasadas.length > 0 ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>{c.sub}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-orange-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ── LEFT COLUMN: Company Tasks + CRM Production ── */}
          <div className="lg:col-span-7 space-y-6">

            {/* Company Tasks Quick Add (NEW) */}
            <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200/50 dark:border-white/5 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-violet-500/10 rounded-xl">
                    <CheckSquare className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 dark:text-white text-sm">📋 Tarefas da Empresa</h3>
                    <p className="text-[10px] text-gray-400">Gestão administrativa e tarefas avulsas</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {(['pendentes', 'todas'] as const).map(f => (
                    <button key={f} onClick={() => setTaskFilter(f)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${taskFilter === f ? 'bg-violet-500 text-white' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                      {f === 'pendentes' ? 'Pendentes' : 'Todas'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Add Input */}
              <div className="px-6 pt-4 pb-3">
                <div className="flex gap-2">
                  <input
                    value={newTaskText}
                    onChange={e => setNewTaskText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTask()}
                    placeholder="Adicionar tarefa rápida... (Enter para confirmar)"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-medium text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  />
                  <button onClick={addTask}
                    className="px-4 py-2.5 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl hover:shadow-md hover:shadow-violet-500/20 active:scale-95 transition-all flex items-center gap-1.5 text-sm font-bold">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tasks List */}
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 dark:divide-white/3">
                {filteredCompanyTasks.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">
                    <CheckSquare className="w-8 h-8 mx-auto mb-2 text-gray-200 dark:text-gray-700" />
                    {taskFilter === 'pendentes' ? 'Nenhuma tarefa pendente. Tudo em dia! 🎉' : 'Nenhuma tarefa cadastrada ainda.'}
                  </div>
                ) : (
                  filteredCompanyTasks.map(task => (
                    <div key={task.id} className={`flex items-center gap-3 px-6 py-3 hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors group ${task.concluida ? 'opacity-50' : ''}`}>
                      <button onClick={() => toggleTask(task.id, task.concluida)}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${task.concluida ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-white/20 hover:border-violet-400'}`}>
                        {task.concluida && <span className="text-white text-[10px]">✓</span>}
                      </button>
                      <p className={`flex-1 text-sm font-medium ${task.concluida ? 'line-through text-gray-400 dark:text-gray-600' : 'text-gray-800 dark:text-gray-200'}`}>
                        {task.descricao}
                      </p>
                      <button onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {companyTasks.filter(t => t.concluida).length > 0 && (
                <div className="px-6 py-3 border-t border-gray-50 dark:border-white/3">
                  <p className="text-[10px] text-gray-400 font-semibold">
                    ✅ {companyTasks.filter(t => t.concluida).length} tarefa{companyTasks.filter(t => t.concluida).length > 1 ? 's' : ''} concluída{companyTasks.filter(t => t.concluida).length > 1 ? 's' : ''} hoje
                  </p>
                </div>
              )}
            </div>

            {/* CRM Tasks Filter */}
            <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200/50 dark:border-white/5 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Tarefas de Clientes por Prazo</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {filtros.map(f => (
                  <button key={f.id} onClick={() => setFiltroUrgencia(prev => prev === f.id ? 'todos' : f.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold tracking-wide transition-all active:scale-95 ${filtroUrgencia === f.id
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-sm'
                      : 'bg-gray-50 dark:bg-[#07101f] text-gray-600 dark:text-gray-400 border-gray-200/50 dark:border-white/5'}`}>
                    <span>{f.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${filtroUrgencia === f.id ? 'bg-white text-orange-600' : 'bg-gray-200/60 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* CRM Task List */}
            <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200/50 dark:border-white/5 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/2">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-gray-900 dark:text-white">Foco na Produção</h3>
                </div>
                {tarefasFiltradas.length > 0 && (
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-full">{tarefasFiltradas.length} pendentes</span>
                )}
              </div>
              {tarefasFiltradas.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-sm flex flex-col items-center gap-3">
                  <CheckSquare className="w-10 h-10 text-gray-300 dark:text-gray-700" />
                  <p className="font-medium">Nenhuma tarefa pendente nesta categoria 🎉</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-[420px] overflow-y-auto">
                  {tarefasFiltradas.map(t => {
                    const pi = prazoInfo(t.prazo);
                    const isHoje = pi.urgencia === 'hoje';
                    const isAtrasada = pi.urgencia === 'atrasadas';
                    return (
                      <div key={`${t.leadId}-${t.stepId}`}
                        onClick={() => navigate(`/dashboard/leads?tab=producao&leadId=${t.leadId}&stepId=${t.stepId}`)}
                        className={`group w-full flex items-center justify-between gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-white/2 transition-all border-l-4 ${isHoje ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/5' : isAtrasada ? 'border-red-500 bg-red-50/10 dark:bg-red-950/2' : 'border-transparent'}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${pi.dotColor}`} />
                          <div className="min-w-0">
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider truncate mb-0.5">{t.leadNome}</p>
                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate group-hover:text-orange-500 transition-colors">{t.stepNome}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${isHoje ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400' : isAtrasada ? 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400' : 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-400'}`}>
                            <Clock className="w-3 h-3" />{pi.texto}
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

          {/* ── RIGHT COLUMN: Tomorrow + Events + Finances ── */}
          <div className="lg:col-span-5 space-y-6">

            {/* Tomorrow Preview */}
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-zinc-950 text-white rounded-3xl p-6 border border-white/5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-5">
                <h3 className="text-base font-black uppercase tracking-wider text-white">Amanhã</h3>
                <span className="bg-indigo-500/35 border border-indigo-500/30 text-indigo-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Preview</span>
              </div>
              <div className="space-y-3">
                {[
                  { icon: CheckSquare, label: 'Tarefas', count: tarefasAmanha.length, color: 'text-indigo-400', items: tarefasAmanha.slice(0, 2).map(t => t.stepNome), total: tarefasAmanha.length },
                  { icon: DollarSign, label: 'Caixa', count: null, color: 'text-emerald-400', items: transacoesAmanha.filter(t => t.tipo === 'receita').slice(0, 2).map(t => t.descricao), total: transacoesAmanha.filter(t => t.tipo === 'receita').length, value: fmtCurrency(transacoesAmanha.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)) },
                  { icon: Calendar, label: 'Agenda', count: eventosAmanha.length, color: 'text-orange-400', items: eventosAmanha.slice(0, 2).map(e => e.cliente_nome), total: eventosAmanha.length },
                ].map(item => (
                  <div key={item.label} className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5`}>
                        <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                        {item.label}
                      </span>
                      <span className={`text-xs font-black ${item.color}`}>{item.value || item.total}</span>
                    </div>
                    {item.items.length === 0 ? (
                      <p className="text-xs text-gray-400">Nada agendado.</p>
                    ) : (
                      <div className="space-y-1">
                        {item.items.map((it, idx) => <p key={idx} className="text-xs font-medium text-gray-200 truncate">• {it}</p>)}
                        {item.total > 2 && <p className="text-[10px] text-indigo-400 font-bold">+ {item.total - 2} mais</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Events */}
            <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200/50 dark:border-white/5 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">Próximos Eventos</h3>
                </div>
                <button onClick={() => navigate('/dashboard/agenda')} className="text-xs font-bold text-blue-600 hover:text-blue-500 uppercase tracking-wider flex items-center gap-1">
                  Ver todos <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              {eventos.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-xs font-medium">Sem compromissos no período</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-52 overflow-y-auto">
                  {eventos.map(ev => (
                    <div key={ev.id} onClick={() => navigate('/dashboard/agenda')}
                      className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-white/2 cursor-pointer transition-all">
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
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${statusColor(ev.status)}`}>{ev.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financeiro do período */}
            <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200/50 dark:border-white/5 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">Caixa do Período</h3>
                </div>
                <button onClick={() => navigate('/dashboard/empresa-transacoes')} className="text-xs font-bold text-emerald-600 hover:text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                  Ver tudo <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              {transacoes.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-xs font-medium">Sem movimentações no período</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-52 overflow-y-auto">
                  {transacoes.slice(0, 8).map(tr => (
                    <div key={tr.id} onClick={() => navigate('/dashboard/empresa-transacoes')}
                      className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-white/2 cursor-pointer transition-all">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 dark:text-gray-200 text-xs truncate">{tr.descricao}</p>
                        <p className="text-[10px] text-gray-400">{fmt(tr.data)} · {tr.status}</p>
                      </div>
                      <span className={`text-xs font-black shrink-0 ${tr.tipo === 'receita' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                        {tr.tipo === 'receita' ? '+' : '-'}{fmtK(tr.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          GROWTH HUB & MARKETING ADVISOR (NEW)
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-950 text-white rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative px-6 sm:px-8 pt-8 pb-6">
          <div className="absolute top-0 right-0 w-96 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-bold tracking-wider uppercase mb-3">
              <Star className="w-3 h-3" />
              Growth Hub & Marketing Advisor
            </div>
            <h3 className="text-2xl font-black tracking-tight">Seu Consultor de Crescimento</h3>
            <p className="text-sm text-gray-400 mt-1">Estratégias práticas e acionáveis para crescer seu estúdio</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 sm:px-8 overflow-x-auto">
          <div className="flex gap-2 border-b border-white/10 pb-0 min-w-max">
            {growthTabs.map(tab => (
              <button key={tab.id} onClick={() => setGrowthTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold tracking-wide transition-all border-b-2 whitespace-nowrap ${growthTab === tab.id
                  ? 'border-violet-400 text-violet-300'
                  : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                <span>{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-6 sm:px-8 py-6">
          {growthTab === 'sazonal' ? (
            <div>
              {seasonalEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhum evento sazonal importante nos próximos 90 dias.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {seasonalEvents.map(ev => (
                    <div key={ev.nome} className={`rounded-2xl p-5 border ${ev.urgency === 'high' ? 'bg-rose-900/20 border-rose-500/30' : ev.urgency === 'medium' ? 'bg-amber-900/15 border-amber-500/20' : 'bg-white/5 border-white/10'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-2xl">{ev.emoji}</span>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${ev.urgency === 'high' ? 'bg-rose-500/30 text-rose-300' : ev.urgency === 'medium' ? 'bg-amber-500/25 text-amber-300' : 'bg-white/10 text-gray-400'}`}>
                          {ev.daysAway === 0 ? 'Hoje!' : `${ev.daysAway}d`}
                        </span>
                      </div>
                      <p className="font-black text-white text-sm mb-1">{ev.nome}</p>
                      <p className="text-[10px] text-gray-400 mb-3">{fmt(ev.data)}</p>
                      <p className="text-xs text-gray-300 leading-relaxed">{ev.dica}</p>
                      {ev.urgency === 'high' && (
                        <div className="mt-3 flex items-center gap-1.5 text-rose-400">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <p className="text-[10px] font-bold">Ação urgente — comece hoje!</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {GROWTH_TIPS[growthTab].map((tip, i) => (
                <div key={i} className="bg-white/5 rounded-2xl p-5 border border-white/10 hover:bg-white/8 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">{tip.emoji}</span>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-300">{tip.tag}</span>
                  </div>
                  <p className="font-black text-white text-sm mb-2">{tip.titulo}</p>
                  <p className="text-xs text-gray-300 leading-relaxed">{tip.dica}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ROI SIMULATOR (NEW)
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200/50 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl">
              <Sliders className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 dark:text-white text-base">📊 Simulador de ROI em Anúncios</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Simule o retorno de investimentos em anúncios pagos (Meta, Google)</p>
            </div>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sliders */}
            <div className="space-y-6">
              {/* Investimento */}
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-200">💸 Investimento mensal em anúncios</label>
                  <span className="text-lg font-black text-orange-500">{fmtCurrency(roiInvestimento)}</span>
                </div>
                <input type="range" min={200} max={5000} step={100} value={roiInvestimento}
                  onChange={e => setRoiInvestimento(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none bg-gray-200 dark:bg-white/10 accent-orange-500 cursor-pointer" />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>R$ 200</span><span>R$ 5.000</span>
                </div>
              </div>

              {/* Ticket Médio */}
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-200">🎯 Ticket médio dos seus serviços</label>
                  <span className="text-lg font-black text-blue-500">{fmtCurrency(roiTicket)}</span>
                </div>
                <input type="range" min={800} max={25000} step={200} value={roiTicket}
                  onChange={e => setRoiTicket(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none bg-gray-200 dark:bg-white/10 accent-blue-500 cursor-pointer" />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>R$ 800</span><span>R$ 25.000</span>
                </div>
              </div>

              {/* Taxa de Conversão */}
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-200">📈 Taxa de conversão de leads</label>
                  <span className="text-lg font-black text-emerald-500">{roiConversao}%</span>
                </div>
                <input type="range" min={2} max={20} step={1} value={roiConversao}
                  onChange={e => setRoiConversao(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none bg-gray-200 dark:bg-white/10 accent-emerald-500 cursor-pointer" />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>2% (conservador)</span><span>20% (agressivo)</span>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="bg-gradient-to-br from-gray-900 to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-5">Projeção estimada / mês</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Leads gerados</span>
                  <span className="text-2xl font-black text-white">{roiCalc.leads}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Contratos estimados</span>
                  <span className="text-2xl font-black text-white">{roiCalc.contratos.toFixed(1)}</span>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Faturamento estimado</span>
                  <span className="text-2xl font-black text-emerald-400">{fmtK(roiCalc.faturamento)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Lucro líquido estimado</span>
                  <span className="text-xl font-black text-blue-400">{fmtK(roiCalc.faturamento - roiInvestimento)}</span>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-gray-300">ROI estimado</span>
                    <span className={`text-3xl font-black ${roiCalc.roi >= 200 ? 'text-emerald-400' : roiCalc.roi >= 100 ? 'text-amber-400' : 'text-orange-400'}`}>
                      {Math.round(roiCalc.roi)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    * Estimativa baseada em benchmarks de mercado para fotografia. Resultados reais variam conforme qualidade dos anúncios, segmentação e sazonalidade.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
