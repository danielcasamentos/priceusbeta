import { useMemo } from 'react';
import { CompanyTransaction, CompanyCategory } from './useCompanyTransactions';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Calendar, Award } from 'lucide-react';

export interface Insight {
  id: string;
  title: string;
  description: string;
  type: 'warning' | 'success' | 'info' | 'neutral';
  icon: any;
  priority: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function useCompanyInsights(
  transactions: CompanyTransaction[],
  categories: CompanyCategory[],
  selectedYear: number,
  selectedMonth: number
) {
  const insights = useMemo((): Insight[] => {
    const allInsights: Insight[] = [];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const paidTransactions = transactions.filter(t => t.status === 'pago');
    const currentMonthTransactions = paidTransactions.filter(t => {
      const date = new Date(t.data);
      return date.getFullYear() === currentYear && date.getMonth() + 1 === currentMonth;
    });
    const previousMonthTransactions = paidTransactions.filter(t => {
      const date = new Date(t.data);
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      return date.getFullYear() === prevYear && date.getMonth() + 1 === prevMonth;
    });

    const pendingOld = transactions.filter(t => {
      const daysDiff = Math.floor((Date.now() - new Date(t.data).getTime()) / (1000 * 60 * 60 * 24));
      return t.tipo === 'receita' && t.status === 'pendente' && daysDiff > 30;
    });

    if (pendingOld.length > 0) {
      const total = pendingOld.reduce((sum, t) => sum + Number(t.valor), 0);
      allInsights.push({
        id: 'pending-old',
        title: `${pendingOld.length} valores pendentes há mais de 30 dias`,
        description: `Total de ${formatCurrency(total)} aguardando pagamento`,
        type: 'warning',
        icon: AlertTriangle,
        priority: 10,
      });
    }

    const currentMonthRevenue = currentMonthTransactions
      .filter(t => t.tipo === 'receita')
      .reduce((sum, t) => sum + Number(t.valor), 0);
    const previousMonthRevenue = previousMonthTransactions
      .filter(t => t.tipo === 'receita')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    if (previousMonthRevenue > 0) {
      const percentChange = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;

      if (percentChange < -20) {
        allInsights.push({
          id: 'revenue-drop',
          title: `Receita caiu ${Math.abs(percentChange).toFixed(0)}% este mês`,
          description: 'Considere revisar estratégias de marketing e vendas',
          type: 'warning',
          icon: TrendingDown,
          priority: 9,
        });
      } else if (percentChange > 20) {
        allInsights.push({
          id: 'revenue-growth',
          title: `Receita cresceu ${percentChange.toFixed(0)}% este mês`,
          description: 'Continue com as estratégias que estão funcionando',
          type: 'success',
          icon: TrendingUp,
          priority: 8,
        });
      }
    }

    const currentMonthExpenses = currentMonthTransactions
      .filter(t => t.tipo === 'despesa')
      .reduce((sum, t) => sum + Number(t.valor), 0);
    const previousMonthExpenses = previousMonthTransactions
      .filter(t => t.tipo === 'despesa')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    if (previousMonthExpenses > 0) {
      const percentChange = ((currentMonthExpenses - previousMonthExpenses) / previousMonthExpenses) * 100;

      if (percentChange > 30) {
        allInsights.push({
          id: 'expenses-growth',
          title: `Despesas subiram ${percentChange.toFixed(0)}% este mês`,
          description: 'Revise seus custos e identifique oportunidades de economia',
          type: 'warning',
          icon: TrendingUp,
          priority: 7,
        });
      }
    }

    const yearTransactions = paidTransactions.filter(t => {
      const date = new Date(t.data);
      return date.getFullYear() === selectedYear;
    });

    const monthlyLucros = Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      const monthTrans = yearTransactions.filter(t => {
        const date = new Date(t.data);
        return date.getMonth() + 1 === mes;
      });

      const r = monthTrans.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0);
      const d = monthTrans.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0);

      return { mes, lucro: r - d, nome: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][i] };
    });

    const lucrosSorted = [...monthlyLucros].filter(m => m.lucro > 0).sort((a, b) => b.lucro - a.lucro);
    if (lucrosSorted.length > 0) {
      const melhorMes = lucrosSorted[0];
      allInsights.push({
        id: 'best-month',
        title: `Seu melhor mês foi ${melhorMes.nome}`,
        description: `Lucro de ${formatCurrency(melhorMes.lucro)}. Prepare-se para este período!`,
        type: 'success',
        icon: Award,
        priority: 6,
      });
    }

    if (selectedYear === currentYear && currentMonth <= 12) {
      const receitasAteAgora = yearTransactions
        .filter(t => {
          const date = new Date(t.data);
          return t.tipo === 'receita' && date.getMonth() + 1 <= currentMonth;
        })
        .reduce((sum, t) => sum + Number(t.valor), 0);

      if (currentMonth > 0) {
        const mediaMensal = receitasAteAgora / currentMonth;
        const projecao = mediaMensal * 12;

        allInsights.push({
          id: 'year-projection',
          title: 'Projeção para o ano',
          description: `Se mantiver o ritmo, pode fechar com ${formatCurrency(projecao)} de receita`,
          type: 'info',
          icon: Calendar,
          priority: 5,
        });
      }
    }

    const categoryExpenses = categories
      .filter(c => c.tipo === 'despesa')
      .map(cat => {
        const total = currentMonthTransactions
          .filter(t => t.categoria_id === cat.id)
          .reduce((sum, t) => sum + Number(t.valor), 0);
        return { categoria: cat.nome, total };
      })
      .sort((a, b) => b.total - a.total);

    if (categoryExpenses.length > 0 && categoryExpenses[0].total > 0) {
      allInsights.push({
        id: 'top-expense',
        title: `Maior despesa: ${categoryExpenses[0].categoria}`,
        description: `${formatCurrency(categoryExpenses[0].total)} neste mês`,
        type: 'neutral',
        icon: DollarSign,
        priority: 4,
      });
    }

    const categoryRevenues = categories
      .filter(c => c.tipo === 'receita')
      .map(cat => {
        const total = yearTransactions
          .filter(t => t.categoria_id === cat.id && t.tipo === 'receita')
          .reduce((sum, t) => sum + Number(t.valor), 0);
        return { categoria: cat.nome, total };
      })
      .sort((a, b) => b.total - a.total);

    if (categoryRevenues.length > 0 && categoryRevenues[0].total > 0) {
      allInsights.push({
        id: 'top-revenue-source',
        title: `Principal fonte de receita: ${categoryRevenues[0].categoria}`,
        description: `${formatCurrency(categoryRevenues[0].total)} no ano`,
        type: 'success',
        icon: Award,
        priority: 3,
      });
    }

    const previousYearTransactions = paidTransactions.filter(t => {
      const date = new Date(t.data);
      return date.getFullYear() === selectedYear - 1;
    });

    if (previousYearTransactions.length > 0) {
      const receitasAnoAtual = yearTransactions
        .filter(t => t.tipo === 'receita')
        .reduce((sum, t) => sum + Number(t.valor), 0);
      const receitasAnoAnterior = previousYearTransactions
        .filter(t => t.tipo === 'receita')
        .reduce((sum, t) => sum + Number(t.valor), 0);

      if (receitasAnoAnterior > 0) {
        const crescimento = ((receitasAnoAtual - receitasAnoAnterior) / receitasAnoAnterior) * 100;

        if (crescimento > 0) {
          allInsights.push({
            id: 'yearly-growth',
            title: `Crescimento anual de ${crescimento.toFixed(0)}%`,
            description: `Comparado ao ano anterior, você cresceu ${crescimento.toFixed(1)}%`,
            type: 'success',
            icon: TrendingUp,
            priority: 2,
          });
        } else if (crescimento < 0) {
          allInsights.push({
            id: 'yearly-decline',
            title: `Redução anual de ${Math.abs(crescimento).toFixed(0)}%`,
            description: 'Revise suas estratégias e considere novas abordagens',
            type: 'warning',
            icon: TrendingDown,
            priority: 2,
          });
        }
      }
    }

    return allInsights.sort((a, b) => b.priority - a.priority).slice(0, 8);
  }, [transactions, categories, selectedYear, selectedMonth]);

  return insights;
}
