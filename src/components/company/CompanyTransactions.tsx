import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Filter, DollarSign, TrendingDown, TrendingUp, ChevronDown, Loader2, Download, Copy, LayoutGrid, List, Search, MessageCircle } from 'lucide-react';
import { ExportModal } from '../ExportModal';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useCompanyTransactions, CompanyTransaction, CompanyCategory } from '../../hooks/useCompanyTransactions';
import { useCompanyMetrics } from '../../hooks/useCompanyMetrics';
import { TransactionFormModal } from '../TransactionFormModal';
import { CobrancaModal } from './CobrancaModal';

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
  
  // Novos filtros
  const [filterMonth, setFilterMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));
  const [filterDay, setFilterDay] = useState<string>('all');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Mantém os top cards sincronizados
  const { availableYears } = useCompanyMetrics(transactions);
  
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<CompanyTransaction | null>(null);
  const [isDeletingTx, setIsDeletingTx] = useState(false);
  const [cobrancaTransaction, setCobrancaTransaction] = useState<CompanyTransaction | null>(null);

  const filteredTransactions = transactions.filter((t: CompanyTransaction) => {
    if (filterTipo !== 'all' && t.tipo !== filterTipo) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterInstallment === 'installment' && !t.is_installment) return false;
    if (filterInstallment === 'single' && t.is_installment) return false;

    if (t.data) {
      const [year, month, day] = t.data.split('-');
      if (filterYear !== 'all' && year !== filterYear) return false;
      if (filterMonth !== 'all' && Number(month) !== Number(filterMonth)) return false;
      if (filterDay !== 'all' && Number(day) !== Number(filterDay)) return false;
    }

    if (filterSearch.trim() !== '') {
      const query = filterSearch.toLowerCase();
      if (!t.descricao.toLowerCase().includes(query)) {
        return false;
      }
    }

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

  // ── Bulk delete ────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    for (const id of selectedIds) {
      await deleteTransaction(id);
    }
    setSelectedIds([]);
    setIsBulkDeleting(false);
  };

  // ── Duplicar uma transação ────────────────────────────────────────
  const handleDuplicate = async (transaction: CompanyTransaction) => {
    const baseDate = new Date(transaction.data + 'T12:00:00');
    baseDate.setMonth(baseDate.getMonth() + 1);
    const novaData = baseDate.toISOString().split('T')[0];

    await createTransaction({
      tipo: transaction.tipo,
      origem: 'manual',
      descricao: `[Cópia] ${transaction.descricao}`,
      valor: transaction.valor,
      data: novaData,
      status: 'pendente',
      forma_pagamento: transaction.forma_pagamento,
      categoria_id: transaction.categoria_id,
      observacoes: transaction.observacoes,
      is_installment: false,
    } as any);
  };

  // ── Bulk duplicate ─────────────────────────────────────────────────
  const handleBulkDuplicate = async () => {
    if (selectedIds.length === 0) return;
    setIsUpdating(true);
    const todup = filteredTransactions.filter(t => selectedIds.includes(t.id));
    for (const t of todup) {
      await handleDuplicate(t);
    }
    setSelectedIds([]);
    setIsUpdating(false);
  };

  // Transações filtradas sem o filtro de status para obtermos a visão completa do mês/ano/etc.
  const baseFilteredTransactions = useMemo(() => {
    return transactions.filter((t: CompanyTransaction) => {
      if (filterTipo !== 'all' && t.tipo !== filterTipo) return false;
      if (filterInstallment === 'installment' && !t.is_installment) return false;
      if (filterInstallment === 'single' && t.is_installment) return false;

      if (t.data) {
        const [year, month, day] = t.data.split('-');
        if (filterYear !== 'all' && year !== filterYear) return false;
        if (filterMonth !== 'all' && Number(month) !== Number(filterMonth)) return false;
        if (filterDay !== 'all' && Number(day) !== Number(filterDay)) return false;
      }

      if (filterSearch.trim() !== '') {
        const query = filterSearch.toLowerCase();
        if (!t.descricao.toLowerCase().includes(query)) return false;
      }

      return true;
    });
  }, [transactions, filterTipo, filterInstallment, filterYear, filterMonth, filterDay, filterSearch]);

  const metrics = useMemo(() => {
    const receitasPago = baseFilteredTransactions
      .filter((t: CompanyTransaction) => t.tipo === 'receita' && t.status === 'pago')
      .reduce((sum: number, t: CompanyTransaction) => sum + Number(t.valor), 0);

    const receitasPendente = baseFilteredTransactions
      .filter((t: CompanyTransaction) => t.tipo === 'receita' && t.status === 'pendente')
      .reduce((sum: number, t: CompanyTransaction) => sum + Number(t.valor), 0);

    const despesasPago = baseFilteredTransactions
      .filter((t: CompanyTransaction) => t.tipo === 'despesa' && t.status === 'pago')
      .reduce((sum: number, t: CompanyTransaction) => sum + Number(t.valor), 0);

    const despesasPendente = baseFilteredTransactions
      .filter((t: CompanyTransaction) => t.tipo === 'despesa' && t.status === 'pendente')
      .reduce((sum: number, t: CompanyTransaction) => sum + Number(t.valor), 0);

    const receitasCancelado = baseFilteredTransactions
      .filter((t: CompanyTransaction) => t.tipo === 'receita' && t.status === 'cancelado')
      .reduce((sum: number, t: CompanyTransaction) => sum + Number(t.valor), 0);

    const despesasCancelado = baseFilteredTransactions
      .filter((t: CompanyTransaction) => t.tipo === 'despesa' && t.status === 'cancelado')
      .reduce((sum: number, t: CompanyTransaction) => sum + Number(t.valor), 0);

    return {
      receitasPago,
      receitasPendente,
      despesasPago,
      despesasPendente,
      receitasCancelado,
      despesasCancelado,
    };
  }, [baseFilteredTransactions]);

  const {
    totalReceitas,
    totalDespesas,
    labelReceitasSub,
    valueReceitasSub,
    labelDespesasSub,
    valueDespesasSub,
    labelSaldo,
    totalSaldo,
    labelSaldoSub,
    valueSaldoSub,
  } = useMemo(() => {
    let tRec = 0;
    let tDes = 0;
    let lRecSub = '';
    let vRecSub = 0;
    let lDesSub = '';
    let vDesSub = 0;
    let lSal = 'Saldo';
    let tSal = 0;
    let lSalSub = '';
    let vSalSub = 0;

    if (filterStatus === 'pago') {
      tRec = metrics.receitasPago;
      tDes = metrics.despesasPago;
      lRecSub = 'A receber (Pendente)';
      vRecSub = metrics.receitasPendente;
      lDesSub = 'A pagar (Pendente)';
      vDesSub = metrics.despesasPendente;
      tSal = tRec - tDes;
      lSal = 'Saldo Pago';
      lSalSub = 'Pendente';
      vSalSub = vRecSub - vDesSub;
    } else if (filterStatus === 'pendente') {
      tRec = metrics.receitasPendente;
      tDes = metrics.despesasPendente;
      lRecSub = 'Recebido (Pago)';
      vRecSub = metrics.receitasPago;
      lDesSub = 'Pago (Despesa)';
      vDesSub = metrics.despesasPago;
      tSal = tRec - tDes;
      lSal = 'Saldo Pendente';
      lSalSub = 'Pago';
      vSalSub = vRecSub - vDesSub;
    } else if (filterStatus === 'cancelado') {
      tRec = metrics.receitasCancelado;
      tDes = metrics.despesasCancelado;
      lRecSub = 'Pago';
      vRecSub = metrics.receitasPago;
      lDesSub = 'Pago (Despesa)';
      vDesSub = metrics.despesasPago;
      tSal = tRec - tDes;
      lSal = 'Saldo Cancelado';
    } else {
      // 'all'
      tRec = metrics.receitasPago;
      tDes = metrics.despesasPago;
      lRecSub = 'A receber (Pendente)';
      vRecSub = metrics.receitasPendente;
      lDesSub = 'A pagar (Pendente)';
      vDesSub = metrics.despesasPendente;
      tSal = tRec - tDes;
      lSal = 'Saldo Real';
      lSalSub = 'Projetado (Real + Pendente)';
      vSalSub = (metrics.receitasPago + metrics.receitasPendente) - (metrics.despesasPago + metrics.despesasPendente);
    }

    return {
      totalReceitas: tRec,
      totalDespesas: tDes,
      labelReceitasSub: lRecSub,
      valueReceitasSub: vRecSub,
      labelDespesasSub: lDesSub,
      valueDespesasSub: vDesSub,
      labelSaldo: lSal,
      totalSaldo: tSal,
      labelSaldoSub: lSalSub,
      valueSaldoSub: vSalSub,
    };
  }, [filterStatus, metrics]);

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

            {/* Novos filtros */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)] mb-1">Mês</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full px-3 py-2 border dark:border-[rgba(255,255,255,0.1)] dark:bg-[#0a1628] dark:text-white rounded-lg"
              >
                <option value="all">Todos os meses</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={String(m)}>
                    {new Date(2000, m - 1, 1).toLocaleString('pt-BR', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)] mb-1">Ano</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full px-3 py-2 border dark:border-[rgba(255,255,255,0.1)] dark:bg-[#0a1628] dark:text-white rounded-lg"
              >
                <option value="all">Todos os anos</option>
                {availableYears.map(year => (
                  <option key={year} value={String(year)}>{year}</option>
                ))}
              </select>
            </div>

            <div className="col-span-1 md:col-span-2 relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)] mb-1">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar descrição..." 
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border dark:border-[rgba(255,255,255,0.1)] dark:bg-[#0a1628] dark:text-white rounded-lg"
                />
              </div>
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
                  setFilterMonth('all');
                  setFilterYear('all');
                  setFilterDay('all');
                  setFilterSearch('');
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
        <div className="bg-blue-50 dark:bg-[rgba(59,130,246,0.08)] p-3 border border-blue-200 dark:border-[rgba(59,130,246,0.2)] rounded-xl flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 mr-2">
            {selectedIds.length} selecionada(s)
          </span>
          {/* Alterar Status */}
          <div className="relative group">
            <button disabled={isUpdating} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Alterar Status <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-[#07101f] rounded-lg shadow-lg border dark:border-[rgba(255,255,255,0.1)] z-20 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
              <a onClick={() => handleUpdateStatus('pago')} className="block px-4 py-2 text-sm text-gray-700 dark:text-[rgba(255,255,255,0.8)] hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.05)] cursor-pointer">✅ Marcar como Pago</a>
              <a onClick={() => handleUpdateStatus('pendente')} className="block px-4 py-2 text-sm text-gray-700 dark:text-[rgba(255,255,255,0.8)] hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.05)] cursor-pointer">⏳ Marcar como Pendente</a>
              <a onClick={() => handleUpdateStatus('cancelado')} className="block px-4 py-2 text-sm text-gray-700 dark:text-[rgba(255,255,255,0.8)] hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.05)] cursor-pointer">❌ Marcar como Cancelado</a>
            </div>
          </div>
          {/* Duplicar em lote */}
          <button
            onClick={handleBulkDuplicate}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicar ({selectedIds.length})
          </button>
          {/* Excluir em lote */}
          <button
            onClick={handleBulkDelete}
            disabled={isBulkDeleting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            {isBulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Excluir ({selectedIds.length})
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-[rgba(34,197,94,0.1)] dark:to-[rgba(34,197,94,0.15)] p-4 rounded-lg border border-green-200 dark:border-[rgba(34,197,94,0.2)]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500 rounded-full">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">Total Receitas</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-300">{formatCurrency(totalReceitas)}</p>
              {labelReceitasSub && valueReceitasSub > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold mt-1">
                  ⏳ {labelReceitasSub}: {formatCurrency(valueReceitasSub)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-[rgba(239,68,68,0.1)] dark:to-[rgba(239,68,68,0.15)] p-4 rounded-lg border border-red-200 dark:border-[rgba(239,68,68,0.2)]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500 rounded-full">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">Total Despesas</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-300">{formatCurrency(totalDespesas)}</p>
              {labelDespesasSub && valueDespesasSub > 0 && (
                <p className="text-xs text-red-500 dark:text-red-400 font-semibold mt-1">
                  ⏳ {labelDespesasSub}: {formatCurrency(valueDespesasSub)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br p-4 rounded-lg border ${
          totalSaldo >= 0
            ? 'from-blue-50 to-blue-100 border-blue-200 dark:from-[rgba(59,130,246,0.1)] dark:to-[rgba(59,130,246,0.15)] dark:border-[rgba(59,130,246,0.2)]'
            : 'from-orange-50 to-orange-100 border-orange-200 dark:from-[rgba(249,115,22,0.1)] dark:to-[rgba(249,115,22,0.15)] dark:border-[rgba(249,115,22,0.2)]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${
              totalSaldo >= 0 ? 'bg-blue-500' : 'bg-orange-500'
            }`}>
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                totalSaldo >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'
              }`}>
                {labelSaldo}
              </p>
              <p className={`text-2xl font-bold ${
                totalSaldo >= 0 ? 'text-blue-900 dark:text-blue-300' : 'text-orange-900 dark:text-orange-300'
              }`}>
                {formatCurrency(totalSaldo)}
              </p>
              {labelSaldoSub && (
                <p className={`text-xs font-semibold mt-1 ${
                  valueSaldoSub >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'
                }`}>
                  {labelSaldoSub}: {formatCurrency(valueSaldoSub)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mb-2">
        <div className="flex items-center gap-1 bg-gray-200 dark:bg-[#07101f] p-1 rounded-lg">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-[#1a2b42] text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            title="Visualização em Grade"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-[#1a2b42] text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            title="Visualização em Lista"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0a1628] rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.05)]">
        {filteredTransactions.length > 0 ? (
          viewMode === 'list' ? (
          <div className="overflow-x-auto hidden md:block">
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
                      {formatDate(transaction.data)}
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
                          <p className="text-xs text-gray-500 dark:text-[rgba(255,255,255,0.5)]">
                            {transaction.forma_pagamento}
                            {transaction.documento_fiscal && ` • CPF/CNPJ: ${transaction.documento_fiscal}`}
                          </p>
                        )}
                        {!transaction.forma_pagamento && transaction.documento_fiscal && (
                          <p className="text-xs text-gray-500 dark:text-[rgba(255,255,255,0.5)]">CPF/CNPJ: {transaction.documento_fiscal}</p>
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
                      <div className="flex items-center justify-center gap-1">
                        {transaction.tipo === 'receita' && transaction.status === 'pendente' && (
                          <button onClick={() => setCobrancaTransaction(transaction)} className="p-1.5 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-[rgba(34,197,94,0.2)] rounded transition-colors" title="Cobrar via WhatsApp">
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleEdit(transaction)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-[rgba(59,130,246,0.2)] rounded transition-colors" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDuplicate(transaction)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-[rgba(99,102,241,0.2)] rounded transition-colors" title="Duplicar (próximo mês)">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={(e) => { e.preventDefault(); setTransactionToDelete(transaction); }} className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-[rgba(239,68,68,0.2)] rounded transition-colors" title="Excluir">
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
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 hidden md:grid">
              {filteredTransactions.map(transaction => (
                <div 
                  key={transaction.id}
                  onClick={() => handleSelectOne(transaction.id)}
                  className={`relative p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedIds.includes(transaction.id) 
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                      : 'border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#0a1628] hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  <div className="absolute top-3 right-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(transaction.id)}
                      readOnly
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 pointer-events-none"
                    />
                  </div>
                  <div className="mb-2 pr-6">
                    <h3 className="font-bold text-gray-900 dark:text-white truncate" title={transaction.descricao}>
                      {transaction.descricao}
                      {transaction.is_installment && ` (${transaction.installment_number}/${transaction.total_installments})`}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDate(transaction.data)}
                      {transaction.documento_fiscal && ` • CPF/CNPJ: ${transaction.documento_fiscal}`}
                    </p>
                  </div>
                  <div className={`text-xl font-bold mb-3 ${transaction.tipo === 'receita' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {transaction.tipo === 'despesa' ? '- ' : '+ '}
                    {formatCurrency(Number(transaction.valor))}
                  </div>
                  <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.05]">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      transaction.status === 'pago' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </span>
                    <div className="flex gap-1">
                      {transaction.tipo === 'receita' && transaction.status === 'pendente' && (
                        <button onClick={(e) => { e.stopPropagation(); setCobrancaTransaction(transaction); }} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Cobrar via WhatsApp"><MessageCircle className="w-3.5 h-3.5" /></button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(transaction); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDuplicate(transaction); }} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"><Copy className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setTransactionToDelete(transaction); }} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 dark:text-[rgba(255,255,255,0.4)]">Nenhuma transação encontrada</p>
            <button onClick={() => handleNewTransaction('receita')} className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
              Adicionar primeira transação
            </button>
          </div>
        )}
      </div>

      {/* ── Cards Mobile (< md) ─────────────────────────────────── */}
      {filteredTransactions.length > 0 && (
        <div className="md:hidden space-y-3 mt-4">
          {filteredTransactions.map(t => (
            <div key={t.id} className={`rounded-xl border p-4 space-y-2 ${
              selectedIds.includes(t.id)
                ? 'border-blue-400 bg-blue-50 dark:bg-[rgba(59,130,246,0.1)]'
                : 'border-gray-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#0a1628]'
            }`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => handleSelectOne(t.id)} className="w-4 h-4 text-blue-600 rounded" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{t.descricao}</p>
                    {t.is_installment && t.installment_number && (
                      <span className="text-xs bg-blue-100 dark:bg-[rgba(59,130,246,0.2)] text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
                        {t.installment_number}/{t.total_installments}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-sm font-black ${ t.tipo === 'receita' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400' }`}>
                  {t.tipo === 'receita' ? '+' : '-'}{formatCurrency(Number(t.valor))}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-[rgba(255,255,255,0.5)]">
                <span>📅 {formatDate(t.data)}</span>
                <span>🏷️ {getCategoryName(t.categoria_id)}</span>
                {t.forma_pagamento && <span>💳 {t.forma_pagamento}</span>}
                {t.documento_fiscal && <span>👤 CPF/CNPJ: {t.documento_fiscal}</span>}
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  t.status === 'pago' ? 'bg-blue-100 dark:bg-[rgba(59,130,246,0.2)] text-blue-700 dark:text-blue-300'
                  : t.status === 'pendente' ? 'bg-yellow-100 dark:bg-[rgba(234,179,8,0.2)] text-yellow-700 dark:text-yellow-300'
                  : 'bg-gray-100 dark:bg-[rgba(255,255,255,0.1)] text-gray-600 dark:text-[rgba(255,255,255,0.6)]'
                }`}>{t.status}</span>
                <div className="flex gap-1">
                  {t.tipo === 'receita' && t.status === 'pendente' && (
                    <button onClick={() => setCobrancaTransaction(t)} className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-[rgba(34,197,94,0.15)] rounded" title="Cobrar via WhatsApp"><MessageCircle className="w-3.5 h-3.5" /></button>
                  )}
                  <button onClick={() => handleEdit(t)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-[rgba(59,130,246,0.15)] rounded" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDuplicate(t)} className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-[rgba(99,102,241,0.15)] rounded" title="Duplicar"><Copy className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setTransactionToDelete(t)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-[rgba(239,68,68,0.15)] rounded" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {cobrancaTransaction && (
        <CobrancaModal
          isOpen={!!cobrancaTransaction}
          onClose={() => setCobrancaTransaction(null)}
          clienteNome={cobrancaTransaction.cliente_nome || ''}
          clienteTelefone={cobrancaTransaction.cliente_telefone || ''}
          valor={cobrancaTransaction.valor}
          dataVencimento={cobrancaTransaction.data}
          descricao={cobrancaTransaction.descricao}
          userId={userId}
        />
      )}
    </div>
  );
}
