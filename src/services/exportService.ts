import { FinancialRecord } from '../types/financial';

/**
 * Escapa um valor CSV para garantir compatibilidade com Excel/LibreOffice.
 * Envolve em aspas se contiver vírgulas, quebras de linha ou aspas.
 */
function csvEscape(value: string | number | undefined | null): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formata um valor numérico como moeda BRL (ex: R$ 1.500,00).
 */
function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Retorna o label legível para o tipo de transação.
 */
function tipoLabel(tipo: string): string {
  switch (tipo) {
    case 'receita': return 'Receita';
    case 'despesa': return 'Despesa';
    case 'imposto': return 'Imposto';
    default: return tipo ?? 'Outro';
  }
}

/**
 * Retorna o label legível para o status.
 */
function statusLabel(status: string): string {
  switch (status) {
    case 'pago': return 'Pago';
    case 'pendente': return 'Pendente';
    case 'cancelado': return 'Cancelado';
    default: return status ?? '';
  }
}

/**
 * Retorna o label legível para a origem da transação.
 */
function origemLabel(origem: string): string {
  switch (origem) {
    case 'manual': return 'Manual';
    case 'lead': return 'Lead';
    case 'contrato': return 'Contrato';
    default: return origem ?? '';
  }
}

/**
 * Gera um CSV completo a partir das transações brutas do Supabase.
 * Inclui BOM UTF-8 para compatibilidade com Excel.
 * O separador usado é ponto-e-vírgula (;) — padrão pt-BR.
 */
export function generateCsv(records: FinancialRecord[]): string {
  const SEP = ';';
  const BOM = '\uFEFF'; // UTF-8 BOM — abre corretamente no Excel

  const headers = [
    'ID',
    'Data',
    'Tipo',
    'Valor (R$)',
    'Status',
    'Descrição',
    'Categoria',
    'Cliente',
    'Forma de Pagamento',
    'Origem',
    'Parcelas',
    'Observações',
  ];

  const rows = records.map(r => [
    csvEscape(r.id),
    csvEscape(r.date ? new Date(r.date).toLocaleDateString('pt-BR') : ''),
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

  // Linha de rodapé com totais
  const receitas = records.filter(r => r.type === 'receita').reduce((s, r) => s + r.amount, 0);
  const despesas = records.filter(r => r.type === 'despesa').reduce((s, r) => s + r.amount, 0);
  const saldo = receitas - despesas;

  const footer = [
    '',
    `Total de registros: ${records.length}`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ].join(SEP);

  const footerReceitas = ['', `Total Receitas: ${formatBRL(receitas)}`, '', '', '', '', '', '', '', '', '', ''].join(SEP);
  const footerDespesas = ['', `Total Despesas: ${formatBRL(despesas)}`, '', '', '', '', '', '', '', '', '', ''].join(SEP);
  const footerSaldo = ['', `Saldo: ${formatBRL(saldo)}`, '', '', '', '', '', '', '', '', '', ''].join(SEP);

  const geradoEm = `;;Gerado em: ${new Date().toLocaleString('pt-BR')} via PriceUs`;

  return [
    BOM + headers.join(SEP),
    ...rows,
    '',
    footer,
    footerReceitas,
    footerDespesas,
    footerSaldo,
    '',
    geradoEm,
  ].join('\n');
}

// Mantido por compatibilidade — não é mais utilizado (somente CSV solicitado)
export async function generatePdf(_records: FinancialRecord[]): Promise<Blob> {
  throw new Error('Exportação em PDF não está habilitada. Use o formato CSV.');
}
