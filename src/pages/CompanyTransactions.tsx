import React, { useState, useMemo } from 'react';
import { useCompanyTransactions } from '../hooks/useCompanyTransactions';
import { useCompanyMetrics } from '../hooks/useCompanyMetrics';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, AlertCircle, Loader2, ArrowUpRight, ArrowDownRight, Scale, Download } from 'lucide-react';
import { ExportModal } from '../components/ExportModal';

export function CompanyTransactions() {
  const { user } = useAuth();
  const { transactions, categories, loading, updateMultipleTransactionStatus } = useCompanyTransactions(user?.id || '');
  const { monthlyMetrics, pendingReceivables } = useCompanyMetrics(transactions);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  /** Resolve o nome da categoria a partir do ID ou retorna o valor passado diretamente */
  const getCategoryName = (categoryIdOrName?: string): string => {
    if (!categoryIdOrName) return '';
    const found = categories.find(c => c.id === categoryIdOrName);
    return found ? found.nome : categoryIdOrName;
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allIds = transactions.map(t => t.id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const handleUpdateStatus = async (status: 'pago' | 'pendente' | 'cancelado') => {
    if (selectedIds.length === 0) return;

    setIsUpdating(true);
    try {
      await updateMultipleTransactionStatus(selectedIds, status);
      setSelectedIds([]); // Limpa a seleção após a atualização
    } catch (error) {
      console.error("Erro ao atualizar status em lote", error);
      // Adicionar um toast de erro aqui seria ideal
    } finally {
      setIsUpdating(false);
    }
  };

  const isAllSelected = useMemo(() => {
    return transactions.length > 0 && selectedIds.length === transactions.length;
  }, [selectedIds, transactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pago':
        return 'bg-green-100 text-green-800';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* Modal de exportação CSV */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        transactions={transactions as any[]}
        getCategoryName={getCategoryName}
      />

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transações</h1>
          <p className="text-gray-600 mt-1">Gerencie suas receitas e despesas.</p>
        </div>
        <button
          id="btn-export-csv"
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all shadow-sm whitespace-nowrap"
          title="Exportar dados financeiros em CSV para fins fiscais"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Painel de Métricas Mensais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Receitas do Mês (Pagas)</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(monthlyMetrics.receitas)}</p>
          </div>
          <div className="bg-green-100 text-green-600 p-3 rounded-lg">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Despesas do Mês (Pagas)</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(monthlyMetrics.despesas)}</p>
          </div>
          <div className="bg-red-100 text-red-600 p-3 rounded-lg">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Saldo a Receber (Pendente)</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(pendingReceivables)}</p>
          </div>
          <div className="bg-yellow-100 text-yellow-600 p-3 rounded-lg">
            <Scale className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Barra de Ações em Lote */}
        {selectedIds.length > 0 && (
          <div className="bg-gray-100 p-4 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {selectedIds.length} selecionada(s)
            </span>
            <div className="relative">
              <div className="group inline-block">
                <button
                  disabled={isUpdating}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-semibold disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      Alterar Status
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <a onClick={() => handleUpdateStatus('pago')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Marcar como Pago</a>
                  <a onClick={() => handleUpdateStatus('pendente')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Marcar como Pendente</a>
                  <a onClick={() => handleUpdateStatus('cancelado')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Marcar como Cancelado</a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabela de Transações */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="p-4">
                  <div className="flex items-center">
                    <input
                      id="checkbox-all"
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      disabled={loading || transactions.length === 0}
                    />
                    <label htmlFor="checkbox-all" className="sr-only">Selecionar todos</label>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3">Descrição</th>
                <th scope="col" className="px-6 py-3">Valor</th>
                <th scope="col" className="px-6 py-3">Data</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-600 mx-auto animate-spin" />
                    <p className="mt-2 text-gray-500">Carregando transações...</p>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Nenhuma transação encontrada</p>
                    <p className="text-sm text-gray-500 mt-1">Adicione sua primeira receita ou despesa.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className={`bg-white border-b hover:bg-gray-50 ${selectedIds.includes(transaction.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="w-4 p-4">
                      <div className="flex items-center">
                        <input
                          id={`checkbox-${transaction.id}`}
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          checked={selectedIds.includes(transaction.id)}
                          onChange={() => handleSelectOne(transaction.id)}
                        />
                        <label htmlFor={`checkbox-${transaction.id}`} className="sr-only">Selecionar transação</label>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                      {transaction.descricao}
                      {transaction.is_installment && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({transaction.installment_number}/{transaction.total_installments})
                        </span>
                      )}
                    </td>
                    <td className={`px-6 py-4 font-semibold ${transaction.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.tipo === 'despesa' && '- '}
                      {formatCurrency(transaction.valor)}
                    </td>
                    <td className="px-6 py-4">
                      {format(new Date(transaction.data), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        // onClick={() => handleEdit(transaction)} // Adicionar lógica de edição
                        className="font-medium text-blue-600 hover:underline"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CompanyTransactions;