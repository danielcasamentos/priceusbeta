import React, { useState, useMemo } from 'react';
import { useCompanyTransactions } from '../hooks/useCompanyTransactions';
import { useCompanyMetrics } from '../hooks/useCompanyMetrics';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, AlertCircle, Loader2, ArrowUpRight, ArrowDownRight, Scale, Download, Tags, Search, LayoutGrid, List } from 'lucide-react';
import { ExportModal } from '../components/ExportModal';
import { CategoryManagerModal } from '../components/company/CategoryManagerModal';

export function CompanyTransactions() {
  const { user } = useAuth();
  const { transactions, categories, loading, updateMultipleTransactionStatus, refreshCategories } = useCompanyTransactions(user?.id || '');
  
  // Local filters for the table
  const [filterMonth, setFilterMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));
  const [filterDay, setFilterDay] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSearch, setFilterSearch] = useState<string>('');
  
  // Layout mode
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // Pass the filtered year/month to useCompanyMetrics to keep the top cards in sync
  const { monthlyMetrics, pendingReceivables, setSelectedMonth, setSelectedYear, availableYears } = useCompanyMetrics(transactions);

  useEffect(() => {
    if (filterMonth !== 'all') setSelectedMonth(Number(filterMonth));
    if (filterYear !== 'all') setSelectedYear(Number(filterYear));
  }, [filterMonth, filterYear, setSelectedMonth, setSelectedYear]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (!t.data) return false;
      const [year, month, day] = t.data.split('-');
      if (filterYear !== 'all' && year !== filterYear) return false;
      if (filterMonth !== 'all' && Number(month) !== Number(filterMonth)) return false;
      if (filterDay !== 'all' && Number(day) !== Number(filterDay)) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterSearch.trim() !== '') {
        const query = filterSearch.toLowerCase();
        if (!t.descricao.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, filterMonth, filterYear, filterDay, filterStatus, filterSearch]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  /** Resolve o nome da categoria a partir do ID ou retorna o valor passado diretamente */
  const getCategoryName = (categoryIdOrName?: string): string => {
    if (!categoryIdOrName) return '';
    const found = categories.find(c => c.id === categoryIdOrName);
    return found ? found.nome : categoryIdOrName;
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allIds = filteredTransactions.map(t => t.id);
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
    return filteredTransactions.length > 0 && selectedIds.length === filteredTransactions.length;
  }, [selectedIds, filteredTransactions]);

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
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-[#07101f] min-h-screen">
      {/* Modal de exportação CSV */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        transactions={filteredTransactions as any[]}
        getCategoryName={getCategoryName}
      />

      {/* Modal de gerenciamento de categorias */}
      {showCategoryModal && user && (
        <CategoryManagerModal
          userId={user.id}
          categories={categories}
          onClose={() => setShowCategoryModal(false)}
          onCategoriesChange={() => {
            refreshCategories();
          }}
        />
      )}

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transações</h1>
          <p className="text-gray-600 dark:text-[rgba(255,255,255,0.6)] mt-1">Gerencie suas receitas e despesas.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#0a1628] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-[rgba(255,255,255,0.1)] rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.05)] transition-colors shadow-sm whitespace-nowrap"
          >
            <Tags className="w-4 h-4" />
            Categorias
          </button>
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
      </div>

      {/* Painel de Métricas Mensais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-[#0a1628] rounded-lg shadow-md p-6 flex items-start justify-between border border-transparent dark:border-[rgba(255,255,255,.05)]">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-[rgba(255,255,255,0.6)]">Receitas do Mês (Pagas)</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{formatCurrency(monthlyMetrics.receitas)}</p>
          </div>
          <div className="bg-green-100 text-green-600 p-3 rounded-lg">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#0a1628] rounded-lg shadow-md p-6 flex items-start justify-between border border-transparent dark:border-[rgba(255,255,255,.05)]">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-[rgba(255,255,255,0.6)]">Despesas do Mês (Pagas)</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{formatCurrency(monthlyMetrics.despesas)}</p>
          </div>
          <div className="bg-red-100 text-red-600 p-3 rounded-lg">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#0a1628] rounded-lg shadow-md p-6 flex items-start justify-between border border-transparent dark:border-[rgba(255,255,255,.05)]">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-[rgba(255,255,255,0.6)]">Saldo a Receber (Pendente)</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{formatCurrency(pendingReceivables)}</p>
          </div>
          <div className="bg-yellow-100 text-yellow-600 p-3 rounded-lg">
            <Scale className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0a1628] rounded-lg shadow-md dark:shadow-none overflow-hidden border border-transparent dark:border-[rgba(255,255,255,.05)]">
        {/* Filtros */}
        <div className="p-4 border-b border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar cliente/descrição..." 
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm border border-gray-300 dark:border-[rgba(255,255,255,0.1)] rounded-lg bg-white dark:bg-[#07101f] text-gray-900 dark:text-white w-64"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.7)]">Dia:</label>
              <select
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
                className="text-sm border border-gray-300 dark:border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-1.5 bg-white dark:bg-[#07101f] text-gray-900 dark:text-white"
              >
                <option value="all">Todos</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={String(d).padStart(2, '0')}>{d}</option>
                ))}
              </select>
            </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.7)]">Mês:</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="text-sm border border-gray-300 dark:border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-1.5 bg-white dark:bg-[#07101f] text-gray-900 dark:text-white"
            >
              <option value="all">Todos os meses</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={String(m)}>
                  {new Date(2000, m - 1, 1).toLocaleString('pt-BR', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.7)]">Ano:</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="text-sm border border-gray-300 dark:border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-1.5 bg-white dark:bg-[#07101f] text-gray-900 dark:text-white"
            >
              <option value="all">Todos os anos</option>
              {availableYears.map(year => (
                <option key={year} value={String(year)}>{year}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.7)]">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-300 dark:border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-1.5 bg-white dark:bg-[#07101f] text-gray-900 dark:text-white"
            >
              <option value="all">Todos os status</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-gray-200 dark:bg-[#07101f] p-1 rounded-lg ml-auto">
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

        {/* Barra de Ações em Lote */}
        {selectedIds.length > 0 && (
          <div className="bg-gray-100 dark:bg-[rgba(255,255,255,0.05)] p-4 border-b border-gray-200 dark:border-[rgba(255,255,255,0.1)] flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)]">
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
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600 dark:text-[rgba(255,255,255,0.8)]">
              <thead className="text-xs text-gray-700 dark:text-[rgba(255,255,255,0.6)] uppercase bg-gray-50 dark:bg-[#07101f]">
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
                  <th scope="col" className="px-6 py-3">Descrição / Cliente</th>
                  <th scope="col" className="px-6 py-3">Valor</th>
                  <th scope="col" className="px-6 py-3">Data</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Categoria</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                      <p className="text-gray-500">Carregando transações...</p>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      Nenhuma transação encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className={`bg-white dark:bg-transparent border-b dark:border-[rgba(255,255,255,0.05)] hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.02)] ${selectedIds.includes(transaction.id) ? 'bg-blue-50 dark:bg-[rgba(59,130,246,0.1)]' : ''}`}
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
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {transaction.descricao}
                        {transaction.is_installment && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-[rgba(255,255,255,0.5)]">
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
                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getCategoryName(transaction.categoria_id) || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                <p className="text-gray-500">Carregando transações...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhuma transação encontrada.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{format(new Date(transaction.data), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                    <div className={`text-xl font-bold mb-3 ${transaction.tipo === 'receita' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {transaction.tipo === 'despesa' ? '- ' : '+ '}
                      {formatCurrency(Number(transaction.valor))}
                    </div>
                    <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.05]">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${getStatusBadge(transaction.status)}`}>
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </span>
                      <div className="text-gray-500 flex items-center gap-1">
                        <Tags className="w-3 h-3" />
                        <span className="truncate max-w-[100px]">{getCategoryName(transaction.categoria_id) || '-'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CompanyTransactions;