import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CompanyTransaction, CompanyCategory } from '../../hooks/useCompanyTransactions';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Partial<CompanyTransaction>, numInstallments?: number) => Promise<void>;
  transaction?: CompanyTransaction | null;
  categories: CompanyCategory[];
  defaultTipo?: 'receita' | 'despesa';
}

export function TransactionModal({ isOpen, onClose, onSave, transaction, categories, defaultTipo = 'receita' }: TransactionModalProps) {
  const [formData, setFormData] = useState({
    tipo: 'receita' as 'receita' | 'despesa',
    descricao: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    status: 'pago' as 'pendente' | 'pago' | 'cancelado',
    forma_pagamento: '',
    categoria_id: '',
    observacoes: '',
    parcelar: false,
    num_parcelas: 1,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (transaction && transaction.id) {
      setFormData({
        tipo: transaction.tipo || 'receita',
        descricao: transaction.descricao || '',
        valor: transaction.valor != null ? transaction.valor.toString() : '',
        data: transaction.data || new Date().toISOString().split('T')[0],
        status: transaction.status || 'pago',
        forma_pagamento: transaction.forma_pagamento || '',
        categoria_id: transaction.categoria_id || '',
        observacoes: transaction.observacoes || '',
        parcelar: false,
        num_parcelas: 1,
      });
    } else {
      setFormData({
        tipo: defaultTipo,
        descricao: '',
        valor: '',
        data: new Date().toISOString().split('T')[0],
        status: 'pago',
        forma_pagamento: '',
        categoria_id: '',
        observacoes: '',
        parcelar: false,
        num_parcelas: 1,
      });
    }
  }, [transaction, defaultTipo, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const transactionData: Partial<CompanyTransaction> = {
        tipo: formData.tipo,
        origem: 'manual',
        descricao: formData.descricao,
        valor: parseFloat(formData.valor),
        data: formData.data,
        status: formData.status,
        forma_pagamento: formData.forma_pagamento || undefined,
        categoria_id: formData.categoria_id || undefined,
        observacoes: formData.observacoes || undefined,
        is_installment: false,
      };

      const numInstallments = formData.parcelar && formData.num_parcelas > 1 ? formData.num_parcelas : undefined;

      await onSave(transactionData, numInstallments);
      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Erro ao salvar transação. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = categories.filter(c => c.tipo === formData.tipo);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {transaction && transaction.id ? 'Editar Transação' : 'Nova Transação'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {transaction && transaction.id && transaction.is_installment && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <div className="text-yellow-600 mt-0.5">⚠️</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  Esta é uma transação parcelada ({transaction.installment_number}/{transaction.total_installments})
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  As alterações serão aplicadas apenas a esta parcela específica.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo *
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'receita' | 'despesa', categoria_id: '' })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição *
            </label>
            <input
              type="text"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Sessão de fotos casamento"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data *
              </label>
              <input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <select
                value={formData.categoria_id}
                onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sem categoria</option>
                {filteredCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forma de Pagamento
              </label>
              <input
                type="text"
                value={formData.forma_pagamento}
                onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: PIX, Cartão, Dinheiro"
              />
            </div>
          </div>

          {!(transaction && transaction.id) && (
            <div className="border-t pt-4">
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={formData.parcelar}
                  onChange={(e) => setFormData({ ...formData, parcelar: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Parcelar {formData.tipo === 'despesa' ? 'compra' : 'pagamento'}</span>
              </label>

              {formData.parcelar && (
                <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número de parcelas
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="12"
                        value={formData.num_parcelas}
                        onChange={(e) => setFormData({ ...formData, num_parcelas: parseInt(e.target.value) || 2 })}
                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor por parcela
                      </label>
                      <div className="px-3 py-2 bg-white border rounded text-gray-900 font-semibold">
                        {formData.valor && formData.num_parcelas > 0
                          ? `R$ ${(parseFloat(formData.valor) / formData.num_parcelas).toFixed(2)}`
                          : 'R$ 0,00'}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700">
                    Serão criadas {formData.num_parcelas} transações mensais automáticas. A primeira parcela terá a data selecionada acima.
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Informações adicionais..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
