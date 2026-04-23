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

  const isFirstLoad = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load from Supabase on mount ─────────────────────────
  useEffect(() => {
    if (!userId) return;
    setLoadingConfig(true);
    supabase
      .from('profiles')
      .select('horas_semana, dias_semana, lucro_desejado')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHorasSemana(data.horas_semana    ?? 40);
          setDiasSemana(data.dias_semana      ?? 5);
          setLucroDesejado(data.lucro_desejado ?? 3000);
        }
      })
      .finally(() => {
        setLoadingConfig(false);
        setTimeout(() => { isFirstLoad.current = false; }, 200);
      });
  }, [userId]);

  // ── Debounced save (800ms) ──────────────────────────────
  useEffect(() => {
    if (isFirstLoad.current || loadingConfig) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ horas_semana: horasSemana, dias_semana: diasSemana, lucro_desejado: lucroDesejado })
        .eq('id', userId);
      if (!error) {
        setSavedIndicator(true);
        setTimeout(() => setSavedIndicator(false), 2500);
      }
    }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [horasSemana, diasSemana, lucroDesejado, userId, loadingConfig]);

  // ── Cálculos ──────────────────────────────────────────
  const SEMANAS_MES = 4.33;

  const custosFixosMensal = Math.max(0, mediaDespesasMensal);
  const metaReceita       = custosFixosMensal + lucroDesejado;
  const horasMensal       = horasSemana * SEMANAS_MES;
  const horasDia          = diasSemana > 0 ? horasSemana / diasSemana : 0;
  const valorHora         = horasMensal > 0 ? metaReceita / horasMensal : 0;
  const valorDia          = valorHora * horasDia;
  const valorSemana       = valorHora * horasSemana;
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
      desc: `Com ${horasSemana}h/semana, seu valor mínimo por hora é ${formatCurrency(valorHora)} para cobrir custos e atingir ${formatCurrency(lucroDesejado)}/mês de lucro.`,
      accent: 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300',
    });

    return list;
  }, [jaUltrapassou, faltaParaMeta, coberturaPercent, valorHora, lucroAtual, investMensal, patrimonioAnual, horasSemana, lucroDesejado, metaReceita, mediaReceitasMensal]);

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

          {/* ── Inputs ── */}
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
              Suas configurações
              <span className="ml-2 normal-case font-normal text-gray-300 dark:text-gray-600">• salvo automaticamente no seu perfil</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <InputRow label="Horas por semana" hint="Quanto você trabalha" value={horasSemana} onChange={setHorasSemana} min={1} max={80} step={1} suffix="h" />
              <InputRow label="Dias úteis por semana" hint="Dias que você trabalha" value={diasSemana} onChange={setDiasSemana} min={1} max={7} step={1} suffix="dias" />
              <InputRow label="Lucro desejado" hint="Meta de lucro mensal" value={lucroDesejado} onChange={setLucroDesejado} min={0} max={100000} step={100} prefix="R$" />
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
              <MetricCard label="Por semana" value={formatCurrency(valorSemana)} sub={`${horasSemana}h trabalhadas`} icon={BarChart2}
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

