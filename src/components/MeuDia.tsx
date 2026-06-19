import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Lead } from '../lib/supabase';
import {
  Calendar, DollarSign, CheckSquare, Sun, RefreshCw,
  Zap, ChevronRight, Plus, ArrowRight, Trash2, MessageCircle, Users,
  AlertCircle, Star, Sliders,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface MeuDiaProps { userId: string; }
type Periodo = 'hoje' | 'semana' | 'mes' | 'ano' | 'custom';
type FiltroUrgencia = 'todos' | 'atrasadas' | 'hoje' | 'amanha' | 'depois_amanha' | 'futuras';
type GrowthTab = 'sazonal' | 'clientes' | 'whatsapp' | 'redes' | 'parcerias';



const growthTabs: { id: GrowthTab; label: string; emoji: string }[] = [
  { id: 'sazonal', label: 'Sazonalidade', emoji: '📅' },
  { id: 'clientes', label: 'Clientes Antigos', emoji: '👥' },
  { id: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
  { id: 'redes', label: 'Redes Sociais', emoji: '📱' },
  { id: 'parcerias', label: 'Parcerias B2B', emoji: '🤝' },
];

interface ReviewPendente {
  id: string;
  rating: number;
  comentario: string;
  nome_cliente: string;
  created_at: string;
  tipo_evento: string | null;
}

interface EventoAgenda {
  id: string; data_evento: string; tipo_evento: string;
  cliente_nome: string; cidade?: string; status: string;
  lead_id?: string | null;
  leads?: {
    telefone_cliente: string | null;
  } | null;
}
interface ClientRecommendation {
  clienteNome: string;
  tipoEvento: string;
  dataEvento: string;
  diasPassados: number;
  telefone: string;
  tipoSugestao: 'album' | 'ensaios' | '15anos_followup' | 'geral_6m' | 'geral_1y';
  titulo: string;
  dica: string;
  tag: string;
  mensagemWhatsapp: string;
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
  hoje: CashflowPeriod;
  amanha: CashflowPeriod;
  semana: CashflowPeriod;
  mes: CashflowPeriod;
  proximoMes: CashflowPeriod;
}
interface SeasonalEvent {
  data: string; nome: string; daysAway: number;
  dica: string; emoji: string; urgency: 'high' | 'medium' | 'low';
}

function cleanPhone(phone: string) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if ((cleaned.length === 10 || cleaned.length === 11) && !cleaned.startsWith('55')) {
    return '55' + cleaned;
  }
  return cleaned;
}

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

function fmtTimestamp(iso: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function getFollowUpLabel(lead: Lead) {
  const dateToCheck = lead.data_ultimo_contato ? new Date(lead.data_ultimo_contato) : new Date(lead.created_at);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - dateToCheck.getTime()) / (1000 * 60 * 60 * 24));
  const prefix = lead.data_ultimo_contato ? 'Contato há' : 'Criado há';
  return `${prefix} ${diffDays} dia${diffDays !== 1 ? 's' : ''}`;
}

