
import { useState } from 'react';
import { TrendingUp, DollarSign, ShoppingBag, Target, Users, ArrowRight, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useCompanyTransactions } from '../../hooks/useCompanyTransactions';
import { useCompanyMetrics } from '../../hooks/useCompanyMetrics';
import { useLeadAnalytics } from '../../hooks/useLeadAnalytics';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CompanyAnalyticsProps {
  userId: string;
}

export function CompanyAnalytics({ userId }: CompanyAnalyticsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'financeiro' | 'leads'>('financeiro');
  const { transactions, categories, loading: loadingTransactions } = useCompanyTransactions(userId);
  const {
    metrics: leadMetrics,
    loading: loadingLeads,
    filterPeriod,
    setFilterPeriod
  } = useLeadAnalytics(userId);
  
  const {
    selectedYear,
    setSelectedYear,
    availableYears,
    yearlyMetrics,
    monthByMonthBreakdown,
    seasonalityAnalysis,
    yearProjection,
  } = useCompanyMetrics(transactions);

  const chartData = monthByMonthBreakdown.map(m => ({
    mes: m.nome.substring(0, 3),
    Lucro: m.lucro,
  }));

  const topRevenueCategories = categories
    .filter(c => c.tipo === 'receita')
    .map(cat => {
      const total = transactions
        .filter(t => {
          const date = new Date(t.data);
          return (
            t.categoria_id === cat.id &&
            t.status === 'pago' &&
            date.getFullYear() === selectedYear
          );
        })
        .reduce((sum, t) => sum + Number(t.valor), 0);
      return { nome: cat.nome, total, cor: cat.cor };
    })
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const topExpenseCategories = categories
    .filter(c => c.tipo === 'despesa')
    .map(cat => {
      const total = transactions
        .filter(t => {
          const date = new Date(t.data);
          return (
            t.categoria_id === cat.id &&
            t.status === 'pago' &&
            date.getFullYear() === selectedYear
          );
        })
        .reduce((sum, t) => sum + Number(t.valor), 0);
      return { nome: cat.nome, total, cor: cat.cor };
    })
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  if (loadingTransactions || loadingLeads) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <div className="text-gray-500 text-sm">Carregando métricas da empresa...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub tabs switcher */}
      <div className="flex border-b border-gray-200 dark:border-[rgba(255,255,255,.08)]">
        <button
          onClick={() => setActiveSubTab('financeiro')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'financeiro'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Métricas Financeiras
        </button>
        <button
          onClick={() => setActiveSubTab('leads')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'leads'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <Users className="w-4 h-4" />
          Analytics de Leads
        </button>
      </div>

      {activeSubTab === 'financeiro' ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold dark:text-white">Analytics Anual</h2>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 border rounded-lg dark:bg-[#0a1628] dark:border-[rgba(255,255,255,.08)] dark:text-white"
            >
              {availableYears.length > 0 ? (
                availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))
              ) : (
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
              )}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/10 p-6 rounded-lg border border-green-200 dark:border-green-900/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">Receita Total</p>
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-2xl font-bold text-green-900 dark:text-white">{formatCurrency(yearlyMetrics.receitas)}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">{yearlyMetrics.quantidade_vendas} vendas</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/10 p-6 rounded-lg border border-red-200 dark:border-red-900/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">Despesa Total</p>
                <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-2xl font-bold text-red-900 dark:text-white">{formatCurrency(yearlyMetrics.despesas)}</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/10 p-6 rounded-lg border border-blue-200 dark:border-blue-900/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Lucro Líquido</p>
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-blue-900 dark:text-white">{formatCurrency(yearlyMetrics.lucro)}</p>
              {yearlyMetrics.crescimento_percentual !== undefined && (
                <p className={`text-xs mt-1 ${
                  yearlyMetrics.crescimento_percentual >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {yearlyMetrics.crescimento_percentual >= 0 ? '+' : ''}
                  {yearlyMetrics.crescimento_percentual.toFixed(1)}% vs ano anterior
                </p>
              )}
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/10 p-6 rounded-lg border border-purple-200 dark:border-purple-900/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-purple-700 dark:text-purple-400">Ticket Médio</p>
                <ShoppingBag className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-purple-900 dark:text-white">{formatCurrency(yearlyMetrics.ticket_medio)}</p>
            </div>
          </div>

          {yearProjection && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-[#0a1b32] dark:to-[#071326] p-6 rounded-lg border border-blue-200 dark:border-blue-900/30">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Projeção para {selectedYear}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Receitas até agora</p>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-400">{formatCurrency(yearProjection.receitas_ate_agora)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Média mensal</p>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-400">{formatCurrency(yearProjection.media_mensal)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Projeção do ano</p>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-400">{formatCurrency(yearProjection.projecao_ano)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-[#07101f] p-6 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,.08)]">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Evolução do Lucro Mensal</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mes" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Legend />
                <Line type="monotone" dataKey="Lucro" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#07101f] p-6 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,.08)]">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">Top 5 Categorias de Receita</h3>
              {topRevenueCategories.length > 0 ? (
                <div className="space-y-3">
                  {topRevenueCategories.map((cat, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.cor }}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{cat.nome}</span>
                      </div>
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(cat.total)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">Nenhuma receita registrada</p>
              )}
            </div>

            <div className="bg-white dark:bg-[#07101f] p-6 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,.08)]">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">Top 5 Categorias de Despesa</h3>
              {topExpenseCategories.length > 0 ? (
                <div className="space-y-3">
                  {topExpenseCategories.map((cat, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.cor }}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{cat.nome}</span>
                      </div>
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(cat.total)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">Nenhuma despesa registrada</p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-[#07101f] p-6 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,.08)]">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Resumo Mensal {selectedYear}</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-[#0a1628]">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Mês</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Receitas</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Despesas</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Lucro</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vendas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {monthByMonthBreakdown.map(month => (
                    <tr key={month.mes} className="hover:bg-gray-50 dark:hover:bg-gray-900/35">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">{month.nome}</td>
                      <td className="px-4 py-2 text-sm text-right text-green-600 dark:text-green-400 font-semibold">
                        {formatCurrency(month.receitas)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-red-600 dark:text-red-400 font-semibold">
                        {formatCurrency(month.despesas)}
                      </td>
                      <td className={`px-4 py-2 text-sm text-right font-bold ${
                        month.lucro >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
                      }`}>
                        {formatCurrency(month.lucro)}
                      </td>
                      <td className="px-4 py-2 text-sm text-center text-gray-600 dark:text-gray-400">{month.quantidade}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 dark:bg-[#0a1628] font-bold">
                    <td className="px-4 py-2 text-sm dark:text-white">TOTAL</td>
                    <td className="px-4 py-2 text-sm text-right text-green-700 dark:text-green-400">
                      {formatCurrency(yearlyMetrics.receitas)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-red-700 dark:text-red-400">
                      {formatCurrency(yearlyMetrics.despesas)}
                    </td>
                    <td className={`px-4 py-2 text-sm text-right ${
                      yearlyMetrics.lucro >= 0 ? 'text-blue-700 dark:text-blue-450' : 'text-orange-700 dark:text-orange-400'
                    }`}>
                      {formatCurrency(yearlyMetrics.lucro)}
                    </td>
                    <td className="px-4 py-2 text-sm text-center text-gray-700 dark:text-white">
                      {yearlyMetrics.quantidade_vendas}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {seasonalityAnalysis && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-900/30">
                <h4 className="font-semibold text-green-900 dark:text-green-400 mb-2">Meses Mais Fortes</h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {seasonalityAnalysis.stronger_months.join(', ')}
                </p>
              </div>

              <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-900/30">
                <h4 className="font-semibold text-orange-900 dark:text-orange-400 mb-2">Meses Mais Fracos</h4>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  {seasonalityAnalysis.weaker_months.join(', ')}
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Aba de Leads */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold dark:text-white">Métricas de Leads e Conversão</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                {(['semana', 'mes', 'ano', 'tudo'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setFilterPeriod(period)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      filterPeriod === period
                        ? 'bg-white dark:bg-[#0a1628] text-blue-600 dark:text-blue-450 shadow-sm font-bold'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {period === 'semana' && 'Esta Semana'}
                    {period === 'mes' && 'Este Mês'}
                    {period === 'ano' && 'Este Ano'}
                    {period === 'tudo' && 'Todo Período'}
                  </button>
                ))}
              </div>
              
              <div className="hidden xs:flex items-center gap-2 bg-blue-50 dark:bg-blue-950/20 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900/35 text-xs text-blue-700 dark:text-blue-400 font-medium">
                <Sparkles className="w-4 h-4" />
                Tempo Real
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/40 dark:to-gray-800/20 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-400">Leads Recebidos</p>
                <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{leadMetrics.totalLeads}</p>
              <p className="text-xs text-gray-500 mt-1">Volume total no funil</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/10 p-6 rounded-lg border border-green-200 dark:border-green-900/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">Taxa de Fechamento</p>
                <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-3xl font-bold text-green-900 dark:text-green-400">{leadMetrics.closingRate.toFixed(1)}%</p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">{leadMetrics.statusCounts.convertido} convertidos de {leadMetrics.totalLeads}</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-[#0a1b32] dark:to-[#071326] p-6 rounded-lg border border-blue-200 dark:border-blue-900/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Faturamento Fechado</p>
                <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-blue-900 dark:text-white">{formatCurrency(leadMetrics.closedValue)}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Ticket Médio: {formatCurrency(leadMetrics.ticketMedio)}</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/10 p-6 rounded-lg border border-amber-200 dark:border-amber-900/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Valor em Negociação</p>
                <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-amber-950 dark:text-white">{formatCurrency(leadMetrics.potentialValue)}</p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Leads ativos esperando resposta</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visual Conversion Funnel Card */}
            <div className="bg-white dark:bg-[#07101f] p-6 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,.08)] flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold dark:text-white mb-2">Funil de Vendas</h3>
                <p className="text-xs text-gray-500 mb-6">Taxa de passagem e retenção de leads</p>
                
                <div className="space-y-6">
                  {leadMetrics.funnelData.map((step, idx) => (
                    <div key={idx} className="relative">
                      <div className="flex justify-between items-center mb-1 text-sm font-medium dark:text-white">
                        <span>{step.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 dark:text-gray-400 text-xs">{step.value} leads</span>
                          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-2 py-0.5 rounded text-xs">{step.percentage.toFixed(0)}%</span>
                        </div>
                      </div>
                      
                      {/* Funnel visually descending */}
                      <div className="h-6 w-full bg-gray-100 dark:bg-gray-900 rounded-md overflow-hidden flex">
                        <div
                          className={`h-full flex items-center pl-3 text-[10px] text-white font-bold transition-all duration-500 ${
                            idx === 0 ? 'bg-blue-600' : idx === 1 ? 'bg-blue-500' : 'bg-green-600'
                          }`}
                          style={{ width: `${step.percentage}%` }}
                        >
                          {step.percentage > 10 && `${step.percentage.toFixed(0)}%`}
                        </div>
                      </div>

                      {idx < 2 && (
                        <div className="flex justify-center my-1">
                          <ArrowRight className="w-4 h-4 text-gray-400 transform rotate-90" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-[#0a1628] border border-blue-100 dark:border-blue-900/20 p-4 rounded-lg mt-6 text-xs text-blue-700 dark:text-blue-400">
                💡 **Dica de Closing**: Sua taxa de conversão ideal de micro-SaaS é acima de **20%**. Se sua taxa está abaixo de 10%, avalie personalizar as propostas ocultando os preços intermediários para focar no valor agregado!
              </div>
            </div>

            {/* Monthly Trend chart */}
            <div className="bg-white dark:bg-[#07101f] p-6 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,.08)]">
              <h3 className="text-lg font-semibold mb-2 dark:text-white">Tendência de Conversão (6 Meses)</h3>
              <p className="text-xs text-gray-500 mb-6">Volume de leads recebidos vs. fechamentos efetuados</p>
              
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={leadMetrics.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <Legend />
                  <Bar dataKey="recebidos" name="Leads Recebidos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="fechados" name="Contratos Fechados" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Breakdown Table */}
          <div className="bg-white dark:bg-[#07101f] p-6 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,.08)]">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Detalhamento dos Leads por Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Novo', count: leadMetrics.statusCounts.novo, color: 'bg-blue-500' },
                { label: 'Contatado', count: leadMetrics.statusCounts.contatado, color: 'bg-amber-500' },
                { label: 'Convertido', count: leadMetrics.statusCounts.convertido, color: 'bg-green-500' },
                { label: 'Perdido', count: leadMetrics.statusCounts.perdido, color: 'bg-red-500' },
                { label: 'Abandonado', count: leadMetrics.statusCounts.abandonado, color: 'bg-gray-500' },
              ].map((status, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-gray-50 dark:bg-[#0a1628] border border-gray-150 dark:border-gray-800 text-center">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${status.color} mr-2`}></span>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">{status.label}</span>
                  <span className="text-2xl font-bold dark:text-white">{status.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
