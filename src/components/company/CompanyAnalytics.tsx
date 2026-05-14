
import { TrendingUp, DollarSign, ShoppingBag, Target } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useCompanyTransactions } from '../../hooks/useCompanyTransactions';
import { useCompanyMetrics } from '../../hooks/useCompanyMetrics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CompanyAnalyticsProps {
  userId: string;
}

export function CompanyAnalytics({ userId }: CompanyAnalyticsProps) {
  const { transactions, categories, loading } = useCompanyTransactions(userId);
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


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics Anual</h2>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-4 py-2 border rounded-lg"
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
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-green-700">Receita Total</p>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(yearlyMetrics.receitas)}</p>
          <p className="text-xs text-green-600 mt-1">{yearlyMetrics.quantidade_vendas} vendas</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-red-700">Despesa Total</p>
            <TrendingUp className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-900">{formatCurrency(yearlyMetrics.despesas)}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-blue-700">Lucro Líquido</p>
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(yearlyMetrics.lucro)}</p>
          {yearlyMetrics.crescimento_percentual !== undefined && (
            <p className={`text-xs mt-1 ${
              yearlyMetrics.crescimento_percentual >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {yearlyMetrics.crescimento_percentual >= 0 ? '+' : ''}
              {yearlyMetrics.crescimento_percentual.toFixed(1)}% vs ano anterior
            </p>
          )}
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-purple-700">Ticket Médio</p>
            <ShoppingBag className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-900">{formatCurrency(yearlyMetrics.ticket_medio)}</p>
        </div>
      </div>

      {yearProjection && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Projeção para {selectedYear}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Receitas até agora</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(yearProjection.receitas_ate_agora)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Média mensal</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(yearProjection.media_mensal)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Projeção do ano</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(yearProjection.projecao_ano)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Evolução do Lucro Mensal</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Line type="monotone" dataKey="Lucro" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Top 5 Categorias de Receita</h3>
          {topRevenueCategories.length > 0 ? (
            <div className="space-y-3">
              {topRevenueCategories.map((cat, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.cor }}
                    />
                    <span className="text-sm text-gray-700">{cat.nome}</span>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    {formatCurrency(cat.total)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">Nenhuma receita registrada</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Top 5 Categorias de Despesa</h3>
          {topExpenseCategories.length > 0 ? (
            <div className="space-y-3">
              {topExpenseCategories.map((cat, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.cor }}
                    />
                    <span className="text-sm text-gray-700">{cat.nome}</span>
                  </div>
                  <span className="text-sm font-semibold text-red-600">
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

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Resumo Mensal {selectedYear}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mês</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Receitas</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Despesas</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Lucro</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Vendas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {monthByMonthBreakdown.map(month => (
                <tr key={month.mes} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{month.nome}</td>
                  <td className="px-4 py-2 text-sm text-right text-green-600 font-semibold">
                    {formatCurrency(month.receitas)}
                  </td>
                  <td className="px-4 py-2 text-sm text-right text-red-600 font-semibold">
                    {formatCurrency(month.despesas)}
                  </td>
                  <td className={`px-4 py-2 text-sm text-right font-bold ${
                    month.lucro >= 0 ? 'text-blue-600' : 'text-orange-600'
                  }`}>
                    {formatCurrency(month.lucro)}
                  </td>
                  <td className="px-4 py-2 text-sm text-center text-gray-600">{month.quantidade}</td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold">
                <td className="px-4 py-2 text-sm">TOTAL</td>
                <td className="px-4 py-2 text-sm text-right text-green-700">
                  {formatCurrency(yearlyMetrics.receitas)}
                </td>
                <td className="px-4 py-2 text-sm text-right text-red-700">
                  {formatCurrency(yearlyMetrics.despesas)}
                </td>
                <td className={`px-4 py-2 text-sm text-right ${
                  yearlyMetrics.lucro >= 0 ? 'text-blue-700' : 'text-orange-700'
                }`}>
                  {formatCurrency(yearlyMetrics.lucro)}
                </td>
                <td className="px-4 py-2 text-sm text-center text-gray-700">
                  {yearlyMetrics.quantidade_vendas}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {seasonalityAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2">Meses Mais Fortes</h4>
            <p className="text-sm text-green-700">
              {seasonalityAnalysis.stronger_months.join(', ')}
            </p>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h4 className="font-semibold text-orange-900 mb-2">Meses Mais Fracos</h4>
            <p className="text-sm text-orange-700">
              {seasonalityAnalysis.weaker_months.join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
