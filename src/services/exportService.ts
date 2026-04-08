import { FinancialRecord } from '../types/financial';

/**
 * Generate a CSV string from an array of FinancialRecord.
 * Simple implementation without external libraries.
 */
export function generateCsv(records: FinancialRecord[]): string {
  const header = ['ID', 'Data', 'Tipo', 'Valor', 'Descrição', 'Categoria', 'Cliente'];
  const rows = records.map(r => [
    r.id,
    r.date,
    r.type,
    r.amount.toFixed(2),
    r.description ?? '',
    r.category ?? '',
    r.clientName ?? ''
  ].join(','));
  return [header.join(','), ...rows].join('\n');
}

/**
 * Generate a PDF Blob containing a simple table of financial records.
 * Uses jspdf (already a dependency). No external autotable plugin – we draw manually.
 */
export async function generatePdf(records: FinancialRecord[]): Promise<Blob> {
  // Dynamically import jspdf to avoid bundling it if not used.
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const startY = 20;
  const lineHeight = 7;
  const colWidths = [20, 30, 20, 30, 50, 30, 30]; // approximate widths
  const headers = ['ID', 'Data', 'Tipo', 'Valor', 'Descrição', 'Categoria', 'Cliente'];

  // Header
  let x = 10;
  headers.forEach((h, i) => {
    doc.text(h, x, startY);
    x += colWidths[i];
  });

  // Rows
  let y = startY + lineHeight;
  records.forEach(rec => {
    x = 10;
    const values = [
      rec.id,
      new Date(rec.date).toLocaleDateString('pt-BR'),
      rec.type,
      rec.amount.toFixed(2),
      rec.description ?? '',
      rec.category ?? '',
      rec.clientName ?? ''
    ];
    values.forEach((v, i) => {
      doc.text(String(v), x, y);
      x += colWidths[i];
    });
    y += lineHeight;
    // Add new page if needed
    if (y > 280) {
      doc.addPage();
      y = startY;
    }
  });

  return doc.output('blob');
}
