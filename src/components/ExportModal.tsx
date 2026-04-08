import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { generateCsv, generatePdf } from '../services/exportService';
import { FinancialRecord } from '../types/financial';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: any[]; // CompanyTransaction[]
  getCategoryName: (categoryId?: string) => string;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, transactions, getCategoryName }) => {
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [downloading, setDownloading] = useState(false);

  const handleExport = async () => {
    setDownloading(true);
    const records: FinancialRecord[] = transactions.map(t => ({
      id: t.id,
      date: t.data,
      type: t.tipo,
      amount: Number(t.valor),
      description: t.descricao,
      category: getCategoryName(t.categoria_id),
      clientName: t.cliente_nome,
    }));
    try {
      if (format === 'csv') {
        const csv = generateCsv(records);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `priceus_finance_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const pdfBlob = await generatePdf(records);
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `priceus_finance_${new Date().toISOString().split('T')[0]}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (e) {
      console.error('Export error', e);
    } finally {
      setDownloading(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Exportar Dados Financeiros</h3>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="mb-4 text-gray-600">Escolha o formato do arquivo que será gerado.</p>
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setFormat('csv')}
            className={`px-4 py-2 rounded ${format === 'csv' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'}`}
          >
            CSV
          </button>
          <button
            onClick={() => setFormat('pdf')}
            className={`px-4 py-2 rounded ${format === 'pdf' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'}`}
          >
            PDF
          </button>
        </div>
        <button
          onClick={handleExport}
          disabled={downloading}
          className="flex items-center gap-2 w-full justify-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {downloading ? 'Gerando...' : 'Baixar'}
        </button>
      </div>
    </div>
  );
};