export function getLeadStatusBadge(status: Lead['status']) {
  const styles: Record<Lead['status'], string> = {
    novo: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    contatado: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    convertido: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    perdido: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    abandonado: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
    em_negociacao: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
    fazer_followup: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    finalizado: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
  };
  const labels: Record<string, string> = {
    novo: '🆕 Novo',
    contatado: '💬 Contatado',
    convertido: '✅ Fechado',
    perdido: '❌ Perdido',
    abandonado: '⏸️ Abandonado',
    em_negociacao: '🤝 Negociação',
    fazer_followup: '📞 Follow-up',
    finalizado: '🏁 Finalizado',
  };
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${styles[status] || 'bg-gray-500/10 text-gray-400'}`}>
      {labels[status] || status}
    </span>
  );
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
  const [periodo] = useState<Periodo>('hoje');
  const [customStart] = useState('');
  const [customEnd] = useState('');
  const [loading, setLoading] = useState(true);

  // ── CRM data ───────────────────────────────────────────────────────────────
  const [abaAgenda, setAbaAgenda] = useState<'hoje' | 'amanha' | 'semana'>('hoje');
  const [abaTarefaPeriodo, setAbaTarefaPeriodo] = useState<'hoje' | 'amanha' | 'proximos3' | 'semana' | 'mes' | 'ano' | 'periodo'>('hoje');
  
  const [todasTarefas, setTodasTarefas] = useState<TarefaWorkflow[]>([]);
  const [tarefasConcluidas, setTarefasConcluidas] = useState<TarefaWorkflow[]>([]);
  const [receitaMes, setReceitaMes] = useState(0);
  const [receitaAno, setReceitaAno] = useState(0);
  const [allEventos, setAllEventos] = useState<EventoAgenda[]>([]);

  // ── CRM Feed data (new) ───────────────────────────────────────────────────
  const [avaliacoesPendentes, setAvaliacoesPendentes] = useState<ReviewPendente[]>([]);

  // ── Company Tasks (new) ───────────────────────────────────────────────────
  const [companyTasks, setCompanyTasks] = useState<CompanyTask[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'baixa' | 'media' | 'alta'>('media');

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

  const clientRecommendations = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recs: ClientRecommendation[] = [];

    allEventos.forEach(ev => {
      if (ev.status !== 'confirmado' && ev.status !== 'realizado') return;
      if (!ev.data_evento) return;

      const evDate = new Date(ev.data_evento + 'T12:00:00');
      if (isNaN(evDate.getTime())) return;
      if (evDate >= today) return;

      const diffTime = Math.abs(today.getTime() - evDate.getTime());
      const diasPassados = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const tipoLower = (ev.tipo_evento || '').toLowerCase();
      const telefone = ev.leads?.telefone_cliente || '';

      const isCasamento = tipoLower.includes('casamento') || tipoLower.includes('wedding') || tipoLower.includes('noiv');
      const isEnsaio = tipoLower.includes('ensaio') || tipoLower.includes('shoot') || tipoLower.includes('sess') || tipoLower.includes('book') || tipoLower.includes('portrait');
      const is15Anos = tipoLower.includes('15 anos') || tipoLower.includes('debutante') || tipoLower.includes('15anos') || tipoLower.includes('sweet 15') || tipoLower.includes('sweet15');

      let tipoSugestao: ClientRecommendation['tipoSugestao'] | null = null;
      let titulo = '';
      let dica = '';
      let tag = '';
      let mensagemWhatsapp = '';

      if (isCasamento) {
        if (diasPassados >= 25 && diasPassados <= 60) {
          tipoSugestao = 'album';
          titulo = 'Venda de Álbum Premium';
          dica = `Faz ${Math.round(diasPassados / 30) || 1} mês que o casamento aconteceu. A empolgação com as fotos digitais está no auge, o timing perfeito para oferecer a diagramação de um álbum físico impresso.`;
          tag = 'Álbum / Upsell';
          mensagemWhatsapp = `Oi ${ev.cliente_nome}! Como estão os primeiros dias de casados? ❤️ Passando para avisar que a seleção de fotos de vocês ficou incrível! Sabia que nós criamos álbuns premium personalizados? Suas fotos merecem ser eternizadas em papel. Quer que eu te mande nosso catálogo de capas de couro e linho?`;
        } else if (diasPassados >= 340 && diasPassados <= 380) {
          tipoSugestao = 'ensaios';
          titulo = 'Bodas de Papel (1 Ano)';
          dica = `Aniversário de 1 ano de casamento chegando! Ofereça um ensaio romântico comemorativo para registrar o primeiro ano de vida a dois.`;
          tag = 'Bodas de Papel';
          mensagemWhatsapp = `Oi ${ev.cliente_nome}! Feliz aniversário de 1 ano de casados chegando! ✨ Que ano especial, né? Para comemorar essa data tão linda das Bodas de Papel, o que vocês acham de fazermos um ensaio fotográfico romântico rápido para celebrar? Tenho duas datas para esse mês, vamos aproveitar?`;
        }
      } else if (isEnsaio) {
        if (diasPassados >= 170 && diasPassados <= 200) {
          tipoSugestao = 'ensaios';
          titulo = 'Atualização de Fotos (6 Meses)';
          dica = `Já faz 6 meses desde o ensaio anterior. Sugira uma nova sessão temática ou atualização de fotos profissionais/pessoais para o novo semestre.`;
          tag = 'Novas Fotos';
          mensagemWhatsapp = `Oi ${ev.cliente_nome}! Tudo bem? Já se passaram 6 meses desde o nosso ensaio fotográfico! 📸 Passando para ver como você está e sugerir que fizéssemos uma nova sessão para atualizar seu feed/porta-retratos, talvez um ensaio de temporada ou estilo urbano. Vamos agendar para as próximas semanas?`;
        } else if (diasPassados >= 340 && diasPassados <= 380) {
          tipoSugestao = 'ensaios';
          titulo = 'Ensaio Anual da Família';
          dica = `Faz 1 ano que o cliente fotografou com você. Excelente momento para fidelizar e oferecer um cupom de desconto exclusivo para manter a tradição de fotos anuais.`;
          tag = 'Fidelização';
          mensagemWhatsapp = `Oi ${ev.cliente_nome}! Já faz 1 ano inteiro desde que fizemos aquelas fotos lindas! O tempo voa de pressa... Que tal fazermos um novo ensaio anual para registrar essa nova fase da sua vida ou da sua família? Tenho um cupom de 10% de desconto especial para clientes recorrentes esse mês. Vamos conversar?`;
        }
      } else if (is15Anos) {
        if (diasPassados >= 340 && diasPassados <= 380) {
          tipoSugestao = '15anos_followup';
          titulo = 'Ensaio Sweet 16 (1 Ano)';
          dica = `Completa 1 ano do aniversário de 15 anos. Ofereça um ensaio de estilo urban/fashion para comemorar os 16 anos.`;
          tag = 'Sweet 16';
          mensagemWhatsapp = `Oi ${ev.cliente_nome}! Faz 1 ano daquela festa de 15 anos maravilhosa! Que saudade daquele dia incrível. O que você acha de fazermos um ensaio de aniversário de 16 anos, mais focado em estilo de moda e street style para atualizar as fotos e redes sociais? Seria incrível!`;
        }
      }

      if (!tipoSugestao) {
        if (diasPassados >= 170 && diasPassados <= 200) {
          tipoSugestao = 'geral_6m';
          titulo = 'Reativação (6 Meses)';
          dica = `Faz 6 meses desde o evento de ${ev.tipo_evento}. Excelente oportunidade para mandar uma mensagem, quebrar o gelo e ver se precisam de novos registros.`;
          tag = 'Reativação';
          mensagemWhatsapp = `Oi ${ev.cliente_nome}! Passando para te mandar um abraço e ver se está tudo bem! Já faz 6 meses desde as fotos de ${ev.tipo_evento}. Se precisar de algum novo registro fotográfico ou ensaio para este semestre, estou por aqui!`;
        } else if (diasPassados >= 340 && diasPassados <= 380) {
          tipoSugestao = 'geral_1y';
          titulo = 'Aniversário de Parceria';
          dica = `Completa 1 ano desde o último serviço. Envie uma mensagem comemorativa e ofereça uma vantagem de fidelidade.`;
          tag = 'Retenção';
          mensagemWhatsapp = `Oi ${ev.cliente_nome}! Tudo bem? Passando para te dar um oi e comemorar 1 ano desde o nosso último trabalho juntos no evento de ${ev.tipo_evento}! Como agradecimento pela confiança, tenho uma condição especial para o seu próximo ensaio este mês. Vamos conversar?`;
        }
      }

      if (tipoSugestao) {
        recs.push({
          clienteNome: ev.cliente_nome,
          tipoEvento: ev.tipo_evento,
          dataEvento: ev.data_evento,
          diasPassados,
          telefone,
          tipoSugestao,
          titulo,
          dica,
          tag,
          mensagemWhatsapp
        });
      }
    });

    return recs;
  }, [allEventos]);

  const load = useCallback(async () => {
    setLoading(true);
    const hoje = getToday();
    const todayObj = new Date();
    const inicioMes = `${todayObj.getFullYear()}-${pad(todayObj.getMonth() + 1)}-01`;
    const inicioAno = `${todayObj.getFullYear()}-01-01`;
    const fim3Meses = dateStr(new Date(todayObj.getFullYear(), todayObj.getMonth() + 4, 0));

    try {
      const [leadsRes, trMesRes, trAnoRes, cashflowRes, profileRes, allEvRes, avaliacoesPendentesRes] =
        await Promise.all([
          supabase.from('leads').select('id, nome_cliente, workflow').eq('user_id', userId).eq('status', 'convertido'),
          supabase.from('company_transactions').select('valor, tipo, status').eq('user_id', userId).gte('data', inicioMes).lte('data', hoje),
          supabase.from('company_transactions').select('valor, tipo, status').eq('user_id', userId).gte('data', inicioAno).lte('data', hoje),
          supabase.from('company_transactions').select('id, descricao, valor, data, status, tipo').eq('user_id', userId).gte('data', inicioMes).lte('data', fim3Meses).order('data'),
          supabase.from('profiles').select('lucro_desejado').eq('id', userId).maybeSingle(),
          supabase.from('eventos_agenda').select('id, data_evento, tipo_evento, cliente_nome, status, lead_id, leads(telefone_cliente)').eq('user_id', userId).order('data_evento', { ascending: false }),
          supabase.from('avaliacoes').select('id, rating, comentario, nome_cliente, created_at, tipo_evento').eq('profile_id', userId).eq('visivel', false).order('created_at', { ascending: false }).limit(10),
        ]);

      setCashflowTr((cashflowRes.data as Transacao[]) || []);
      setAllEventos((allEvRes.data as any[]) || []);
      setAvaliacoesPendentes((avaliacoesPendentesRes.data as ReviewPendente[]) || []);

      const pd = profileRes.data as { lucro_desejado?: number } | null;
      if (pd?.lucro_desejado) setLucroDesejado(pd.lucro_desejado);

      const calcReceita = (rows: { tipo: string; status: string; valor: number }[]) =>
        rows.filter(t => t.tipo === 'receita' && t.status === 'pago').reduce((s, t) => s + (t.valor || 0), 0);
      setReceitaMes(calcReceita((trMesRes.data as { tipo: string; status: string; valor: number }[]) || []));
      setReceitaAno(calcReceita((trAnoRes.data as { tipo: string; status: string; valor: number }[]) || []));

      const todasTarefasRaw: TarefaWorkflow[] = [];
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
            const taskItem = { leadId: lead.id, leadNome: lead.nome_cliente, stepId: step.id, stepNome, status: step.status, prazo, completedAt };
            todasTarefasRaw.push(taskItem);
          }
        }
      }

      const sortFunc = (a: TarefaWorkflow, b: TarefaWorkflow) => {
        if (!a.prazo && !b.prazo) return 0;
        if (!a.prazo) return 1;
        if (!b.prazo) return -1;
        return new Date(a.prazo).getTime() - new Date(b.prazo).getTime();
      };

      todasTarefasRaw.sort(sortFunc);

      setTodasTarefas(todasTarefasRaw);
      setTarefasConcluidas(concluidasRaw);
    } finally { setLoading(false); }
  }, [userId]);

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
        .insert({
          user_id: userId,
          descricao: text,
          prioridade: newTaskPriority,
          data_limite: newTaskDate || null,
          concluida: false
        })
        .select().single();
      if (!error && data) {
        setCompanyTasks(prev => [data as CompanyTask, ...prev]);
        setNewTaskText('');
        setNewTaskDate('');
        setNewTaskPriority('media');
      }
    } catch { /* table may not exist yet */ }
  }, [newTaskText, newTaskDate, newTaskPriority, userId]);

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
    const amanha = getAmanha();
    const todayObj = new Date();
    const day = todayObj.getDay();
    const mon = new Date(todayObj); mon.setDate(todayObj.getDate() - day + (day === 0 ? -6 : 1));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const inicioMes = `${todayObj.getFullYear()}-${pad(todayObj.getMonth() + 1)}-01`;
    const fimMes = dateStr(new Date(todayObj.getFullYear(), todayObj.getMonth() + 1, 0));
    
    const nextMonthObj = new Date(todayObj.getFullYear(), todayObj.getMonth() + 1, 1);
    const inicioProximoMes = `${nextMonthObj.getFullYear()}-${pad(nextMonthObj.getMonth() + 1)}-01`;
    const fimProximoMes = dateStr(new Date(nextMonthObj.getFullYear(), nextMonthObj.getMonth() + 2, 0));

    return {
      hoje: calcCashflowPeriod(cashflowTr, hoje, hoje),
      amanha: calcCashflowPeriod(cashflowTr, amanha, amanha),
      semana: calcCashflowPeriod(cashflowTr, dateStr(mon), dateStr(sun)),
      mes: calcCashflowPeriod(cashflowTr, inicioMes, fimMes),
      proximoMes: calcCashflowPeriod(cashflowTr, inicioProximoMes, fimProximoMes),
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

  const agendaFiltrada = useMemo(() => {
    const hoje = getToday();
    const amanha = getAmanha();
    const todayObj = new Date();
    const day = todayObj.getDay();
    const mon = new Date(todayObj); mon.setDate(todayObj.getDate() - day + (day === 0 ? -6 : 1));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const inicioSemana = dateStr(mon);
    const fimSemana = dateStr(sun);

    return {
      hoje: allEventos.filter(e => e.data_evento === hoje),
      amanha: allEventos.filter(e => e.data_evento === amanha),
      semana: allEventos.filter(e => e.data_evento >= inicioSemana && e.data_evento <= fimSemana),
    };
  }, [allEventos]);

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

  const tarefasPorPeriodo = useMemo(() => {
    const hoje = getToday();
    const amanha = getAmanha();
    const todayObj = new Date();
    
    const d3 = new Date(todayObj); d3.setDate(todayObj.getDate() + 2);
    const fim3Dias = dateStr(d3);

    const day = todayObj.getDay();
    const mon = new Date(todayObj); mon.setDate(todayObj.getDate() - day + (day === 0 ? -6 : 1));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const inicioSemana = dateStr(mon);
    const fimSemana = dateStr(sun);

    const inicioMes = `${todayObj.getFullYear()}-${pad(todayObj.getMonth() + 1)}-01`;
    const fimMes = dateStr(new Date(todayObj.getFullYear(), todayObj.getMonth() + 1, 0));

    const inicioAno = `${todayObj.getFullYear()}-01-01`;
    const fimAno = `${todayObj.getFullYear()}-12-31`;

    const hojeCRM = todasTarefas.filter(t => t.prazo === hoje);
    const hojeCompany = companyTasks.filter(t => !t.concluida && t.data_limite === hoje);

    const amanhaCRM = todasTarefas.filter(t => t.prazo === amanha);
    const amanhaCompany = companyTasks.filter(t => !t.concluida && t.data_limite === amanha);

    const proximo3CRM = todasTarefas.filter(t => t.prazo && t.prazo >= hoje && t.prazo <= fim3Dias);
    const proximo3Company = companyTasks.filter(t => !t.concluida && t.data_limite && t.data_limite >= hoje && t.data_limite <= fim3Dias);

    const semanaCRM = todasTarefas.filter(t => t.prazo && t.prazo >= inicioSemana && t.prazo <= fimSemana);
    const semanaCompany = companyTasks.filter(t => !t.concluida && t.data_limite && t.data_limite >= inicioSemana && t.data_limite <= fimSemana);

    const mesCRM = todasTarefas.filter(t => t.prazo && t.prazo >= inicioMes && t.prazo <= fimMes);
    const mesCompany = companyTasks.filter(t => !t.concluida && t.data_limite && t.data_limite >= inicioMes && t.data_limite <= fimMes);

    const anoCRM = todasTarefas.filter(t => t.prazo && t.prazo >= inicioAno && t.prazo <= fimAno);
    const anoCompany = companyTasks.filter(t => !t.concluida && t.data_limite && t.data_limite >= inicioAno && t.data_limite <= fimAno);

    const periodoCRM = todasTarefas.filter(t => !t.prazo || (t.prazo >= range.start && t.prazo <= range.end));
    const periodoCompany = companyTasks.filter(t => !t.concluida && (!t.data_limite || (t.data_limite >= range.start && t.data_limite <= range.end)));

    const concluidaCompanyCount = companyTasks.filter(t => t.concluida).length;
    const concluidaCRMCount = tarefasConcluidas.length;
    const executadasTotais = concluidaCompanyCount + concluidaCRMCount;

    const hojeCount = hojeCRM.length + hojeCompany.length;
    const amanhaCount = amanhaCRM.length + amanhaCompany.length;
    const semanaCount = semanaCRM.length + semanaCompany.length;
    const mesCount = mesCRM.length + mesCompany.length;
    const totaisGeral = todasTarefas.length + companyTasks.filter(t => !t.concluida).length;

    return {
      hoje: { crm: hojeCRM, company: hojeCompany, count: hojeCount },
      amanha: { crm: amanhaCRM, company: amanhaCompany, count: amanhaCount },
      proximos3: { crm: proximo3CRM, company: proximo3Company, count: proximo3CRM.length + proximo3Company.length },
      semana: { crm: semanaCRM, company: semanaCompany, count: semanaCount },
      mes: { crm: mesCRM, company: mesCompany, count: mesCount },
      ano: { crm: anoCRM, company: anoCompany, count: anoCRM.length + anoCompany.length },
      periodo: { crm: periodoCRM, company: periodoCompany, count: periodoCRM.length + periodoCompany.length },
      stats: {
        executadasTotais,
        hojeCount,
        amanhaCount,
        semanaCount,
        mesCount,
        totaisGeral
      }
    };
  }, [todasTarefas, companyTasks, tarefasConcluidas, range.start, range.end]);

  const tarefasCombinadas = useMemo(() => {
    const currentPeriod = tarefasPorPeriodo[abaTarefaPeriodo];
    const list: {
      tipo: 'crm' | 'company';
      id: string;
      nome: string;
      subnome?: string;
      prazo?: string | null;
      concluida: boolean;
      prioridade?: 'baixa' | 'media' | 'alta';
      taskObject?: any;
    }[] = [];

    currentPeriod.crm.forEach(t => {
      list.push({
        tipo: 'crm',
        id: `${t.leadId}-${t.stepId}`,
        nome: t.stepNome,
        subnome: t.leadNome,
        prazo: t.prazo,
        concluida: false,
        taskObject: t
      });
    });

    currentPeriod.company.forEach(t => {
      list.push({
        tipo: 'company',
        id: t.id,
        nome: t.descricao,
        subnome: 'Administrativo',
        prazo: t.data_limite,
        concluida: t.concluida,
        prioridade: t.prioridade,
        taskObject: t
      });
    });

    return list.sort((a, b) => {
      if (!a.prazo && !b.prazo) return 0;
      if (!a.prazo) return 1;
      if (!b.prazo) return -1;
      return new Date(a.prazo).getTime() - new Date(b.prazo).getTime();
    });
  }, [tarefasPorPeriodo, abaTarefaPeriodo]);

  const agrupamento = useMemo(() => {
    const hoje = getToday(); const amanha = getAmanha(); const depoisAmanha = getDepoisAmanha();
    return {
      atrasadas: todasTarefas.filter(t => t.prazo && t.prazo < hoje),
      hoje: todasTarefas.filter(t => t.prazo === hoje),
      amanha: todasTarefas.filter(t => t.prazo === amanha),
      depois_amanha: todasTarefas.filter(t => t.prazo === depoisAmanha),
      futuras: todasTarefas.filter(t => !t.prazo || t.prazo > depoisAmanha),
    };
  }, [todasTarefas]);

  const insights = useMemo(() => {
    const totalPendentes = todasTarefas.length;
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
  }, [todasTarefas, tarefasConcluidas, agrupamento, produtividade.hoje, receitaMes, receitaAno]);



  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-12 text-gray-900 dark:text-gray-100">

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



      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-orange-500" />
        </div>
      ) : (
        <div className="space-y-8">

          {/* ═══════════════════════════════════════════════════════════════════════
              BLOQUE 2: AÇÕES RÁPIDAS
              ═══════════════════════════════════════════════════════════════════════ */}
          <div className="bg-white dark:bg-[#0a1628] rounded-3xl p-6 border border-gray-200/50 dark:border-white/5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" /> Ações Rápidas do CRM
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

          {/* ═════ GRID: BLOCO 1 (7 cols) + BLOCO 3 (5 cols) ═════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* ── BLOCO 1: CENTRAL DE TAREFAS (7 cols) ── */}
            <div className="lg:col-span-7 space-y-6">

              <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200/50 dark:border-white/5 shadow-sm overflow-hidden p-6 space-y-6">

                {/* Saúde da Empresa */}
                <div className="bg-gradient-to-r from-gray-900 via-slate-900 to-zinc-900 text-white rounded-2xl p-5 border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-5">
                    <div className="space-y-2.5 flex-1">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-bold tracking-wider text-orange-400 uppercase">
                        <Zap className="w-3 h-3 text-orange-400 animate-pulse" />
                        Saúde do Estúdio
                      </div>
                      <div className="space-y-1">
                        {insights.msgs.map((m, i) => (
                          <p key={i} className="text-sm text-gray-300 flex items-start gap-2">
                            <span>{m.emoji}</span><span className="leading-snug">{m.texto}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className={`text-5xl font-black ${insights.saudeColor}`}>{insights.score}</div>
                      <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Score</div>
                      <div className={`text-sm font-bold ${insights.saudeColor}`}>{insights.saudeEmoji} {insights.saudeLabel}</div>
                    </div>
                  </div>
                </div>

                {/* Stats Rápidas */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {[
                    { label: 'Executadas', value: tarefasPorPeriodo.stats.executadasTotais, color: 'text-emerald-600' },
                    { label: 'Hoje', value: tarefasPorPeriodo.stats.hojeCount, color: 'text-amber-600' },
                    { label: 'Amanhã', value: tarefasPorPeriodo.stats.amanhaCount, color: 'text-orange-500' },
                    { label: 'Semana', value: tarefasPorPeriodo.stats.semanaCount, color: 'text-blue-600' },
                    { label: 'Mês', value: tarefasPorPeriodo.stats.mesCount, color: 'text-violet-600' },
                    { label: 'Total', value: tarefasPorPeriodo.stats.totaisGeral, color: 'text-gray-700 dark:text-gray-300' },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 dark:bg-white/3 rounded-2xl p-3 text-center border border-gray-100 dark:border-white/5">
                      <div className={`text-2xl font-black ${s.color} dark:brightness-125`}>{s.value}</div>
                      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Period Tabs */}
                <div>
                  <div className="flex gap-1.5 overflow-x-auto pb-2">
                    {[
                      { id: 'hoje', label: 'Hoje', count: tarefasPorPeriodo.hoje.count },
                      { id: 'amanha', label: 'Amanhã', count: tarefasPorPeriodo.amanha.count },
                      { id: 'proximos3', label: '3 dias', count: tarefasPorPeriodo.proximos3.count },
                      { id: 'semana', label: 'Semana', count: tarefasPorPeriodo.semana.count },
                      { id: 'mes', label: 'Mês', count: tarefasPorPeriodo.mes.count },
                      { id: 'ano', label: 'Ano', count: tarefasPorPeriodo.ano.count },
                    ].map(tab => (
                      <button key={tab.id}
                        onClick={() => setAbaTarefaPeriodo(tab.id as any)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${abaTarefaPeriodo === tab.id
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}>
                        {tab.label}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${abaTarefaPeriodo === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400'}`}>
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {tarefasCombinadas.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">
                        <CheckSquare className="w-10 h-10 mx-auto mb-2 text-gray-200 dark:text-gray-700" />
                        <p className="text-sm font-medium">Nenhuma tarefa neste período</p>
                      </div>
                    ) : tarefasCombinadas.map(t => {
                      const pi = prazoInfo(t.prazo);
                      return (
                        <div key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all group ${t.concluida ? 'opacity-50 bg-gray-50 dark:bg-white/2 border-gray-100 dark:border-white/3' : 'bg-white dark:bg-white/3 border-gray-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-500/30'}`}>
                          {t.tipo === 'company' ? (
                            <input type="checkbox" checked={t.concluida}
                              onChange={() => toggleTask(t.id, t.concluida)}
                              className="w-4 h-4 rounded accent-indigo-600 cursor-pointer shrink-0" />
                          ) : (
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${pi.dotColor}`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${t.concluida ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{t.nome}</p>
                            {t.subnome && <p className="text-[10px] text-gray-400 truncate">{t.subnome}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {t.tipo === 'company' && t.prioridade && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase ${
                                t.prioridade === 'alta' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                t.prioridade === 'media' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20' :
                                'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                              }`}>
                                {t.prioridade}
                              </span>
                            )}
                            <span className={`text-[10px] font-bold ${pi.colorClass}`}>{pi.texto}</span>
                            {t.tipo === 'crm' && (
                              <button onClick={() => navigate(`/dashboard/leads?id=${t.taskObject?.leadId}`)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all">
                                <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                              </button>
                            )}
                            {t.tipo === 'company' && (
                              <button onClick={() => deleteTask(t.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex gap-2">
                      <input value={newTaskText} onChange={e => setNewTaskText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addTask()}
                        placeholder="Nova tarefa administrativa..."
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                      <button onClick={addTask}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shrink-0">
                        <Plus className="w-4 h-4" />
                        <span>Adicionar</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-4 items-center text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400">Prazo:</span>
                        <input
                          type="date"
                          value={newTaskDate}
                          onChange={e => setNewTaskDate(e.target.value)}
                          className="px-2 py-1 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-850 dark:text-gray-200 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400">Prioridade:</span>
                        <select
                          value={newTaskPriority}
                          onChange={e => setNewTaskPriority(e.target.value as 'baixa' | 'media' | 'alta')}
                          className="px-2 py-1 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-850 dark:text-gray-200 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                        >
                          <option value="baixa">🟢 Baixa</option>
                          <option value="media">🟡 Média</option>
                          <option value="alta">🔴 Alta</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Avaliações Pendentes */}
              <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200/50 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/2">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">Avaliações Pendentes</h3>
                  </div>
                  <button onClick={() => navigate('/dashboard/avaliacoes')} className="text-xs font-bold text-yellow-600 hover:text-yellow-500 uppercase tracking-wider flex items-center gap-1">
                    Moderar <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                {avaliacoesPendentes.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 text-sm flex flex-col items-center gap-3">
                    <Star className="w-10 h-10 text-gray-200 dark:text-gray-700" />
                    <p className="font-medium">Nenhuma avaliação pendente. Tudo aprovado! 🎉</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-[300px] overflow-y-auto">
                    {avaliacoesPendentes.map(review => (
                      <div key={review.id}
                        onClick={() => navigate('/dashboard/avaliacoes')}
                        className="group w-full flex flex-col gap-1 px-6 py-4 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-white/2 transition-all">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-gray-800 dark:text-gray-200 group-hover:text-yellow-500 transition-colors">
                            {review.nome_cliente}
                          </span>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-700'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed">
                          "{review.comentario && review.comentario.length > 100 ? review.comentario.slice(0, 100) + '...' : review.comentario}"
                        </p>
                        <p className="text-[9px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider mt-1">
                          {review.tipo_evento || 'Evento'} · {fmtTimestamp(review.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── BLOCO 3: EMPRESA & OPERAÇÕES (5 cols) ── */}
            <div className="lg:col-span-5 space-y-6">

              {/* Agenda */}
              <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200/50 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">🗓️ Agenda</h3>
                  </div>
                  <button onClick={() => navigate('/dashboard/agenda')} className="text-xs font-bold text-blue-500 hover:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                    Ver tudo <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Abas da Agenda */}
                <div className="px-6 py-3.5 bg-gray-50/50 dark:bg-white/1 border-b border-gray-100 dark:border-white/5 flex gap-1.5 overflow-x-auto">
                  {[
                    { id: 'hoje', label: 'Hoje', count: agendaFiltrada.hoje.length },
                    { id: 'amanha', label: 'Amanhã', count: agendaFiltrada.amanha.length },
                    { id: 'semana', label: 'Esta Semana', count: agendaFiltrada.semana.length },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setAbaAgenda(tab.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                        abaAgenda === tab.id
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {tab.label}
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                        abaAgenda === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-[280px] overflow-y-auto">
                  {agendaFiltrada[abaAgenda].length === 0 ? (
                    <div className="py-10 text-center text-gray-400 text-sm flex flex-col items-center gap-3">
                      <Calendar className="w-10 h-10 text-gray-200 dark:text-gray-700" />
                      <p className="font-medium">Sem compromissos para este período</p>
                    </div>
                  ) : agendaFiltrada[abaAgenda].map(ev => (
                    <div key={ev.id}
                      onClick={() => navigate(`/dashboard/agenda?id=${ev.id}`)}
                      className="flex items-center gap-3 px-6 py-3.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/2 transition-all group">
                      <div className="flex flex-col items-center bg-blue-500/10 rounded-xl p-2 w-12 shrink-0 text-center">
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                          {new Date(ev.data_evento + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
                        </span>
                        <span className="text-lg font-black text-blue-700 dark:text-blue-300 leading-none">
                          {new Date(ev.data_evento + 'T12:00:00').getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-500 transition-colors">{ev.cliente_nome}</p>
                        <p className="text-[11px] text-gray-400 truncate">{ev.tipo_evento}{ev.cidade ? ` · ${ev.cidade}` : ''}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Cashflow */}
              <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200/50 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">💰 Fluxo de Caixa</h3>
                  </div>
                  <button onClick={() => navigate('/dashboard/empresa-transacoes')} className="text-xs font-bold text-emerald-600 hover:text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                    Ver tudo <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {(['hoje', 'amanha', 'semana', 'mes', 'proximoMes'] as const).map(key => {
                    const labels: Record<string, string> = { hoje: '📅 Hoje', amanha: '⏭️ Amanhã', semana: '📆 Esta Semana', mes: '📊 Este Mês', proximoMes: '🔮 Próximo Mês' };
                    const period = cashflow[key];
                    return (
                      <div key={key} className="px-6 py-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{labels[key]}</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-wide mb-0.5">Entradas</p>
                            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{fmtK(period.entradas)}</p>
                            {period.entradasPendentes > 0 && (
                              <p className="text-[9px] text-amber-500">+{fmtK(period.entradasPendentes)} pend.</p>
                            )}
                          </div>
                          <div>
                            <p className="text-[9px] text-red-500 font-bold uppercase tracking-wide mb-0.5">Saídas</p>
                            <p className="text-sm font-black text-red-500 dark:text-red-400">{fmtK(period.saidas)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-blue-500 font-bold uppercase tracking-wide mb-0.5">Lucro</p>
                            <p className={`text-sm font-black ${period.lucro >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>{fmtK(period.lucro)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Meta de Lucro Mensal */}
                <div className="px-6 py-4 bg-gray-50/50 dark:bg-white/1 border-t border-gray-100 dark:border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-500 dark:text-gray-400">🎯 Meta Mensal ({fmtCurrency(lucroDesejado)})</span>
                    <span className="font-black text-blue-600 dark:text-blue-400">{metaProgress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, metaProgress)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                    <span>{fmtCurrency(cashflow.mes.lucro)} alcançados</span>
                    {cashflow.mes.lucro >= lucroDesejado ? (
                      <span className="text-emerald-500 font-bold">Meta batida! 🎉</span>
                    ) : (
                      <span>Faltam {fmtCurrency(Math.max(0, lucroDesejado - cashflow.mes.lucro))}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Follow-ups Sugeridos */}
              {clientRecommendations.length > 0 && (
                <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200/50 dark:border-white/5 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-green-500" />
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm">💬 Follow-ups Sugeridos</h3>
                    </div>
                    <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                      {clientRecommendations.length}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-[280px] overflow-y-auto">
                    {clientRecommendations.map((rec, i) => (
                      <div key={i} className="px-6 py-3.5 hover:bg-gray-50 dark:hover:bg-white/2 transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate">{rec.clienteNome}</p>
                            <p className="text-[11px] text-gray-400 truncate">{rec.titulo}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{rec.dica}</p>
                          </div>
                          <a href={`https://wa.me/${cleanPhone(rec.telefone)}?text=${encodeURIComponent(rec.mensagemWhatsapp)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="shrink-0 p-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all active:scale-95">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 dark:bg-white/5 text-[10px] font-bold text-gray-500 rounded-full">{rec.tag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── BLOCO 4: GROWTH HUB ── */}
          <div className="bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-950 text-white rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
            <div className="relative px-6 sm:px-8 pt-8 pb-6">
              <div className="absolute top-0 right-0 w-96 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-bold tracking-wider uppercase mb-3">
                  <Star className="w-3 h-3" />
                  Growth Hub &amp; Marketing Advisor
                </div>
                <h3 className="text-2xl font-black tracking-tight">Seu Consultor de Crescimento</h3>
                <p className="text-sm text-gray-400 mt-1">Estratégias práticas e acionáveis para crescer seu estúdio</p>
              </div>
            </div>
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
              ) : growthTab === 'clientes' ? (
                <div className="space-y-8">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400 mb-4 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 animate-pulse" />
                      Oportunidades de Reativação por Cliente
                    </h4>
                    {clientRecommendations.length === 0 ? (
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-gray-400 text-xs">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        Nenhuma sugestão automatizada de remarketing baseada nas datas de eventos passados no momento.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {clientRecommendations.map((rec, i) => (
                          <div key={i} className="bg-gradient-to-br from-violet-950/20 to-slate-900/40 rounded-2xl p-5 border border-violet-500/20 flex flex-col justify-between hover:border-violet-500/40 transition-colors">
                            <div>
                              <div className="flex items-start justify-between mb-2">
                                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded bg-violet-500/20 text-violet-300 uppercase tracking-wider">
                                  {rec.tag}
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium">
                                  Há {rec.diasPassados} dias
                                </span>
                              </div>
                              <h5 className="font-black text-white text-sm mb-1 truncate">{rec.clienteNome}</h5>
                              <p className="text-[10px] text-gray-500 mb-3">
                                {rec.tipoEvento} · {fmt(rec.dataEvento)}
                              </p>
                              <p className="text-xs font-bold text-violet-200 mb-1.5">{rec.titulo}</p>
                              <p className="text-[11px] text-gray-300 leading-relaxed mb-4">{rec.dica}</p>
                            </div>
                            <button
                              onClick={() => {
                                const waUrl = rec.telefone
                                  ? `https://wa.me/${cleanPhone(rec.telefone)}?text=${encodeURIComponent(rec.mensagemWhatsapp)}`
                                  : `https://wa.me/?text=${encodeURIComponent(rec.mensagemWhatsapp)}`;
                                window.open(waUrl, '_blank');
                              }}
                              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors mt-auto shadow-sm"
                            >
                              <MessageCircle className="w-4 h-4" />
                              Enviar Script no WhatsApp
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="pt-6 border-t border-white/10">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
                      💡 Estratégias Gerais de Remarketing
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {GROWTH_TIPS.clientes.map((tip, i) => (
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
                  </div>
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

          {/* ── ROI SIMULATOR ── */}
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
                <div className="space-y-6">
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
      )}

    </div>
  );
}
