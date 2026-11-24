import { useState } from 'react';
import {
  AlertOctagon,
  Lightbulb,
  Building,
  Activity,
  ArrowUpRight,
} from 'lucide-react';

export function WhatsAppBusinessAdvisory() {
  const [tasks, setTasks] = useState([
    {
      id: '1',
      title: 'Follow-up Prioritário: Mariana & Lucas',
      desc: 'Lead abriu a proposta interativa 4 vezes nas últimas 24 horas. Momento ideal para oferecer brinde de mini-álbum e fechar.',
      impact: 'R$ 4.500 em potencial',
      completed: false
    },
    {
      id: '2',
      title: 'Ajuste de Taxa Geográfica de Deslocamento',
      desc: 'Cruzamento com a Gestão Financeira: Os gastos com deslocamento rural consumiram 8.2% do faturamento de ensaios este mês.',
      impact: '+R$ 1.200 em margem de lucro',
      completed: false
    },
    {
      id: '3',
      title: 'Oferta de Upsell de Álbum Impresso',
      desc: '12 contratos fechados este mês não possuem álbum impresso incluído. Enviar catálogo com desconto de 15% para compras prévias.',
      impact: 'R$ 8.400 em faturamento extra',
      completed: true
    }
  ]);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  return (
    <div className="space-y-6">
      {/* 📊 Seção 1: Cruzamento Comercial + Gestão Financeira da Empresa */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Inteligência Financeira da Empresa + Comercial</h3>
              <p className="text-xs text-slate-400">
                O Gemini cruza a taxa de conversão do WhatsApp com a saúde financeira, receitas, saídas e margem de lucro salvas na aba Empresa.
              </p>
            </div>
          </div>

          <span className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 self-start sm:self-auto">
            <Activity className="w-4 h-4" />
            <span>Saúde Financeira: Excelente (88/100)</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="text-xs text-slate-400 font-medium block">Entradas do Mês (Receitas)</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-emerald-400">R$ 28.500,00</span>
              <span className="text-xs text-emerald-400 flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> +18.4%
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block">75% originados via WhatsApp AI</span>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="text-xs text-slate-400 font-medium block">Gastos / Custos Fixos e Variáveis</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-rose-400">R$ 8.240,00</span>
              <span className="text-xs text-slate-400">28.9% da receita</span>
            </div>
            <span className="text-[11px] text-slate-500 block">Custos de estúdio, equipe e combustível</span>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="text-xs text-slate-400 font-medium block">Margem de Lucro Líquido</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-indigo-400">71.1%</span>
              <span className="text-xs text-emerald-400 font-medium">Líquido: R$ 20.260</span>
            </div>
            <span className="text-[11px] text-slate-500 block">Resultado positivo no fluxo de caixa</span>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="text-xs text-slate-400 font-medium block">Tempo Médio de Atendimento</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-slate-100">42 segundos</span>
              <span className="text-xs text-emerald-400">Imediato</span>
            </div>
            <span className="text-[11px] text-slate-500 block">Zero fila de espera para novos noivos</span>
          </div>
        </div>
      </div>

      {/* 🚨 Seção 2: Diagnóstico de Erros & To-Do de Vendas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Diagnóstico de Erros */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              Diagnóstico: Onde Você Está Errando nas Negociações?
            </h3>
            <span className="text-xs bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-full border border-rose-500/20 font-medium">
              3 Insights Encontrados
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-rose-300 text-xs">1. Custos de Deslocamento Consumindo Lucro</span>
                <span className="text-[11px] text-slate-500">Alerta da Empresa</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cruzamento com a Gestão Financeira: Os gastos com combustível e pedágio para eventos fora da cidade consumiram R$ 1.450 este mês. Recomendamos ajustar a taxa geográfica de deslocamento no Priceus.
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-300 text-xs">2. Demora na Resposta aos Sábados</span>
                <span className="text-[11px] text-slate-500">Perda de 30% dos Leads</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Antes de ativar o Gemini, mensagens recebidas nos sábados à tarde levavam 6h em média para serem respondidas. A automação evitou a perda de R$ 9.000 em propostas!
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-indigo-300 text-xs">3. Oportunidade de Upsell em Álbuns</span>
                <span className="text-[11px] text-slate-500">Receita Extra</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                12 casamentos fechados este mês não incluem álbum impresso. Oferecer o catálogo com parcelamento em 6x pode gerar +R$ 8.400 em entradas no caixa.
              </p>
            </div>
          </div>
        </div>

        {/* Coluna Direita: To-Do de Vendas Recomendações */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              Ações Recomendadas Pela IA (To-Do de Vendas)
            </h3>
            <span className="text-xs text-emerald-400 font-medium">Recomendações Diárias</span>
          </div>

          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={`p-4 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                  task.completed
                    ? 'bg-slate-950/40 border-slate-800 opacity-60'
                    : 'bg-slate-950 border-slate-800 hover:border-emerald-500/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => {}}
                  className="mt-1 rounded text-emerald-500 focus:ring-0"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold text-xs ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {task.title}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {task.impact}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{task.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
