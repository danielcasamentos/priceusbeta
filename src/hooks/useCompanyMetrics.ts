import { useState, useMemo } from 'react';
import { CompanyTransaction } from './useCompanyTransactions';

interface MonthlyMetrics {
  pendingReceitas: number;
  pendingDespesas: number;
  receitas: number;
  despesas: number;
  lucro: number;
  quantidade_vendas: number;
  ticket_medio: number;
  isFuture: boolean;
}

interface YearlyMetrics extends MonthlyMetrics {
  melhor_mes: { mes: number; valor: number };
  pior_mes: { mes: number; valor: number };
  media_mensal: number;
  crescimento_percentual?: number;
}

interface MonthBreakdown {
  mes: number;
  nome: string;
  receitas: number;
  despesas: number;
  lucro: number;
  quantidade: number;
}

export function useCompanyMetrics(transactions: CompanyTransaction[]) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const availableYears = useMemo(() => {
    if (transactions.length === 0) {
      return [new Date().getFullYear()];
    }
    // 🔥 CORREÇÃO: Considerar todas as transações, não apenas as pagas,
    // para garantir que anos futuros (com lançamentos pendentes) apareçam no filtro.
    const years = new Set(transactions.map(t => new Date(t.data).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  const getMonthlyMetrics = useMemo((): MonthlyMetrics => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const isFuturePeriod = selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth);

    // Se for um mês futuro, o cálculo principal será sobre os pendentes.
    // Se for o mês atual/passado, o cálculo principal será sobre os pagos.
    const primaryStatus = isFuturePeriod ? 'pendente' : 'pago';

    const primaryMonthTransactions = transactions.filter(t => {
      const date = new Date(t.data + 'T00:00:00');
      return t.status === primaryStatus && date.getFullYear() === selectedYear && date.getMonth() + 1 === selectedMonth;
    });

    // Para o mês atual/passado, ainda queremos mostrar os pendentes como um extra.
    const secondaryPendingTransactions = transactions.filter(t => {
      const date = new Date(t.data + 'T00:00:00');
      return t.status === 'pendente' && date.getFullYear() === selectedYear && date.getMonth() + 1 === selectedMonth;
    });

    const receitas = primaryMonthTransactions
      .filter(t => t.tipo === 'receita')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const despesas = primaryMonthTransactions
      .filter(t => t.tipo === 'despesa')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const quantidade_vendas = primaryMonthTransactions.filter(t => t.tipo === 'receita').length;

    const pendingReceitas = secondaryPendingTransactions.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + Number(t.valor), 0);
    const pendingDespesas = secondaryPendingTransactions.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + Number(t.valor), 0);

    return {
      receitas,
      despesas,
      lucro: receitas - despesas,
      quantidade_vendas,
      ticket_medio: quantidade_vendas > 0 ? receitas / quantidade_vendas : 0,
      pendingReceitas,
      pendingDespesas,
      isFuture: isFuturePeriod,
    };
  }, [transactions, selectedYear, selectedMonth]);

  const getYearlyMetrics = useMemo((): YearlyMetrics => {
    const yearPaidTransactions = transactions.filter(t => {
      // 🔥 CORREÇÃO: Consistência na manipulação da data.
      const date = new Date(t.data + 'T00:00:00');
      return t.status === 'pago' && date.getFullYear() === selectedYear;
    });

    const receitas = yearPaidTransactions
      .filter(t => t.tipo === 'receita')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const despesas = yearPaidTransactions
      .filter(t => t.tipo === 'despesa')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const quantidade_vendas = yearPaidTransactions.filter(t => t.tipo === 'receita').length;

    const monthlyLucros = Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      const monthTrans = yearPaidTransactions.filter(t => {        
        const date = new Date(t.data + 'T00:00:00');
        return date.getMonth() + 1 === mes;
      });

      const r = monthTrans.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0);
      const d = monthTrans.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0);

      return { mes, lucro: r - d };
    });

    const lucrosSorted = [...monthlyLucros].sort((a, b) => b.lucro - a.lucro);
    const melhor_mes = lucrosSorted[0] || { mes: 0, valor: 0 };
    const pior_mes = lucrosSorted[lucrosSorted.length - 1] || { mes: 0, valor: 0 };

    const mesesComDados = monthlyLucros.filter(m => m.lucro !== 0).length;
    const media_mensal = mesesComDados > 0 ? (receitas - despesas) / mesesComDados : 0;

    const previousYearTransactions = transactions.filter(t => {
      const date = new Date(t.data + 'T00:00:00');
      return t.status === 'pago' && date.getFullYear() === selectedYear - 1;
    });

    let crescimento_percentual: number | undefined;
    if (previousYearTransactions.length > 0) {
      const receitasAnoAnterior = previousYearTransactions
        .filter(t => t.tipo === 'receita')
        .reduce((sum, t) => sum + Number(t.valor), 0);

      if (receitasAnoAnterior > 0) {
        crescimento_percentual = ((receitas - receitasAnoAnterior) / receitasAnoAnterior) * 100;
      }
    }

    return {
      receitas,
      despesas,
      lucro: receitas - despesas,
      quantidade_vendas,
      ticket_medio: quantidade_vendas > 0 ? receitas / quantidade_vendas : 0,
      pendingReceitas: 0,
      pendingDespesas: 0,
      isFuture: false,
      melhor_mes: { mes: melhor_mes.mes, valor: melhor_mes.lucro },
      pior_mes: { mes: pior_mes.mes, valor: pior_mes.lucro },
      media_mensal,
      crescimento_percentual,
    };
  }, [transactions, selectedYear]);

  const getMonthByMonthBreakdown = useMemo((): MonthBreakdown[] => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    return Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      const monthTransactions = transactions.filter(t => {
        const date = new Date(t.data + 'T00:00:00');
        return t.status === 'pago' && date.getFullYear() === selectedYear && date.getMonth() + 1 === mes;
      });

      const receitas = monthTransactions
        .filter(t => t.tipo === 'receita')
        .reduce((sum, t) => sum + Number(t.valor), 0);

      const despesas = monthTransactions
        .filter(t => t.tipo === 'despesa')
        .reduce((sum, t) => sum + Number(t.valor), 0);

      const quantidade = monthTransactions.filter(t => t.tipo === 'receita').length;

      return {
        mes,
        nome: meses[i],
        receitas,
        despesas,
        lucro: receitas - despesas,
        quantidade,
      };
    });
  }, [transactions, selectedYear]);

  const getPendingReceivables = useMemo(() => {
    return transactions
      .filter(t => t.tipo === 'receita' && t.status === 'pendente')
      .reduce((sum, t) => sum + Number(t.valor), 0);
  }, [transactions]);

  const getSeasonalityAnalysis = useMemo(() => {
    const monthlyData = getMonthByMonthBreakdown;
    const sorted = [...monthlyData].sort((a, b) => b.receitas - a.receitas);

    return {
      stronger_months: sorted.slice(0, 3).map(m => m.nome),
      weaker_months: sorted.slice(-3).reverse().map(m => m.nome),
    };
  }, [getMonthByMonthBreakdown]);

  const getYearProjection = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1;
    const isCurrentYear = selectedYear === new Date().getFullYear();

    if (!isCurrentYear || currentMonth === 0) {
      return null;
    }

    const yearToDate = transactions.filter(t => {
      const date = new Date(t.data + 'T00:00:00');
      return t.status === 'pago' && date.getFullYear() === selectedYear && date.getMonth() + 1 <= currentMonth;
    });

    const receitasAteAgora = yearToDate
      .filter(t => t.tipo === 'receita')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const mediaMensal = receitasAteAgora / currentMonth;
    const projecao = mediaMensal * 12;

    return {
      receitas_ate_agora: receitasAteAgora,
      media_mensal: mediaMensal,
      projecao_ano: projecao,
      meses_restantes: 12 - currentMonth,
    };
  }, [transactions, selectedYear]);

  return {
    selectedYear,
    selectedMonth,
    setSelectedYear,
    setSelectedMonth,
    availableYears,
    monthlyMetrics: getMonthlyMetrics,
    yearlyMetrics: getYearlyMetrics,
    monthByMonthBreakdown: getMonthByMonthBreakdown,
    pendingReceivables: getPendingReceivables,
    seasonalityAnalysis: getSeasonalityAnalysis,
    yearProjection: getYearProjection,
  };
}
