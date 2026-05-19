import React, { useState } from 'react';
import { Download, X, FileText, Calendar, CheckCircle2, FileSpreadsheet, Table2 } from 'lucide-react';
import { generateCsv, downloadXlsx, downloadPdf } from '../services/exportService';
import { FinancialRecord } from '../types/financial';

interface CompanyTransactionRaw {
  id: string;
  tipo: string;
  valor: number;
  data: string;
  status: string;
  descricao?: string;
  categoria_nome?: string;
  categoria_id?: string;
  cliente_nome?: string;
  documento_fiscal?: string;
  forma_pagamento?: string;
  origem?: string;
  is_installment?: boolean;
  installment_number?: number;
  total_installments?: number;
  observacoes?: string;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: CompanyTransactionRaw[];
  getCategoryName: (categoryId?: string) => string;
}

type PeriodOption = 'all' | 'year' | 'thisyear' | 'custom';
type FormatOption = 'csv' | 'xlsx' | 'pdf';

interface FormatDef {
  value: FormatOption;
  label: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  color: string;
  bg: string;
  border: string;
}

const FORMATS: FormatDef[] = [
  {
    value: 'csv',
    label: 'CSV',
    description: 'Excel, Google Sheets…',
    icon: <Table2 className="w-5 h-5" />,
    badge: 'Principal',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-500',
  },
  {
    value: 'xlsx',
    label: 'Excel (.xlsx)',
    description: 'Microsoft Excel nativo',
    icon: <FileSpreadsheet className="w-5 h-5" />,
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-500',
  },
  {
    value: 'pdf',
    label: 'PDF',
    description: 'Relatório formatado',
    icon: <FileText className="w-5 h-5" />,
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-500',
  },
];

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  getCategoryName,
}) => {
  const currentYear = new Date().getFullYear();
  const [period, setPeriod] = useState<PeriodOption>('thisyear');
  const [format, setFormat] = useState<FormatOption>('csv');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const getFilteredTransactions = (): CompanyTransactionRaw[] => {
    if (period === 'all') return transactions;
    if (period === 'thisyear')
      return transactions.filter(t => new Date(t.data).getFullYear() === currentYear);
    if (period === 'year')
      return transactions.filter(t => new Date(t.data).getFullYear() === currentYear - 1);
    if (period === 'custom' && customStart && customEnd) {
      const from = new Date(customStart);
      const to = new Date(customEnd);
      return transactions.filter(t => {
        const d = new Date(t.data);
        return d >= from && d <= to;
      });
    }
    return transactions;
  };

  const toRecords = (filtered: CompanyTransactionRaw[]): FinancialRecord[] =>
    filtered.map(t => ({
      id: t.id,
      date: t.data,
      type: t.tipo as FinancialRecord['type'],
      amount: Number(t.valor),
      status: t.status,
      description: t.descricao,
      category: getCategoryName(t.categoria_nome ?? t.categoria_id),
      clientName: t.cliente_nome,
      documento_fiscal: t.documento_fiscal,
      formaPagamento: t.forma_pagamento,
      origem: t.origem,
      parcelas:
        t.is_installment && t.installment_number && t.total_installments
          ? `${t.installment_number}/${t.total_installments}`
          : '',
      observacoes: t.observacoes,
    }));

  const buildFilename = () => {
    let name = 'priceus_financeiro';
    if (period === 'thisyear') name += `_${currentYear}`;
    else if (period === 'year') name += `_${currentYear - 1}`;
    else if (period === 'custom' && customStart && customEnd)
      name += `_${customStart}_a_${customEnd}`;
    return name;
  };

  const handleExport = async () => {
    setDownloading(true);
    try {
      const filtered = getFilteredTransactions();
      const records = toRecords(filtered);
      const filename = buildFilename();

      if (format === 'csv') {
        const csv = generateCsv(records);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } else if (format === 'xlsx') {
        downloadXlsx(records, filename);
      } else if (format === 'pdf') {
        downloadPdf(records, filename);
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1800);
    } catch (e) {
      console.error('Export error', e);
    } finally {
      setDownloading(false);
    }
  };

  const filtered = getFilteredTransactions();
  const canExport = period !== 'custom' || (customStart !== '' && customEnd !== '');
  const selectedFormat = FORMATS.find(f => f.value === format)!;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Exportar Dados Fiscais</h3>
              <p className="text-indigo-200 text-xs mt-0.5">Escolha o formato e período</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Formato */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <FileText className="w-4 h-4 text-indigo-500" />
              Formato de exportação
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FORMATS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={`relative flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    format === f.value
                      ? `${f.border} ${f.bg} ${f.color}`
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {f.badge && (
                    <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      {f.badge}
                    </span>
                  )}
                  <span className={format === f.value ? f.color : 'text-gray-400'}>
                    {f.icon}
                  </span>
                  <span className="font-bold text-xs">{f.label}</span>
                  <span className="text-[10px] text-gray-400 text-center leading-tight">{f.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Período */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <Calendar className="w-4 h-4 text-indigo-500" />
              Período
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'thisyear', label: `Ano atual (${currentYear})` },
                { value: 'year',     label: `Ano anterior (${currentYear - 1})` },
                { value: 'all',      label: 'Todos os registros' },
                { value: 'custom',   label: 'Personalizado' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value as PeriodOption)}
                  className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium text-left transition-all ${
                    period === opt.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {period === 'custom' && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">De</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Até</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-500">Registros a exportar</span>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Arquivo: <span className="font-mono">{buildFilename()}.{format}</span>
              </p>
            </div>
            <span className="text-lg font-bold text-indigo-700">{filtered.length}</span>
          </div>

          {/* Colunas */}
          <div className="text-xs text-gray-400 space-y-1">
            <p className="font-semibold text-gray-500 mb-1">Colunas incluídas:</p>
            <p>ID · Data · Tipo · Valor (R$) · Status · Descrição · Categoria · Cliente · Forma de Pagamento · Origem · Parcelas · Observações</p>
          </div>

          {/* Botão */}
          <button
            onClick={handleExport}
            disabled={downloading || !canExport || filtered.length === 0}
            className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all ${
              success
                ? 'bg-green-500 text-white'
                : `bg-gradient-to-r ${
                    format === 'csv'
                      ? 'from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                      : format === 'xlsx'
                      ? 'from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                      : 'from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700'
                  } text-white disabled:opacity-40 disabled:cursor-not-allowed`
            }`}
          >
            {success ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Download iniciado!
              </>
            ) : downloading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Gerando arquivo...
              </>
            ) : (
              <>
                {selectedFormat.icon}
                Baixar {selectedFormat.label}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
