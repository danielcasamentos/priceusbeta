import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { FinancialRecord } from '../types/financial';

// ─── Helpers ────────────────────────────────────────────────────────────────

function csvEscape(value: string | number | undefined | null): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function tipoLabel(tipo: string): string {
  switch (tipo) {
    case 'receita': return 'Receita';
    case 'despesa': return 'Despesa';
    case 'imposto': return 'Imposto';
    default: return tipo ?? 'Outro';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'pago': return 'Pago';
    case 'pendente': return 'Pendente';
    case 'cancelado': return 'Cancelado';
    default: return status ?? '';
  }
}

function origemLabel(origem: string): string {
  switch (origem) {
    case 'manual': return 'Manual';
    case 'lead': return 'Lead';
    case 'contrato': return 'Contrato';
    default: return origem ?? '';
  }
}

function formatDate(date: string): string {
  return date ? new Date(date).toLocaleDateString('pt-BR') : '';
}

// ─── CSV ────────────────────────────────────────────────────────────────────

/**
 * Gera um CSV completo a partir dos registros financeiros.
 * Inclui BOM UTF-8 para compatibilidade com Excel.
 * Separador: ponto-e-vírgula (padrão pt-BR).
 */
export function generateCsv(records: FinancialRecord[]): string {
  const SEP = ';';
  const BOM = '\uFEFF';

  const headers = [
    'ID', 'Data', 'Tipo', 'Valor (R$)', 'Status',
    'Descrição', 'Categoria', 'Cliente', 'Forma de Pagamento',
    'Origem', 'Parcelas', 'Observações',
  ];

  const rows = records.map(r => [
    csvEscape(r.id),
    csvEscape(formatDate(r.date)),
    csvEscape(tipoLabel(r.type)),
    csvEscape(formatBRL(r.amount).replace(/\u00A0/g, ' ')),
    csvEscape(statusLabel(r.status ?? '')),
    csvEscape(r.description),
    csvEscape(r.category),
    csvEscape(r.clientName),
    csvEscape(r.formaPagamento),
    csvEscape(origemLabel(r.origem ?? '')),
    csvEscape(r.parcelas),
    csvEscape(r.observacoes),
  ].join(SEP));

  const receitas = records.filter(r => r.type === 'receita').reduce((s, r) => s + r.amount, 0);
  const despesas = records.filter(r => r.type === 'despesa').reduce((s, r) => s + r.amount, 0);
  const saldo = receitas - despesas;

  const empty12 = () => Array(12).fill('').join(SEP);
  const footerLine = (label: string, val: string) =>
    ['', `${label}: ${val}`, ...Array(10).fill('')].join(SEP);

  return [
    BOM + headers.join(SEP),
    ...rows,
    '',
    footerLine(`Total de registros`, String(records.length)),
    footerLine('Total Receitas', formatBRL(receitas)),
    footerLine('Total Despesas', formatBRL(despesas)),
    footerLine('Saldo', formatBRL(saldo)),
    '',
    `;;Gerado em: ${new Date().toLocaleString('pt-BR')} via PriceUs`,
  ].join('\n');
}

// ─── Excel (.xlsx) ──────────────────────────────────────────────────────────

/**
 * Gera e faz download de um arquivo Excel (.xlsx) formatado.
 */
