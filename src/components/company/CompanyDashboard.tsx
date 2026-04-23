import { useState } from 'react';
import { DollarSign, TrendingUp, Clock, PiggyBank, Plus, Calendar, Check, X } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useCompanyTransactions } from '../../hooks/useCompanyTransactions';
import { useCompanyMetrics } from '../../hooks/useCompanyMetrics';
import { HourValuePanel } from './HourValuePanel';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface CompanyDashboardProps {
  userId: string;
  onNewTransaction: () => void;
}

const PendingTransactionsPanel = ({ transactions }: { transactions: any[] }) => {
  const now = new Date();
  const startOfToday = new Date(now.setHours(0, 0, 0, 0));
  const next7Days = new Date(new Date().setDate(startOfToday.getDate() + 7));
  const next30Days = new Date(new Date().setDate(startOfToday.getDate() + 30));

  const pending = transactions.filter(t => t.status === 'pendente');
  const overdue = pending.filter(t => new Date(t.data) < startOfToday);
  const dueIn7Days = pending.filter(t => new Date(t.data) >= startOfToday && new Date(t.data) <= next7Days);
  const dueIn30Days = pending.filter(t => new Date(t.data) > next7Days && new Date(t.data) <= next30Days);

  const renderTransactionList = (txs: any[], title: string) => (
    <div>
      <h4 className="text-sm font-semibold text-gray-600 mb-2">{title}</h4>
      {txs.length > 0 ? txs.map(t => (
        <div key={t.id} className={`flex justify-between items-center text-sm p-2 rounded ${t.tipo === 'receita' ? 'bg-green-50' : 'bg-red-50'}`}>
          <span className="text-gray-800">{t.descricao}</span>
          <span className={`font-bold ${t.tipo === 'receita' ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(t.valor)}</span>
        </div>
      )) : <p className="text-xs text-gray-500 italic">Nenhuma transação.</p>}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-yellow-100 text-yellow-600 p-3 rounded-lg">
          <Calendar className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Contas a Pagar e Receber</h3>
          <p className="text-sm text-gray-500">Visão geral de transações pendentes.</p>
        </div>
      </div>
      <div className="space-y-4">
        {renderTransactionList(overdue, 'Vencidas')}
        {renderTransactionList(dueIn7Days, 'Vencendo nos próximos 7 dias')}
        {renderTransactionList(dueIn30Days, 'Vencendo nos próximos 30 dias')}
      </div>
    </div>
  );
};

const TransactionCalculator = ({ selectedTransactions }: { selectedTransactions: any[] }) => {
  if (selectedTransactions.length === 0) return null;

  const total = selectedTransactions.reduce((sum, t) => sum + Number(t.valor), 0);
  const paidTotal = selectedTransactions.filter(t => t.status === 'pago').reduce((sum, t) => sum + Number(t.valor), 0);
  const pendingTotal = selectedTransactions.filter(t => t.status === 'pendente').reduce((sum, t) => sum + Number(t.valor), 0);

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl p-4 w-80 border border-gray-200 z-50">
      <h4 className="font-bold text-gray-800 mb-3">Calculadora de Seleção</h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Itens selecionados:</span>
          <span className="font-medium">{selectedTransactions.length}</span>
        </div>
        <div className="flex justify-between text-green-600">
          <span className="font-medium">Total Pago:</span>
          <span className="font-bold">{formatCurrency(paidTotal)}</span>
        </div>
        <div className="flex justify-between text-yellow-600">
          <span className="font-medium">Total Pendente:</span>
          <span className="font-bold">{formatCurrency(pendingTotal)}</span>
        </div>
        <div className="flex justify-between text-blue-700 font-bold text-base border-t pt-2 mt-2">
          <span>Total Geral:</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
};

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

export function CompanyDashboard({ userId, onNewTransaction }: CompanyDashboardProps) {
  const { transactions, categories, loading } = useCompanyTransactions(userId);
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');

  const {
    selectedYear,
    selectedMonth,
    setSelectedYear,
    setSelectedMonth,
    availableYears,
    monthlyMetrics,
    yearlyMetrics,
    monthByMonthBreakdown,
    pendingReceivables,
  } = useCompanyMetrics(transactions);

  const metrics = viewMode === 'monthly' ? monthlyMetrics : yearlyMetrics;

  const chartData = viewMode === 'monthly'
    ? monthByMonthBreakdown.slice(0, 6).reverse().map(m => ({
        name: m.nome.substring(0, 3),
        Receitas: m.receitas,
        Despesas: m.despesas,
      }))
    : monthByMonthBreakdown.map(m => ({
        name: m.nome.substring(0, 3),
        Receitas: m.receitas,
        Despesas: m.despesas,
      }));

  const revenueByCategory = categories
    .filter(c => c.tipo === 'receita')
    .map(cat => {
      const total = transactions.filter(t => {
        const transactionDate = new Date(t.data + 'T00:00:00'); // Garante consistência de fuso horário
        const matchesYear = transactionDate.getFullYear() === selectedYear;
        const matchesMonth = viewMode === 'monthly' ? transactionDate.getMonth() + 1 === selectedMonth : true;
        return t.categoria_id === cat.id && t.status === 'pago' && matchesYear && matchesMonth;
      })
        .reduce((sum, t) => sum + Number(t.valor), 0);
      return { name: cat.nome, value: total, color: cat.cor };
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
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
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'monthly'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📅 Mensal
            </button>
            <button
              onClick={() => setViewMode('yearly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'yearly'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📆 Anual
            </button>
          </div>

          {viewMode === 'monthly' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 border rounded-lg"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>
                  {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][m - 1]}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg"
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

        <button
          onClick={onNewTransaction}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Venda Rápida
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {viewMode === 'monthly' ? `Saldo do Mês ${metrics.isFuture ? '(Pendente)' : ''}` : 'Lucro Anual'}
              </p>
              <p className={`text-2xl font-bold mt-1 ${
                metrics.lucro >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(metrics.lucro)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              metrics.lucro >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <PiggyBank className={`w-6 h-6 ${
                metrics.lucro >= 0 ? 'text-green-600' : 'text-red-600'
              }`} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total a Receber</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {formatCurrency(pendingReceivables)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {viewMode === 'monthly' ? `Vendas do Mês ${metrics.isFuture ? '(Pendente)' : ''}` : 'Vendas do Ano'}
              </p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {formatCurrency(metrics.receitas)}
              </p>
              {viewMode === 'monthly' && !metrics.isFuture && metrics.pendingReceitas > 0 && (
                <p className="text-xs text-yellow-600 mt-1">
                  (+ {formatCurrency(metrics.pendingReceitas)} pendente)
                </p>
              )}
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ticket Médio</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {formatCurrency(metrics.ticket_medio)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'yearly' && 'melhor_mes' in yearlyMetrics && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Melhor mês: {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][yearlyMetrics.melhor_mes.mes - 1]}
                ({formatCurrency(yearlyMetrics.melhor_mes.valor)})
              </p>
              {yearlyMetrics.crescimento_percentual !== undefined && (
                <p className="text-sm text-gray-600 mt-1">
                  Crescimento anual: {yearlyMetrics.crescimento_percentual > 0 ? '+' : ''}
                  {yearlyMetrics.crescimento_percentual.toFixed(1)}% vs ano anterior
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Painel de Contas a Pagar e Receber */}
      <PendingTransactionsPanel transactions={transactions} />

      {/* ── Calculadora de Valor por Hora ── */}
      {(() => {
        // Média mensal dos últimos 12 meses com dados
        const mesesComDados = monthByMonthBreakdown.filter(m => m.receitas > 0 || m.despesas > 0);
        const numMeses = Math.max(1, mesesComDados.length);
        const mediaDespesasMensal = yearlyMetrics.despesas / numMeses;
        const mediaReceitasMensal = yearlyMetrics.receitas / numMeses;
        return (
          <HourValuePanel
            userId={userId}
            mediaDespesasMensal={mediaDespesasMensal}
            mediaReceitasMensal={mediaReceitasMensal}
          />
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            {viewMode === 'monthly' ? 'Últimos 6 Meses' : 'Evolução Anual'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="Receitas" fill="#22c55e" />
              <Bar dataKey="Despesas" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Receitas por Categoria</h3>
          {revenueByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {revenueByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              Nenhuma receita registrada
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Últimas Transações</h3>
        {recentTransactions.length > 0 ? (
          <div className="space-y-2">
            {recentTransactions.map(transaction => (
              <div key={transaction.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="flex-1">
                  <p className="font-medium">{transaction.descricao}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(transaction.data).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    transaction.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.tipo === 'receita' ? '+' : '-'} {formatCurrency(Number(transaction.valor))}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    transaction.status === 'pago'
                      ? 'bg-green-100 text-green-700'
                      : transaction.status === 'pendente'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {transaction.status === 'pago' ? 'Pago' : transaction.status === 'pendente' ? 'Pendente' : 'Cancelado'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">Nenhuma transação registrada</p>
        )}
      </div>
    </div>
  );
}
