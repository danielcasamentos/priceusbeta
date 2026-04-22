import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Filter, DollarSign, TrendingDown, TrendingUp, ChevronDown, Loader2, Download } from 'lucide-react';
import { ExportModal } from '../ExportModal';
import { formatCurrency } from '../../lib/utils';
import { useCompanyTransactions, CompanyTransaction, CompanyCategory } from '../../hooks/useCompanyTransactions';
import { TransactionFormModal } from '../TransactionFormModal';

interface CompanyTransactionsProps {
  userId: string;
}

export function CompanyTransactions({ userId }: CompanyTransactionsProps) {
  const {
    transactions,
    categories,
    loading,    
    loadTransactions, // 1. Importar a função de recarregar
    createTransaction,
    updateMultipleTransactionStatus,
    updateTransaction,
    deleteTransaction,
  } = useCompanyTransactions(userId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<CompanyTransaction | null>(null);
  const [transactionType, setTransactionType] = useState<'receita' | 'despesa'>('receita');
  const [filterTipo, setFilterTipo] = useState<'all' | 'receita' | 'despesa'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pago' | 'pendente' | 'cancelado'>('all');
  const [filterInstallment, setFilterInstallment] = useState<'all' | 'installment' | 'single'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<CompanyTransaction | null>(null);
  const [isDeletingTx, setIsDeletingTx] = useState(false);

  const filteredTransactions = transactions.filter((t: CompanyTransaction) => {
    if (filterTipo !== 'all' && t.tipo !== filterTipo) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterInstallment === 'installment' && !t.is_installment) return false;
    if (filterInstallment === 'single' && t.is_installment) return false;
    return true;
  });

  const isAllSelected = useMemo(() => {
    if (filteredTransactions.length === 0) return false;
    return selectedIds.length === filteredTransactions.length;
  }, [selectedIds, filteredTransactions]);

  const handleSave = async (transactionData: Partial<CompanyTransaction>) => {
    try {
      let result;
      if (editingTransaction) {
        // Modo Edição
        result = await updateTransaction(editingTransaction.id, transactionData);
      } else {
        // Modo Criação
        result = await createTransaction(transactionData as any);
      }

      if (result.error) {
        alert(result.error);
        return result;
      }

      setEditingTransaction(null);
      setIsModalOpen(false);
      await loadTransactions(); // 2. Recarregar transações após salvar
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Erro ao salvar transação. Tente novamente.');
    }
    return { error: null };
  };

  const handleEdit = (transaction: CompanyTransaction) => {
    setEditingTransaction(transaction);
    setTransactionType(transaction.tipo); // Garante que o modal abra com o tipo correto
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;
    setIsDeletingTx(true);

    if (transactionToDelete.is_installment && transactionToDelete.parent_transaction_id) {
      const relatedInstallments = transactions.filter(
        (t: CompanyTransaction) => t.parent_transaction_id === transactionToDelete.parent_transaction_id
      );

      for (const installment of relatedInstallments) {
        await deleteTransaction(installment.id);
      }
    } else {
      await deleteTransaction(transactionToDelete.id);
    }
    
    setIsDeletingTx(false);
    setTransactionToDelete(null);
  };

  const handleNewTransaction = (tipo: 'receita' | 'despesa' = 'receita') => {
    setEditingTransaction(null);
    setTransactionType(tipo);
    setIsModalOpen(true);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allIds = filteredTransactions.map(t => t.id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string): void => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const handleUpdateStatus = async (status: 'pago' | 'pendente' | 'cancelado') => {
    if (selectedIds.length === 0) return;

    setIsUpdating(true);
    await updateMultipleTransactionStatus(selectedIds, status);
    setSelectedIds([]);
    setIsUpdating(false);
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'Sem categoria';
    const category = categories.find((c: CompanyCategory) => c.id === categoryId);
    return category?.nome || 'Sem categoria';
  };

  const totalReceitas = filteredTransactions
    .filter((t: CompanyTransaction) => t.tipo === 'receita' && t.status === 'pago')
    .reduce((sum: number, t: CompanyTransaction) => sum + Number(t.valor), 0);

  const totalDespesas = filteredTransactions
    .filter((t: CompanyTransaction) => t.tipo === 'despesa' && t.status === 'pago')
    .reduce((sum: number, t: CompanyTransaction) => sum + Number(t.valor), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-[rgba(255,255,255,0.5)]">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold dark:text-white">Transações</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border dark:border-[rgba(255,255,255,0.1)] rounded-lg transition-colors ${
              showFilters ? 'bg-blue-50 dark:bg-[rgba(59,130,246,0.1)] border-blue-300 dark:border-[rgba(59,130,246,0.3)] text-blue-700 dark:text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.05)] dark:text-[rgba(255,255,255,0.8)]'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          <button
            onClick={() => handleNewTransaction('receita')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Receita
          </button>
          <button
            onClick={() => handleNewTransaction('despesa')}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Despesa
          </button>
          <button
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar Dados
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] p-4 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.05)]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)] mb-1">Tipo</label>
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value as any)}
                className="w-full px-3 py-2 border dark:border-[rgba(255,255,255,0.1)] dark:bg-[#0a1628] dark:text-white rounded-lg"
              >
                <option value="all">Todos</option>
                <option value="receita">Receitas</option>
                <option value="despesa">Despesas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)] mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-3 py-2 border dark:border-[rgba(255,255,255,0.1)] dark:bg-[#0a1628] dark:text-white rounded-lg"
              >
                <option value="all">Todos</option>
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)] mb-1">Tipo de Pagamento</label>
              <select
                value={filterInstallment}
                onChange={(e) => setFilterInstallment(e.target.value as any)}
                className="w-full px-3 py-2 border dark:border-[rgba(255,255,255,0.1)] dark:bg-[#0a1628] dark:text-white rounded-lg"
              >
                <option value="all">Todos</option>
                <option value="single">Único</option>
                <option value="installment">Parcelado</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterTipo('all');
                  setFilterStatus('all');
                  setFilterInstallment('all');
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-[rgba(255,255,255,0.1)] dark:text-[rgba(255,255,255,0.8)] rounded-lg hover:bg-white dark:hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Ações em Lote */}
      {selectedIds.length > 0 && (
        <div className="bg-gray-100 dark:bg-[rgba(255,255,255,0.05)] p-4 border-b border-gray-200 dark:border-[rgba(255,255,255,0.1)] flex items-center justify-between rounded-t-lg">
          <span className="text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)]">
            {selectedIds.length} selecionada(s)
          </span>
          <div className="relative">
            <div className="group inline-block">
              <button
                disabled={isUpdating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors text-sm font-semibold disabled:bg-blue-300 dark:disabled:bg-[rgba(59,130,246,0.5)] disabled:cursor-not-allowed"
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
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#07101f] rounded-md shadow-lg border dark:border-[rgba(255,255,255,0.1)] z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                <a onClick={() => handleUpdateStatus('pago')} className="block px-4 py-2 text-sm text-gray-700 dark:text-[rgba(255,255,255,0.8)] hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.05)] cursor-pointer">Marcar como Pago</a>
                <a onClick={() => handleUpdateStatus('pendente')} className="block px-4 py-2 text-sm text-gray-700 dark:text-[rgba(255,255,255,0.8)] hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.05)] cursor-pointer">Marcar como Pendente</a>
                <a onClick={() => handleUpdateStatus('cancelado')} className="block px-4 py-2 text-sm text-gray-700 dark:text-[rgba(255,255,255,0.8)] hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.05)] cursor-pointer">Marcar como Cancelado</a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-[rgba(34,197,94,0.1)] dark:to-[rgba(34,197,94,0.15)] p-4 rounded-lg border border-green-200 dark:border-[rgba(34,197,94,0.2)]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500 rounded-full">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">Total Receitas</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-300">{formatCurrency(totalReceitas)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-[rgba(239,68,68,0.1)] dark:to-[rgba(239,68,68,0.15)] p-4 rounded-lg border border-red-200 dark:border-[rgba(239,68,68,0.2)]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500 rounded-full">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">Total Despesas</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-300">{formatCurrency(totalDespesas)}</p>
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br p-4 rounded-lg border ${
          totalReceitas - totalDespesas >= 0
            ? 'from-blue-50 to-blue-100 border-blue-200 dark:from-[rgba(59,130,246,0.1)] dark:to-[rgba(59,130,246,0.15)] dark:border-[rgba(59,130,246,0.2)]'
            : 'from-orange-50 to-orange-100 border-orange-200 dark:from-[rgba(249,115,22,0.1)] dark:to-[rgba(249,115,22,0.15)] dark:border-[rgba(249,115,22,0.2)]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${
              totalReceitas - totalDespesas >= 0 ? 'bg-blue-500' : 'bg-orange-500'
            }`}>
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className={`text-sm font-medium ${
                totalReceitas - totalDespesas >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'
              }`}>
                Saldo
              </p>
              <p className={`text-2xl font-bold ${
                totalReceitas - totalDespesas >= 0 ? 'text-blue-900 dark:text-blue-300' : 'text-orange-900 dark:text-orange-300'
              }`}>
                {formatCurrency(totalReceitas - totalDespesas)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0a1628] rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.05)]">
        {filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-[#07101f] border-b dark:border-[rgba(255,255,255,0.05)]">
                <tr>
                  <th className="p-4">
                    <div className="flex items-center">
                      <input
                        id="checkbox-all"
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-[#0a1628] border-gray-300 dark:border-[rgba(255,255,255,0.1)] rounded focus:ring-blue-500"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        disabled={loading || filteredTransactions.length === 0}
                      />
                      <label htmlFor="checkbox-all" className="sr-only">Selecionar todos</label>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase">Categoria</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase">Tipo</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase">Valor</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-[rgba(255,255,255,0.05)]">
                {filteredTransactions.map(transaction => (
                  <tr key={transaction.id} className={`hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.02)] ${selectedIds.includes(transaction.id) ? 'bg-blue-50 dark:bg-[rgba(59,130,246,0.1)]' : ''}`}>
                    <td className="w-4 p-4">
                      <div className="flex items-center">
                        <input
                          id={`checkbox-${transaction.id}`}
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-[#0a1628] border-gray-300 dark:border-[rgba(255,255,255,0.1)] rounded focus:ring-blue-500"
                          checked={selectedIds.includes(transaction.id)}
                          onChange={() => handleSelectOne(transaction.id)}
                        />
                        <label htmlFor={`checkbox-${transaction.id}`} className="sr-only">Selecionar transação</label>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-[rgba(255,255,255,0.8)]">
                      {new Date(transaction.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {transaction.descricao}
                          {transaction.is_installment && transaction.installment_number && transaction.total_installments && (
                            <span className="ml-2 text-xs bg-blue-100 dark:bg-[rgba(59,130,246,0.2)] text-blue-800 dark:text-blue-400 px-2 py-0.5 rounded-full font-semibold">
                              Parcela {transaction.installment_number}/{transaction.total_installments}
                            </span>
                          )}
                        </p>
                        {transaction.forma_pagamento && (
                          <p className="text-xs text-gray-500 dark:text-[rgba(255,255,255,0.5)]">{transaction.forma_pagamento}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-[rgba(255,255,255,0.7)]">
                      {getCategoryName(transaction.categoria_id)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.tipo === 'receita'
                          ? 'bg-green-100 dark:bg-[rgba(34,197,94,0.2)] text-green-800 dark:text-green-400'
                          : 'bg-red-100 dark:bg-[rgba(239,68,68,0.2)] text-red-800 dark:text-red-400'
                      }`}>
                        {transaction.tipo === 'receita' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right text-sm font-semibold ${
                      transaction.tipo === 'receita' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.tipo === 'receita' ? '+' : '-'} {formatCurrency(Number(transaction.valor))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.status === 'pago'
                          ? 'bg-blue-100 dark:bg-[rgba(59,130,246,0.2)] text-blue-800 dark:text-blue-400'
                          : transaction.status === 'pendente'
                          ? 'bg-yellow-100 dark:bg-[rgba(234,179,8,0.2)] text-yellow-800 dark:text-yellow-400'
                          : 'bg-gray-100 dark:bg-[rgba(255,255,255,0.1)] text-gray-800 dark:text-[rgba(255,255,255,0.7)]'
                      }`}>
                        {transaction.status === 'pago' ? 'Pago' : transaction.status === 'pendente' ? 'Pendente' : 'Cancelado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-[rgba(59,130,246,0.2)] rounded transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setTransactionToDelete(transaction); }}
                          className="p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-[rgba(239,68,68,0.2)] rounded transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 dark:text-[rgba(255,255,255,0.4)]">Nenhuma transação encontrada</p>
            <button
              onClick={() => handleNewTransaction('receita')}
              className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Adicionar primeira transação
            </button>
          </div>
        )}
      </div>

      <TransactionFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSubmit={handleSave}
        transactionType={transactionType}
        categories={categories}
        transaction={editingTransaction}
      />

      {/* Export Modal */}
      {exportModalOpen && (
        <ExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          transactions={transactions}
          getCategoryName={getCategoryName}
        />
      )}

      {/* Modal de Exclusão */}
      {transactionToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm shadow-2xl flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-[#0a1628] rounded-xl border dark:border-[rgba(255,255,255,0.05)] shadow-xl w-full max-w-md overflow-hidden p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-[rgba(239,68,68,0.2)] mb-4">
              <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Excluir Transação</h3>
            <p className="text-gray-600 dark:text-[rgba(255,255,255,0.6)] mb-6 font-medium">
              {transactionToDelete.is_installment && transactionToDelete.parent_transaction_id 
                ? `Esta é uma parcela de um total de ${transactions.filter((t: CompanyTransaction) => t.parent_transaction_id === transactionToDelete.parent_transaction_id).length}. Deseja excluir TODAS as parcelas relacionadas?`
                : 'Tem certeza que deseja excluir esta transação? Essa ação não pode ser desfeita.'}
            </p>
            <div className="flex justify-center gap-3">
              <button disabled={isDeletingTx} onClick={() => setTransactionToDelete(null)} className="px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[rgba(255,255,255,0.05)] hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.1)] rounded-lg font-semibold transition-colors">Cancelar</button>
              <button disabled={isDeletingTx} onClick={handleDeleteConfirm} className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
                {isDeletingTx ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