export function downloadXlsx(records: FinancialRecord[], filename: string): void {
  const receitas = records.filter(r => r.type === 'receita').reduce((s, r) => s + r.amount, 0);
  const despesas = records.filter(r => r.type === 'despesa').reduce((s, r) => s + r.amount, 0);
  const saldo = receitas - despesas;

  // Dados principais
  const dataRows = records.map(r => ({
    'ID': r.id,
    'Data': formatDate(r.date),
    'Tipo': tipoLabel(r.type),
    'Valor (R$)': r.amount,
    'Status': statusLabel(r.status ?? ''),
    'Descrição': r.description ?? '',
    'Categoria': r.category ?? '',
    'Cliente': r.clientName ?? '',
    'Forma de Pagamento': r.formaPagamento ?? '',
    'Origem': origemLabel(r.origem ?? ''),
    'Parcelas': r.parcelas ?? '',
    'Observações': r.observacoes ?? '',
  }));

  // Linhas de rodapé
  const footerRows = [
    {},
    { 'ID': `Total de registros: ${records.length}` },
    { 'ID': `Total Receitas: ${formatBRL(receitas)}` },
    { 'ID': `Total Despesas: ${formatBRL(despesas)}` },
    { 'ID': `Saldo: ${formatBRL(saldo)}` },
    {},
    { 'ID': `Gerado em: ${new Date().toLocaleString('pt-BR')} via PriceUs` },
  ];

  const allRows = [...dataRows, ...footerRows];
  const ws = XLSX.utils.json_to_sheet(allRows);

  // Larguras das colunas
  ws['!cols'] = [
    { wch: 36 }, // ID
    { wch: 12 }, // Data
    { wch: 10 }, // Tipo
    { wch: 16 }, // Valor
    { wch: 12 }, // Status
    { wch: 32 }, // Descrição
    { wch: 20 }, // Categoria
    { wch: 24 }, // Cliente
    { wch: 20 }, // Forma de Pag
    { wch: 12 }, // Origem
    { wch: 10 }, // Parcelas
    { wch: 28 }, // Observações
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transações');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── PDF ────────────────────────────────────────────────────────────────────

/**
 * Gera e faz download de um relatório PDF com tabela de transações.
 */
export function downloadPdf(records: FinancialRecord[], filename: string): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 14;

  const receitas = records.filter(r => r.type === 'receita').reduce((s, r) => s + r.amount, 0);
  const despesas = records.filter(r => r.type === 'despesa').reduce((s, r) => s + r.amount, 0);
  const saldo = receitas - despesas;

  // ── Cabeçalho ──
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 0, pw, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('PriceUs — Relatório Financeiro', margin, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pw - margin, 13, { align: 'right' });

  // ── Cards de resumo ──
  let y = 28;
  const cardW = (pw - margin * 2 - 8) / 3;
  const cards = [
    { label: 'Total Receitas', value: formatBRL(receitas), color: [22, 163, 74] as [number,number,number] },
    { label: 'Total Despesas', value: formatBRL(despesas), color: [220, 38, 38] as [number,number,number] },
    { label: 'Saldo', value: formatBRL(saldo), color: saldo >= 0 ? [37, 99, 235] as [number,number,number] : [234, 88, 12] as [number,number,number] },
  ];
  cards.forEach((card, i) => {
    const x = margin + i * (cardW + 4);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cardW, 18, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, cardW, 18, 2, 2, 'S');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, x + 5, y + 6);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...card.color);
    doc.text(card.value, x + 5, y + 14);
  });

  // ── Tabela ──
  y = 54;
  const cols = [
    { header: 'Data',        key: 'date',           w: 22, fmt: (r: FinancialRecord) => formatDate(r.date) },
    { header: 'Tipo',        key: 'type',           w: 18, fmt: (r: FinancialRecord) => tipoLabel(r.type) },
    { header: 'Descrição',   key: 'description',    w: 60, fmt: (r: FinancialRecord) => (r.description ?? '').substring(0, 38) },
    { header: 'Categoria',   key: 'category',       w: 32, fmt: (r: FinancialRecord) => (r.category ?? '').substring(0, 20) },
    { header: 'Cliente',     key: 'clientName',     w: 38, fmt: (r: FinancialRecord) => (r.clientName ?? '').substring(0, 22) },
    { header: 'Status',      key: 'status',         w: 22, fmt: (r: FinancialRecord) => statusLabel(r.status ?? '') },
    { header: 'Parcelas',    key: 'parcelas',       w: 18, fmt: (r: FinancialRecord) => r.parcelas ?? '' },
    { header: 'Valor (R$)',  key: 'amount',         w: 28, fmt: (r: FinancialRecord) => formatBRL(r.amount) },
  ];

  const totalW = cols.reduce((s, c) => s + c.w, 0);
  const scale = (pw - margin * 2) / totalW;

  // Header da tabela
  doc.setFillColor(79, 70, 229);
  doc.rect(margin, y, pw - margin * 2, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  let xCursor = margin;
  cols.forEach(col => {
    doc.text(col.header, xCursor + 1, y + 4.8);
    xCursor += col.w * scale;
  });
  y += 7;

  // Linhas da tabela
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  let rowIndex = 0;
  for (const record of records) {
    if (y > ph - 20) {
      doc.addPage();
      y = 14;
    }
    // Linha alternada
    if (rowIndex % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pw - margin * 2, 6.5, 'F');
    }

    xCursor = margin;
    cols.forEach(col => {
      const isAmount = col.key === 'amount';
      const isType = col.key === 'type';
      if (isAmount) {
        doc.setTextColor(record.type === 'receita' ? 22 : 220, record.type === 'receita' ? 163 : 38, record.type === 'receita' ? 74 : 38);
      } else if (isType) {
        doc.setTextColor(record.type === 'receita' ? 22 : 220, record.type === 'receita' ? 163 : 38, record.type === 'receita' ? 74 : 38);
      } else {
        doc.setTextColor(30, 41, 59);
      }
      doc.text(col.fmt(record), xCursor + 1, y + 4.5);
      xCursor += col.w * scale;
    });

    // Linha divisória
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 6.5, pw - margin, y + 6.5);

    y += 6.5;
    rowIndex++;
  }

  // ── Rodapé de páginas ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${i} de ${pageCount} • PriceUs`,
      pw / 2, ph - 5,
      { align: 'center' }
    );
  }

  doc.save(`${filename}.pdf`);
}

// Mantido por compatibilidade
export async function generatePdf(_records: FinancialRecord[]): Promise<Blob> {
  throw new Error('Use downloadPdf() para exportação em PDF.');
}
