import { useState, useEffect, useMemo, useRef } from 'react';
import { Clock, Target, TrendingUp, Lightbulb, Zap, DollarSign, Calendar, BarChart2, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface HourValuePanelProps {
  userId: string;
  mediaDespesasMensal: number;
  mediaReceitasMensal: number;
}

// ── Metric Card ────────────────────────────────────────────
function MetricCard({ label, value, sub, color, icon: Icon }: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div className={`rounded-2xl p-5 border ${color} flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold opacity-75">{label}</span>
        <Icon className="w-5 h-5 opacity-60" />
      </div>
      <p className="text-2xl font-black tracking-tight">{value}</p>
      {sub && <p className="text-xs opacity-55 leading-snug">{sub}</p>}
    </div>
  );
}

// ── Insight Card ──────────────────────────────────────────
function InsightCard({ icon: Icon, title, desc, accent }: {
  icon: React.ElementType;
  title: string;
  desc: string;
  accent: string;
}) {
  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${accent} items-start`}>
      <div className={`p-2 rounded-lg ${accent} flex-shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-sm font-bold leading-tight mb-0.5">{title}</p>
        <p className="text-xs opacity-65 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ── Input Row ─────────────────────────────────────────────
function InputRow({ label, hint, value, onChange, min, max, step, prefix, suffix }: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</label>
        <span className="text-xs text-gray-400 dark:text-gray-500">{hint}</span>
      </div>
      <div className="relative flex items-center gap-2">
        {prefix && <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{prefix}</span>}
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
          className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
        />
        {suffix && <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{suffix}</span>}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-gray-200 dark:bg-white/10 accent-emerald-500 cursor-pointer"
      />
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────
function ProgressBar({ percent, color }: { percent: number; color: string }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="w-full h-3 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}


// ─────────────────────────────────────────────────────────
export function HourValuePanel({ userId, mediaDespesasMensal, mediaReceitasMensal }: HourValuePanelProps) {
  const [open, setOpen] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savedIndicator, setSavedIndicator] = useState(false);

  const [horasSemana, setHorasSemana] = useState<number>(40);
  const [diasSemana, setDiasSemana]   = useState<number>(5);
  const [lucroDesejado, setLucroDesejado] = useState<number>(3000);
  const [modoCalculo, setModoCalculo] = useState<'manual' | 'dinamico'>('manual');

  const [dynamicHorasWorkflow, setDynamicHorasWorkflow] = useState<number>(0);
  const [dynamicHorasTasks, setDynamicHorasTasks] = useState<number>(0);
  const [dynamicHorasContracts, setDynamicHorasContracts] = useState<number>(0);

  const isFirstLoad = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load dynamic hours from different sources ─────────────────────────
  const loadDynamicHours = async () => {
    if (!userId) return;
    try {
      // 1. Pending/active workflows (leads with status = 'convertido')
      const { data: leadsWorkflow } = await supabase
        .from('leads')
        .select('workflow')
        .eq('user_id', userId)
        .eq('status', 'convertido');

      let workflowMinutes = 0;
      if (leadsWorkflow) {
        leadsWorkflow.forEach(lead => {
          const steps = Array.isArray(lead.workflow) ? lead.workflow : [];
          steps.forEach((step: any) => {
            if (step.status !== 'concluido' && step.duracao_minutos) {
              workflowMinutes += Number(step.duracao_minutos);
            }
          });
        });
      }
      setDynamicHorasWorkflow(workflowMinutes / 60);

      // 2. Incomplete company tasks
      const { data: tasks } = await supabase
        .from('company_tasks')
        .select('duracao_minutos')
        .eq('user_id', userId)
        .eq('concluida', false);

      let tasksMinutes = 0;
      if (tasks) {
        tasks.forEach(t => {
          if (t.duracao_minutos) {
            tasksMinutes += Number(t.duracao_minutos);
          }
        });
      }
      setDynamicHorasTasks(tasksMinutes / 60);

      // 3. Closed leads in the current month (status = 'finalizado', updated_at in current month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: leadsClosed } = await supabase
        .from('leads')
        .select('orcamento_detalhe')
        .eq('user_id', userId)
        .eq('status', 'finalizado')
        .gte('updated_at', startOfMonth.toISOString());

      let closedMinutes = 0;
      if (leadsClosed) {
        leadsClosed.forEach(lead => {
          const detail = lead.orcamento_detalhe || {};
          const produtos = Array.isArray(detail.produtos) ? detail.produtos : [];
          produtos.forEach((p: any) => {
            const qty = Number(p.quantidade || p.qty || 1);
            const duration = Number(p.duracao_minutos || p.duracao || 0);
            closedMinutes += duration * qty;
          });
        });
      }
      setDynamicHorasContracts(closedMinutes / 60);
    } catch (err) {
      console.error('Erro ao calcular horas dinâmicas:', err);
    }
  };

  // ── Load from Supabase on mount ─────────────────────────
  useEffect(() => {
    if (!userId) return;
    setLoadingConfig(true);
    supabase
      .from('profiles')
      .select('horas_semana, dias_semana, lucro_desejado, modo_calculo_hora')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHorasSemana(data.horas_semana    ?? 40);
          setDiasSemana(data.dias_semana      ?? 5);
          setLucroDesejado(data.lucro_desejado ?? 3000);
          setModoCalculo((data.modo_calculo_hora as 'manual' | 'dinamico') ?? 'manual');
        }
      })
      .then(() => {
        setLoadingConfig(false);
        setTimeout(() => { isFirstLoad.current = false; }, 200);
      }, () => {
        setLoadingConfig(false);
        setTimeout(() => { isFirstLoad.current = false; }, 200);
      });
  }, [userId]);

  // Load dynamic hours when in dynamic mode
  useEffect(() => {
    if (userId && modoCalculo === 'dinamico') {
      loadDynamicHours();
    }
  }, [userId, modoCalculo]);

  // ── Debounced save (800ms) ──────────────────────────────
  useEffect(() => {
    if (isFirstLoad.current || loadingConfig) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          horas_semana: horasSemana, 
          dias_semana: diasSemana, 
          lucro_desejado: lucroDesejado,
          modo_calculo_hora: modoCalculo
        })
        .eq('id', userId);
      if (!error) {
        setSavedIndicator(true);
        setTimeout(() => setSavedIndicator(false), 2500);
      }
    }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [horasSemana, diasSemana, lucroDesejado, modoCalculo, userId, loadingConfig]);

  // ── Cálculos ──────────────────────────────────────────
  const SEMANAS_MES = 4.33;

  const custosFixosMensal = Math.max(0, mediaDespesasMensal);
  const metaReceita       = custosFixosMensal + lucroDesejado;

  const totalDynamicHours = dynamicHorasWorkflow + dynamicHorasTasks + dynamicHorasContracts;
  const horasMensal       = modoCalculo === 'dinamico' ? totalDynamicHours : (horasSemana * SEMANAS_MES);
  const horasSemanaCalculada = modoCalculo === 'dinamico' ? (horasMensal / SEMANAS_MES) : horasSemana;
  const horasDia          = diasSemana > 0 ? horasSemanaCalculada / diasSemana : 0;

  const valorHora         = horasMensal > 0 ? metaReceita / horasMensal : 0;
  const valorDia          = valorHora * horasDia;
  const valorSemana       = valorHora * horasSemanaCalculada;
  const valorMes          = metaReceita;
  const lucroAtual        = mediaReceitasMensal - mediaDespesasMensal;
  const coberturaPercent  = metaReceita > 0 ? (mediaReceitasMensal / metaReceita) * 100 : 0;
  const faltaParaMeta     = Math.max(0, metaReceita - mediaReceitasMensal);
  const jaUltrapassou     = mediaReceitasMensal >= metaReceita;
  const investMensal      = Math.max(0, lucroAtual) * 0.1;
  const patrimonioAnual   = investMensal * 12 * 1.1;

  // ── Insights ──────────────────────────────────────────
  const insights = useMemo(() => {
    const list = [];

    if (jaUltrapassou) {
      list.push({
        icon: Zap,
        title: '🎉 Parabéns! Meta atingida',
        desc: `Suas receitas superam sua meta em ${formatCurrency(mediaReceitasMensal - metaReceita)}. Considere reinvestir o excedente.`,
        accent: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
      });
    } else if (faltaParaMeta > 0) {
      list.push({
        icon: Target,
        title: `Faltam ${formatCurrency(faltaParaMeta)} para sua meta`,
        desc: `Você está cobrindo ${coberturaPercent.toFixed(0)}% da meta. Cada hora trabalhada vale ${formatCurrency(valorHora)} — otimize seu tempo!`,
        accent: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
      });
    }

    if (lucroAtual > 0 && investMensal > 0) {
      list.push({
        icon: TrendingUp,
        title: 'Estratégia de investimento',
        desc: `Investindo 10% do seu lucro (${formatCurrency(investMensal)}/mês) você acumularia ~${formatCurrency(patrimonioAnual)} em 12 meses.`,
        accent: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
      });
    }

    if (valorHora > 0) {
      list.push({
        icon: Clock,
        title: 'Impacto de cada hora',
        desc: `1 hora a mais por semana = +${formatCurrency(valorHora * SEMANAS_MES)}/mês. Automatize processos e ganhe tempo valioso.`,
        accent: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200',
      });
    }

    list.push({
      icon: Lightbulb,
      title: 'Precificação saudável',
      desc: `Com ${horasSemanaCalculada.toFixed(1)}h/semana, seu valor mínimo por hora é ${formatCurrency(valorHora)} para cobrir custos e atingir ${formatCurrency(lucroDesejado)}/mês de lucro.`,
      accent: 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300',
    });

    return list;
  }, [jaUltrapassou, faltaParaMeta, coberturaPercent, valorHora, lucroAtual, investMensal, patrimonioAnual, horasSemanaCalculada, lucroDesejado, metaReceita, mediaReceitasMensal]);

  return (
    <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg overflow-hidden">
      {/* ── Header ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Calculadora do Valor por Hora</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Saiba quanto seu tempo vale e quanto trabalhar para atingir seus objetivos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Saved indicator */}
          {savedIndicator && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">
              <Check className="w-3.5 h-3.5" /> Salvo
            </span>
          )}
          {loadingConfig && (
            <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          )}
          {open
            ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
            : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
          }
        </div>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-6">
          <div className="h-px bg-gray-100 dark:bg-white/10" />

          {/* ── Modo de Cálculo ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/10">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Modo de Cálculo das Horas</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Escolha se quer definir suas horas manualmente ou calculá-las dinamicamente a partir dos workflows, tarefas administrativas e leads fechados.
              </p>
            </div>
            <div className="flex bg-gray-100 dark:bg-white/10 p-1 rounded-xl w-fit self-start sm:self-center">
              <button
                onClick={() => setModoCalculo('manual')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  modoCalculo === 'manual'
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Manual
              </button>
              <button
                onClick={() => setModoCalculo('dinamico')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  modoCalculo === 'dinamico'
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Dinâmico
              </button>
            </div>
          </div>

          {/* ── Detalhamento Dinâmico ── */}
          {modoCalculo === 'dinamico' && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <BarChart2 className="w-4 h-4" />
                <span className="text-sm font-bold">Detalhamento das Horas Dinâmicas</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                As suas horas mensais foram calculadas dinamicamente com base nas suas atividades atuais e projetos concluídos no mês corrente:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-white dark:bg-[#0c1e35] p-3 rounded-lg border border-gray-100 dark:border-white/5 space-y-1">
                  <span className="text-gray-400 dark:text-gray-500">Workflows Ativos</span>
                  <p className="text-base font-bold text-gray-900 dark:text-white">
                    {dynamicHorasWorkflow.toFixed(1)} <span className="text-xs font-medium">horas</span>
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Etapas pendentes</p>
                </div>
                <div className="bg-white dark:bg-[#0c1e35] p-3 rounded-lg border border-gray-100 dark:border-white/5 space-y-1">
                  <span className="text-gray-400 dark:text-gray-500">Tarefas Administrativas</span>
                  <p className="text-base font-bold text-gray-900 dark:text-white">
                    {dynamicHorasTasks.toFixed(1)} <span className="text-xs font-medium">horas</span>
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Meu Dia (incompletas)</p>
                </div>
                <div className="bg-white dark:bg-[#0c1e35] p-3 rounded-lg border border-gray-100 dark:border-white/5 space-y-1">
                  <span className="text-gray-400 dark:text-gray-500">Projetos Fechados (Mês)</span>
                  <p className="text-base font-bold text-gray-900 dark:text-white">
                    {dynamicHorasContracts.toFixed(1)} <span className="text-xs font-medium">horas</span>
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Duração dos produtos</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-500/10">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Total de Horas Dinâmicas no Mês</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {totalDynamicHours.toFixed(1)}h / mês (~{(totalDynamicHours / SEMANAS_MES).toFixed(1)}h/sem)
                </span>
              </div>
            </div>
          )}

          {/* ── Inputs ── */}
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
              Suas configurações
              <span className="ml-2 normal-case font-normal text-gray-300 dark:text-gray-600">• salvo automaticamente no seu perfil</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <InputRow 
                label="Horas por semana" 
                hint="Quanto você trabalha" 
                value={Math.round(horasSemanaCalculada)} 
                onChange={setHorasSemana} 
                min={1} 
                max={80} 
                step={1} 
                suffix="h" 
                disabled={modoCalculo === 'dinamico'}
              />
              <InputRow 
                label="Dias úteis por semana" 
                hint="Dias que você trabalha" 
                value={diasSemana} 
                onChange={setDiasSemana} 
                min={1} 
                max={7} 
                step={1} 
                suffix="dias" 
              />
              <InputRow 
                label="Lucro desejado" 
                hint="Meta de lucro mensal" 
                value={lucroDesejado} 
                onChange={setLucroDesejado} 
                min={0} 
                max={100000} 
                step={100} 
                prefix="R$" 
              />
            </div>
          </div>

          {/* ── Resumo de custos ── */}
          <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/10">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-gray-400 dark:text-gray-500 text-xs mb-1">Custos fixos/mês</p>
                <p className="font-bold text-red-600 dark:text-red-400 text-lg">{formatCurrency(custosFixosMensal)}</p>
              </div>
              <div>
                <p className="text-gray-400 dark:text-gray-500 text-xs mb-1">Lucro desejado/mês</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">+ {formatCurrency(lucroDesejado)}</p>
              </div>
              <div className="border-l border-gray-200 dark:border-white/10 pl-6">
                <p className="text-gray-400 dark:text-gray-500 text-xs mb-1">Meta total de receita</p>
                <p className="font-black text-gray-900 dark:text-white text-xl">{formatCurrency(metaReceita)}</p>
              </div>
              <div>
                <p className="text-gray-400 dark:text-gray-500 text-xs mb-1">Receita atual/mês</p>
                <p className={`font-bold text-lg ${lucroAtual >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(mediaReceitasMensal)}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Cobertura da meta</span>
                <span className="font-bold">{coberturaPercent.toFixed(0)}%</span>
              </div>
              <ProgressBar
                percent={coberturaPercent}
                color={coberturaPercent >= 100 ? 'bg-emerald-500' : coberturaPercent >= 70 ? 'bg-amber-400' : 'bg-red-400'}
              />
              {!jaUltrapassou && faltaParaMeta > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Faltam {formatCurrency(faltaParaMeta)}/mês para atingir sua meta
                </p>
              )}
              {jaUltrapassou && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  ✅ Meta superada! Excedente de {formatCurrency(mediaReceitasMensal - metaReceita)}/mês
                </p>
              )}
            </div>
          </div>

          {/* ── Metric Cards ── */}
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Seu tempo vale</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard label="Por hora" value={formatCurrency(valorHora)} sub={`Base: ${horasMensal.toFixed(0)}h/mês`} icon={Clock}
                color="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300" />
              <MetricCard label="Por dia" value={formatCurrency(valorDia)} sub={`${horasDia.toFixed(1)}h de trabalho`} icon={Calendar}
                color="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300" />
              <MetricCard label="Por semana" value={formatCurrency(valorSemana)} sub={`${horasSemanaCalculada.toFixed(1)}h trabalhadas`} icon={BarChart2}
                color="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300" />
              <MetricCard label="Por mês" value={formatCurrency(valorMes)} sub="Meta + custos" icon={DollarSign}
                color="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300" />
            </div>
          </div>

          {/* ── Insights ── */}
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
              <Lightbulb className="w-3.5 h-3.5 inline mr-1.5 opacity-60" />
              Insights personalizados
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {insights.map((insight, i) => (
                <InsightCard key={i} {...insight} />
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-300 dark:text-gray-600 text-center leading-relaxed">
            * Cálculos baseados na média mensal das transações registradas. Ajuste as entradas para simular diferentes cenários.
          </p>
        </div>
      )}
    </div>
  );
}

