import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Trash2, Eye, Edit, Loader2, AlertCircle, Download } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { ContractViewerModal } from './ContractViewerModal';

interface Contract {
  id: string;
  lead_id: string;
  template_id: string;
  status: 'pending' | 'signed' | 'expired';
  created_at: string;
  client_ip?: string; // Adicionado
  token: string;
  user_id: string; // Adicionado
  signed_at: string | null;
  expires_at: string;
  lead_data_json: {
    nome_cliente: string;
    data_evento?: string;
    valor_total?: number;
  };
  client_data_json?: any; // Adicionado
  user_data_json?: any; // Adicionado
  user_signature_base64: string; // Adicionado
  signature_base64?: string; // Adicionado
  contract_templates: {
    id: string; // Adicionado
    name: string;
  };
}

export function ContractsManager({ userId }: { userId:string }) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
const [isDeleting, setIsDeleting] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set<string>());

  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(0); // 0 representa "Todos os Anos"
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);

  useEffect(() => {
    loadContracts();
  }, [userId]);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, client_ip, contract_templates!inner(id, name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data as Contract[] || []);
    } catch (error) {
      console.error("Erro ao carregar contratos:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = useMemo(() => {
    return contracts.filter(contract => {
      const clientName = contract.lead_data_json?.nome_cliente?.toLowerCase() || '';
      const templateName = contract.contract_templates?.name?.toLowerCase() || '';
      const search = searchTerm.toLowerCase();

      // Filtro por texto
      const matchesSearch = clientName.includes(search) || templateName.includes(search);
      
      // Filtro por status
      const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;

      // Filtro por data do evento
      const eventDate = contract.lead_data_json?.data_evento ? new Date(contract.lead_data_json.data_evento + 'T00:00:00') : null;
      const matchesDate = 
        (monthFilter === 'all' || !eventDate || (eventDate && eventDate.getMonth() + 1 === parseInt(monthFilter))) &&
        (yearFilter === 0 || (eventDate && eventDate.getFullYear() === yearFilter));

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [contracts, searchTerm, statusFilter, monthFilter, yearFilter]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredContracts.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSingle = async (contractId: string) => {
    if (!confirm('Tem certeza que deseja excluir este contrato?')) {
      return;
    }

    setDeletingIds(prev => new Set([...prev, contractId]));
    try {
      const { error } = await supabase.from('contracts').delete().eq('id', contractId);
      if (error) throw error;
      
      setSelectedIds([]);
      await loadContracts();
    } catch (error) {
      console.error('Erro ao excluir contrato:', error);
      alert('Erro ao excluir contrato.');
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(contractId);
        return newSet;
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0 || !confirm(`Tem certeza que deseja excluir ${selectedIds.length} contrato(s)?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.from('contracts').delete().in('id', selectedIds);
      if (error) throw error;
      
      setSelectedIds([]);
      await loadContracts();
    } catch (error) {
      console.error('Erro ao excluir contratos:', error);
      alert('Erro ao excluir contratos.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      signed: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
    };
    const labels = {
      pending: 'Pendente',
      signed: 'Assinado',
      expired: 'Expirado',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100'}`}>{labels[status] || status}</span>;
  };

  const availableYears = useMemo(() => {
    const years = new Set(contracts.map(c => c.lead_data_json?.data_evento ? new Date(c.lead_data_json.data_evento).getFullYear() : null));
    return Array.from(years).filter(Boolean).sort((a, b) => b! - a!);
  }, [contracts]);

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: ptBR.localize?.month(i) }));

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por cliente ou contrato..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="signed">Assinado</option>
            <option value="expired">Expirado</option>
          </select>
          <select
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">Todos os Meses</option>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select
            value={yearFilter}
            onChange={e => setYearFilter(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value={0}>Todos os Anos</option>
            {availableYears.map(y => <option key={y} value={y!}>{y}</option>)}
          </select>
          {selectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300"
              >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Excluir ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="p-4">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selectedIds.length > 0 && selectedIds.length === filteredContracts.length}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
              <th scope="col" className="px-6 py-3">Cliente</th>
              <th scope="col" className="px-6 py-3">Contrato</th>
              <th scope="col" className="px-6 py-3">Data do Serviço</th>
              <th scope="col" className="px-6 py-3">Valor</th>
              <th scope="col" className="px-6 py-3">Status</th>
              <th scope="col" className="px-6 py-3">Data de Criação</th>
              <th scope="col" className="px-6 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-12">
                  <Loader2 className="w-8 h-8 mx-auto text-blue-600 animate-spin" />
                  <p className="mt-2 text-gray-500">Carregando contratos...</p>
                </td>
              </tr>
            ) : filteredContracts.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12">
                  <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="font-medium text-gray-600">Nenhum contrato encontrado</p>
                  <p className="text-sm text-gray-500 mt-1">Gere seu primeiro contrato a partir de um lead.</p>
                </td>
              </tr>
            ) : (
              filteredContracts.map(contract => (
                <tr key={contract.id} className={`border-b hover:bg-gray-50 ${selectedIds.includes(contract.id) ? 'bg-blue-50' : 'bg-white'}`}>
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(contract.id)}
                      onChange={() => handleSelectOne(contract.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                    {contract.lead_data_json?.nome_cliente || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    {contract.contract_templates?.name || 'Template Removido'}
                  </td>
                  <td className="px-6 py-4">
                    {contract.lead_data_json?.data_evento ? format(new Date(contract.lead_data_json.data_evento + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-800">
                    {formatCurrency(contract.lead_data_json?.valor_total || 0)}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(contract.status)}
                  </td>
                  <td className="px-6 py-4">
                    {format(new Date(contract.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setViewingContract(contract)}
                        title="Visualizar" 
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye size={16} />
                      </button>
                      
                      <button
                        title="Excluir contrato"
                        onClick={() => handleDeleteSingle(contract.id)}
                        className={`text-red-600 hover:text-red-800 ${deletingIds.has(contract.id) ? 'animate-pulse opacity-50 cursor-not-allowed' : ''}`}
                        disabled={deletingIds.has(contract.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {viewingContract && (
        <ContractViewerModal 
          contract={viewingContract} 
          onClose={() => setViewingContract(null)} 
        />
      )}
    </div>
  );
}