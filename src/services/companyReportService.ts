import jsPDF from 'jspdf';
import { formatCurrency } from '../lib/utils';
import { CompanyTransaction, CompanyCategory } from '../hooks/useCompanyTransactions';

interface ReportData {
  userId: string;
  type: 'monthly' | 'yearly';
  year: number;
  month?: number;
  metrics: any;
  transactions: CompanyTransaction[];
  categories: CompanyCategory[];
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export async function generateCompanyReport(data: ReportData) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  let yPos = 20;

  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PriceU$ - Relatório Financeiro', pageWidth / 2, yPos, { align: 'center' });

  yPos += 10;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  const periodText = data.type === 'monthly'
    ? `${MONTHS[data.month! - 1]} ${data.year}`
    : `Ano ${data.year}`;
  pdf.text(periodText, pageWidth / 2, yPos, { align: 'center' });

  yPos += 15;
  pdf.setDrawColor(59, 130, 246);
  pdf.setLineWidth(0.5);
  pdf.line(20, yPos, pageWidth - 20, yPos);

  yPos += 15;
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Resumo Financeiro', 20, yPos);

  yPos += 10;
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');

  const metrics = data.metrics;
  const summaryData = [
    { label: 'Total de Receitas:', value: formatCurrency(metrics.receitas), color: [34, 197, 94] },
    { label: 'Total de Despesas:', value: formatCurrency(metrics.despesas), color: [239, 68, 68] },
    { label: 'Lucro Líquido:', value: formatCurrency(metrics.lucro), color: metrics.lucro >= 0 ? [59, 130, 246] : [249, 115, 22] },
    { label: 'Ticket Médio:', value: formatCurrency(metrics.ticket_medio), color: [139, 92, 246] },
    { label: 'Número de Vendas:', value: metrics.quantidade_vendas.toString(), color: [0, 0, 0] },
  ];

  summaryData.forEach(item => {
    pdf.setTextColor(...(item.color as [number, number, number]));
    pdf.text(item.label, 25, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text(item.value, 100, yPos);
    pdf.setFont('helvetica', 'normal');
    yPos += 7;
  });

  pdf.setTextColor(0, 0, 0);

  if (data.type === 'yearly' && 'melhor_mes' in metrics) {
    yPos += 5;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Destaques do Ano', 20, yPos);
    yPos += 8;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Melhor mês: ${MONTHS[metrics.melhor_mes.mes - 1]} (${formatCurrency(metrics.melhor_mes.valor)})`, 25, yPos);
    yPos += 7;

    if (metrics.crescimento_percentual !== undefined) {
      const crescimentoText = `Crescimento anual: ${metrics.crescimento_percentual >= 0 ? '+' : ''}${metrics.crescimento_percentual.toFixed(1)}%`;
      pdf.text(crescimentoText, 25, yPos);
      yPos += 7;
    }

    pdf.text(`Média mensal: ${formatCurrency(metrics.media_mensal)}`, 25, yPos);
    yPos += 7;
  }

  yPos += 10;
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Top Categorias de Receita', 20, yPos);
  yPos += 8;

  const revenueCategories = data.categories
    .filter(c => c.tipo === 'receita')
    .map(cat => {
      const total = data.transactions
        .filter(t => {
          const date = new Date(t.data);
          const matchesYear = date.getFullYear() === data.year;
          const matchesMonth = data.type === 'monthly' ? date.getMonth() + 1 === data.month : true;
          return t.categoria_id === cat.id && t.status === 'pago' && matchesYear && matchesMonth;
        })
        .reduce((sum, t) => sum + Number(t.valor), 0);
      return { nome: cat.nome, total };
    })
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  if (revenueCategories.length > 0) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    revenueCategories.forEach(cat => {
      pdf.text(`• ${cat.nome}:`, 25, yPos);
      pdf.setFont('helvetica', 'bold');
      pdf.text(formatCurrency(cat.total), 100, yPos);
      pdf.setFont('helvetica', 'normal');
      yPos += 6;
    });
  } else {
    pdf.setFontSize(10);
    pdf.setTextColor(150, 150, 150);
    pdf.text('Nenhuma receita registrada', 25, yPos);
    pdf.setTextColor(0, 0, 0);
    yPos += 6;
  }

  yPos += 8;
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Top Categorias de Despesa', 20, yPos);
  yPos += 8;

  const expenseCategories = data.categories
    .filter(c => c.tipo === 'despesa')
    .map(cat => {
      const total = data.transactions
        .filter(t => {
          const date = new Date(t.data);
          const matchesYear = date.getFullYear() === data.year;
          const matchesMonth = data.type === 'monthly' ? date.getMonth() + 1 === data.month : true;
          return t.categoria_id === cat.id && t.status === 'pago' && matchesYear && matchesMonth;
        })
        .reduce((sum, t) => sum + Number(t.valor), 0);
      return { nome: cat.nome, total };
    })
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  if (expenseCategories.length > 0) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    expenseCategories.forEach(cat => {
      pdf.text(`• ${cat.nome}:`, 25, yPos);
      pdf.setFont('helvetica', 'bold');
      pdf.text(formatCurrency(cat.total), 100, yPos);
      pdf.setFont('helvetica', 'normal');
      yPos += 6;
    });
  } else {
    pdf.setFontSize(10);
    pdf.setTextColor(150, 150, 150);
    pdf.text('Nenhuma despesa registrada', 25, yPos);
    pdf.setTextColor(0, 0, 0);
    yPos += 6;
  }

  yPos += 15;
  if (yPos > 250) {
    pdf.addPage();
    yPos = 20;
  }

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Últimas Transações', 20, yPos);
  yPos += 8;

  const recentTransactions = [...data.transactions]
    .filter(t => {
      const date = new Date(t.data);
      const matchesYear = date.getFullYear() === data.year;
      const matchesMonth = data.type === 'monthly' ? date.getMonth() + 1 === data.month : true;
      return matchesYear && matchesMonth;
    })
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 10);

  if (recentTransactions.length > 0) {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    recentTransactions.forEach(transaction => {
      if (yPos > 270) {
        pdf.addPage();
        yPos = 20;
      }

      const date = new Date(transaction.data).toLocaleDateString('pt-BR');

      const valor = formatCurrency(Number(transaction.valor));

      pdf.setTextColor(100, 100, 100);
      pdf.text(date, 25, yPos);

      pdf.setTextColor(0, 0, 0);
      pdf.text(transaction.descricao.substring(0, 40), 50, yPos);

      if (transaction.tipo === 'receita') {
        pdf.setTextColor(34, 197, 94);
        pdf.text(`+${valor}`, 150, yPos);
      } else {
        pdf.setTextColor(239, 68, 68);
        pdf.text(`-${valor}`, 150, yPos);
      }

      yPos += 6;
    });
  } else {
    pdf.setFontSize(10);
    pdf.setTextColor(150, 150, 150);
    pdf.text('Nenhuma transação no período', 25, yPos);
  }

  pdf.setTextColor(0, 0, 0);

  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Página ${i} de ${pageCount} - Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
      pageWidth / 2,
      pdf.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  const fileName = data.type === 'monthly'
    ? `relatorio-${MONTHS[data.month! - 1]}-${data.year}.pdf`
    : `relatorio-anual-${data.year}.pdf`;

  pdf.save(fileName);
}
