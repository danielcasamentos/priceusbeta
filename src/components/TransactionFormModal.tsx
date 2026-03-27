import { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Tag, CheckCircle } from 'lucide-react';
import { CompanyTransaction, CompanyCategory } from '../hooks/useCompanyTransactions';

/**
 * Converte uma string de moeda (ex: "1.234,56") para um número.
 */
const parseCurrency = (value: string): number => {
  if (!value) return 0;
  // 1. Remove pontos de milhar (ex: 1.234 -> 1234)
  // 2. Substitui a vírgula decimal por um ponto (ex: 1234,56 -> 1234.56)
  // 3. Remove quaisquer outros caracteres não numéricos (exceto o ponto decimal)
  const cleanedValue = value.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleanedValue);
  return isNaN(parsed) ? 0 : parsed;
};

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: Partial<CompanyTransaction>) => Promise<{ error: any } | void>;
  transactionType: 'receita' | 'despesa';
  categories: CompanyCategory[];
  transaction?: CompanyTransaction | null; // Adicionado para edição
}

export function TransactionFormModal({
  isOpen,
  onClose,
  onSubmit,
  transactionType,
  categories,
  transaction = null, // Valor padrão
}: TransactionFormModalProps) {
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '0,00',
    data: new Date().toISOString().split('T')[0],
    categoria_id: '',
    status: 'pago' as 'pago' | 'pendente' | 'cancelado',
    forma_pagamento: 'pix',
    observacoes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Reseta o formulário quando o modal é aberto
    if (isOpen && transaction) {
      // Modo de edição
      setFormData({
        descricao: transaction.descricao || '',
        valor: new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(transaction.valor),
        data: transaction.data ? transaction.data.split('T')[0] : new Date().toISOString().split('T')[0],
        categoria_id: transaction.categoria_id || '',
        status: transaction.status || 'pago',
        forma_pagamento: transaction.forma_pagamento || 'pix',
        observacoes: transaction.observacoes || '',
      });
    } else if (isOpen) {
      // Modo de criação
      setFormData({
        descricao: '',
        valor: '0,00',
        data: new Date().toISOString().split('T')[0],
        categoria_id: '',
        status: 'pago',
        forma_pagamento: 'pix',
        observacoes: '',
      });
      setError(null);
    }
  }, [isOpen, transaction]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;

    if (name === 'valor') {
      // Remove tudo que não for dígito
      const onlyDigits = value.replace(/\D/g, '');
      const numericValue = Number(onlyDigits) / 100;
      const formattedValue = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(numericValue);
      setFormData(prev => ({ ...prev, valor: formattedValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (!formData.descricao || !formData.valor || !formData.data) {
      setError('Descrição, valor e data são obrigatórios.');
      return;
    }

    setIsSubmitting(true);

    const transactionData = {
      tipo: transaction ? transaction.tipo : transactionType,
      origem: 'manual' as const,
      descricao: formData.descricao,
      valor: parseCurrency(formData.valor),
      data: formData.data,
      status: formData.status as 'pago' | 'pendente' | 'cancelado',
      forma_pagamento: formData.forma_pagamento,
      categoria_id: formData.categoria_id || undefined,
      observacoes: formData.observacoes,
    };

    const result = await onSubmit(transactionData);
    const submitError = result && 'error' in result ? result.error : null;

    setIsSubmitting(false);

    if (submitError) {
      setError(submitError);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentType = transaction ? transaction.tipo : transactionType;
  const filteredCategories = categories.filter(c => c.tipo === currentType);

  const title = transaction
    ? 'Editar Transação'
    : transactionType === 'receita' ? 'Adicionar Nova Receita' : 'Adicionar Nova Despesa';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <input type="text" id="descricao" name="descricao" value={formData.descricao} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="valor" className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="text" id="valor" name="valor" value={formData.valor} onChange={handleChange} required placeholder="0,00" className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label htmlFor="data" className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="date" id="data" name="data" value={formData.data} onChange={handleChange} required className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="categoria_id" className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select id="categoria_id" name="categoria_id" value={formData.categoria_id} onChange={handleChange} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 appearance-none">
                  <option value="">Sem categoria</option>
                  {filteredCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div className="relative">
                <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select id="status" name="status" value={formData.status} onChange={handleChange} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 appearance-none">
                  <option value="pago">Pago</option>
                  <option value="pendente">Pendente</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="forma_pagamento" className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
            <select id="forma_pagamento" name="forma_pagamento" value={formData.forma_pagamento} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
              <option value="pix">PIX</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao_credito">Cartão de Crédito</option>
              <option value="cartao_debito">Cartão de Débito</option>
              <option value="transferencia">Transferência Bancária</option>
              <option value="boleto">Boleto</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div>
            <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea id="observacoes" name="observacoes" value={formData.observacoes} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"></textarea>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Erro: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}
        </form>

        <div className="p-5 border-t bg-gray-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button type="submit" form="transaction-form" onClick={handleSubmit} disabled={isSubmitting} className={`px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${currentType === 'receita' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}