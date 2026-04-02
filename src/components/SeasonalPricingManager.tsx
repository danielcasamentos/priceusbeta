import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Calendar, Plus, Trash2, Info, Globe, Map } from 'lucide-react';
import { NumberInput } from './ui/NumberInput';

interface Pais {
  id: string;
  nome: string;
  codigo_pais: string;
  ativo: boolean;
}

interface Estado {
  id: string;
  pais_id: string;
  nome: string;
  sigla: string;
  ativo: boolean;
}

interface Cidade {
  id: string;
  estado_id: string;
  nome: string;
  ajuste_percentual: number;
  taxa_deslocamento: number;
  ativo: boolean;
}

interface Temporada {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  ajuste_percentual?: number;
  multiplicador?: number;
  ativo: boolean;
}

interface SeasonalPricingManagerProps {
  templateId: string;
  userId: string;
  sistemaGeograficoAtivo: boolean;
  sistemaSazonalAtivo: boolean;
  onToggleSistemaGeografico: (ativo: boolean) => void;
  onToggleSistemaSazonal: (ativo: boolean) => void;
}

/**
 * Gerenciador de Preços Sazonais e Geográficos
 *
 * Funcionalidades:
 * - Gerenciar países, estados e cidades de atuação
 * - Configurar ajustes de preço por localização
 * - Configurar temporadas com ajustes sazonais
 * - Toggle para ativar/desativar sistema
 * - Modal informativo sobre taxas de deslocamento
 */
export function SeasonalPricingManager({
  templateId,
  userId,
  sistemaGeograficoAtivo,
  sistemaSazonalAtivo,
  onToggleSistemaGeografico,
  onToggleSistemaSazonal,
}: SeasonalPricingManagerProps) {
  const [activeTab, setActiveTab] = useState<'geographic' | 'seasonal'>('geographic');
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Estados para dados geográficos
  const [paises, setPaises] = useState<Pais[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [selectedPais, setSelectedPais] = useState<string | null>(null);
  const [selectedEstado, setSelectedEstado] = useState<string | null>(null);

  // Estados para temporadas
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);

  const [loading, setLoading] = useState(true);

  // Estados para modais de input (substituem prompt())
  const [showAddPaisModal, setShowAddPaisModal] = useState(false);
  const [showAddEstadoModal, setShowAddEstadoModal] = useState(false);
  const [showAddCidadeModal, setShowAddCidadeModal] = useState(false);
  const [showAddTemporadaModal, setShowAddTemporadaModal] = useState(false);

  // Estados para notificações (substituem alert())
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Auto-hide notification após 3 segundos
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    loadData();
  }, [userId, templateId]);

  /**
   * Mostra notificação (substitui alert())
   */
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar países
      const { data: paisesData } = await supabase
        .from('paises')
        .select('*')
        .eq('user_id', userId)
        .order('nome');

      // Carregar estados
      const { data: estadosData } = await supabase
        .from('estados')
        .select('*')
        .eq('user_id', userId)
        .order('nome');

      // Carregar cidades
      const { data: cidadesData } = await supabase
        .from('cidades_ajuste')
        .select('*')
        .eq('user_id', userId)
        .order('nome');

      // Carregar temporadas
      const { data: temporadasData } = await supabase
        .from('temporadas')
        .select('*')
        .eq('template_id', templateId)
        .order('data_inicio');

      setPaises(paisesData || []);
      setEstados(estadosData || []);
      setCidades(cidadesData || []);
      setTemporadas(temporadasData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // CRUD - Países
  const handleAddPais = async (nome: string, codigo: string) => {
    try {
      const { error } = await supabase.from('paises').insert({
        user_id: userId,
        nome,
        codigo: codigo,
      });

      if (error) {
        console.error('Erro ao adicionar país:', error);
        showNotification(`❌ Erro: ${error.message}`, 'error');
        return;
      }

      await loadData();
      showNotification('✅ País adicionado com sucesso!', 'success');
      setShowAddPaisModal(false);
    } catch (error) {
      console.error('Erro:', error);
      showNotification('❌ Erro ao adicionar país', 'error');
    }
  };

  const handleDeletePais = async (id: string) => {
    if (!window.confirm('⚠️ Deletar país também deletará todos os estados e cidades associados. Confirmar?')) {
      return;
    }

    try {
      await supabase.from('paises').delete().eq('id', id);
      await loadData();
      showNotification('✅ País deletado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro:', error);
      showNotification('❌ Erro ao deletar país', 'error');
    }
  };

  // CRUD - Estados
  const handleAddEstado = async (nome: string, sigla: string) => {
    if (!selectedPais) {
      showNotification('⚠️ Selecione um país primeiro', 'info');
      return;
    }

    try {
      const siglaUpper = sigla.toUpperCase();
      const { error } = await supabase.from('estados').insert({
        user_id: userId,
        pais_id: selectedPais,
        nome,
        codigo: siglaUpper,
        sigla: siglaUpper,
      });

      if (error) {
        console.error('Erro ao adicionar estado:', error);
        showNotification(`❌ Erro: ${error.message}`, 'error');
        return;
      }

      await loadData();
      showNotification('✅ Estado adicionado com sucesso!', 'success');
      setShowAddEstadoModal(false);
    } catch (error) {
      console.error('Erro:', error);
      showNotification('❌ Erro ao adicionar estado', 'error');
    }
  };

  const handleDeleteEstado = async (id: string) => {
    if (!window.confirm('⚠️ Deletar estado também deletará todas as cidades associadas. Confirmar?')) {
      return;
    }

    try {
      await supabase.from('estados').delete().eq('id', id);
      await loadData();
      showNotification('✅ Estado deletado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro:', error);
      showNotification('❌ Erro ao deletar estado', 'error');
    }
  };

  // CRUD - Cidades
  const handleAddCidade = async (nome: string, ajuste: number, taxa: number) => {
    if (!selectedEstado) {
      showNotification('⚠️ Selecione um estado primeiro', 'info');
      return;
    }

    try {
      await supabase.from('cidades_ajuste').insert({
        user_id: userId,
        estado_id: selectedEstado,
        nome,
        ajuste_percentual: ajuste,
        taxa_deslocamento: taxa,
      });
      await loadData();
      showNotification('✅ Cidade adicionada com sucesso!', 'success');
      setShowAddCidadeModal(false);
    } catch (error) {
      console.error('Erro:', error);
      showNotification('❌ Erro ao adicionar cidade', 'error');
    }
  };

  const handleUpdateCidade = async (id: string, field: string, value: number) => {
    try {
      await supabase.from('cidades_ajuste').update({ [field]: value }).eq('id', id);
      await loadData();
    } catch (error) {
      console.error('Erro:', error);
      showNotification('❌ Erro ao atualizar cidade', 'error');
    }
  };

  const handleDeleteCidade = async (id: string) => {
    if (!window.confirm('⚠️ Deseja remover esta cidade?')) return;

    try {
      await supabase.from('cidades_ajuste').delete().eq('id', id);
      await loadData();
      showNotification('✅ Cidade removida com sucesso!', 'success');
    } catch (error) {
      console.error('Erro:', error);
      showNotification('❌ Erro ao remover cidade', 'error');
    }
  };

  // CRUD - Temporadas
  const handleAddTemporada = async (nome: string, inicio: string, fim: string, ajuste: number) => {
    try {
      // Converter percentual para multiplicador (ex: 15% = 1.15, -10% = 0.90)
      const multiplicador = 1 + (ajuste / 100);

      const { error } = await supabase.from('temporadas').insert({
        template_id: templateId,
        nome,
        data_inicio: inicio,
        data_fim: fim,
        multiplicador: multiplicador,
        ativo: true,
      });

      if (error) {
        console.error('Erro ao adicionar temporada:', error);
        showNotification(`❌ Erro: ${error.message}`, 'error');
        return;
      }

      await loadData();
      showNotification('✅ Temporada adicionada com sucesso!', 'success');
      setShowAddTemporadaModal(false);
    } catch (error) {
      console.error('Erro:', error);
      showNotification('❌ Erro ao adicionar temporada', 'error');
    }
  };

  const handleUpdateTemporada = async (id: string, field: string, value: any) => {
    try {
      let updateData: any = {};

      // Se estiver atualizando ajuste percentual, converter para multiplicador
      if (field === 'ajuste_percentual') {
        const multiplicador = 1 + (parseFloat(value) / 100);
        updateData = { multiplicador };
      } else {
        updateData = { [field]: value };
      }

      const { error } = await supabase.from('temporadas').update(updateData).eq('id', id);

      if (error) {
        console.error('Erro ao atualizar temporada:', error);
        showNotification(`❌ Erro: ${error.message}`, 'error');
        return;
      }

      await loadData();
    } catch (error) {
      console.error('Erro:', error);
      showNotification('❌ Erro ao atualizar temporada', 'error');
    }
  };

  const handleDeleteTemporada = async (id: string) => {
    if (!window.confirm('⚠️ Deseja remover esta temporada?')) return;

    try {
      await supabase.from('temporadas').delete().eq('id', id);
      await loadData();
      showNotification('✅ Temporada removida com sucesso!', 'success');
    } catch (error) {
      console.error('Erro:', error);
      showNotification('❌ Erro ao remover temporada', 'error');
    }
  };

  const estadosFiltrados = estados.filter((e) => !selectedPais || e.pais_id === selectedPais);
  const cidadesFiltradas = cidades.filter((c) => !selectedEstado || c.estado_id === selectedEstado);

  // Componente de Notificação Toast
  const NotificationToast = () => {
    if (!notification) return null;

    const bgColor = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      info: 'bg-blue-500',
    }[notification.type];

    return (
      <div className="fixed top-4 right-4 z-50 animate-fade-in">
        <div className={`${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2`}>
          <span>{notification.message}</span>
        </div>
      </div>
    );
  };

  // Modal para adicionar país
  const AddPaisModal = () => {
    const [nome, setNome] = useState('');
    const [codigo, setCodigo] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (nome && codigo) {
        handleAddPais(nome, codigo);
        setNome('');
        setCodigo('');
      }
    };

    if (!showAddPaisModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Adicionar País</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do País *
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Brasil"
                required
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código do País *
              </label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ex: +55"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddPaisModal(false);
                  setNome('');
                  setCodigo('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Adicionar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Modal para adicionar estado
  const AddEstadoModal = () => {
    const [nome, setNome] = useState('');
    const [sigla, setSigla] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (nome && sigla) {
        handleAddEstado(nome, sigla);
        setNome('');
        setSigla('');
      }
    };

    if (!showAddEstadoModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Adicionar Estado</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Estado *
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: São Paulo"
                required
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sigla do Estado *
              </label>
              <input
                type="text"
                value={sigla}
                onChange={(e) => setSigla(e.target.value.toUpperCase())}
                placeholder="Ex: SP"
                maxLength={2}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddEstadoModal(false);
                  setNome('');
                  setSigla('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Adicionar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Modal para adicionar cidade
  const AddCidadeModal = () => {
    const [nome, setNome] = useState('');
    const [ajustePercentual, setAjustePercentual] = useState(0);
    const [taxaDeslocamento, setTaxaDeslocamento] = useState(0);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (nome) {
        handleAddCidade(nome, ajustePercentual, taxaDeslocamento);
        setNome('');
        setAjustePercentual(0);
        setTaxaDeslocamento(0);
      }
    };

    if (!showAddCidadeModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Adicionar Cidade</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Cidade *
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Campinas"
                required
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <NumberInput
                label="Ajuste Percentual (%)"
                value={ajustePercentual}
                onChange={setAjustePercentual}
                min={-100}
                max={100}
                step={1}
                suffix="%"
              />
              <p className="text-xs text-gray-500 mt-1">
                Valores negativos = desconto, positivos = acréscimo
              </p>
            </div>

            <div>
              <NumberInput
                label="Taxa de Deslocamento (R$)"
                value={taxaDeslocamento}
                onChange={setTaxaDeslocamento}
                min={0}
                step={10}
                placeholder="0.00"
              />
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddCidadeModal(false);
                  setNome('');
                  setAjustePercentual(0);
                  setTaxaDeslocamento(0);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Adicionar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Modal para adicionar temporada
  const AddTemporadaModal = () => {
    const [nome, setNome] = useState('');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [ajustePercentual, setAjustePercentual] = useState(0);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (nome && dataInicio && dataFim) {
        handleAddTemporada(nome, dataInicio, dataFim, ajustePercentual);
        setNome('');
        setDataInicio('');
        setDataFim('');
        setAjustePercentual(0);
      }
    };

    if (!showAddTemporadaModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Adicionar Temporada</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Temporada *
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Alta Temporada Verão"
                required
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Início *
                </label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Fim *
                </label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  required
                  min={dataInicio}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <NumberInput
                label="Ajuste Percentual (%)"
                value={ajustePercentual}
                onChange={setAjustePercentual}
                min={-100}
                max={100}
                step={1}
                suffix="%"
              />
              <p className="text-xs text-gray-500 mt-1">
                Valores negativos = desconto, positivos = acréscimo
              </p>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddTemporadaModal(false);
                  setNome('');
                  setDataInicio('');
                  setDataFim('');
                  setAjustePercentual(0);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Adicionar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="flex justify-center py-8">Carregando...</div>;
  }

  return (
    <>
      <NotificationToast />
      <AddPaisModal />
      <AddEstadoModal />
      <AddCidadeModal />
      <AddTemporadaModal />

    <div className="space-y-6">
      {/* Header com Toggles Separados */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Sistema de Ajustes de Preço
            </h3>
            <p className="text-sm text-gray-600">
              Configure ajustes por localização e temporada
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowInfoModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <Info className="w-4 h-4" />
            <span className="text-sm">Informações</span>
          </button>
        </div>

        {/* Toggles Separados */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Toggle Sistema Geográfico */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">Ajustes Geográficos</h4>
                </div>
                <p className="text-xs text-gray-600">
                  Acréscimos por cidade, estado e país
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={sistemaGeograficoAtivo}
                  onChange={(e) => onToggleSistemaGeografico(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {!sistemaGeograficoAtivo && (
              <p className="text-xs text-gray-600 mt-2">
                ⚠️ Desabilitado - Taxas de deslocamento não serão aplicadas
              </p>
            )}
          </div>

          {/* Toggle Sistema Sazonal */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-gray-900">Ajustes Sazonais</h4>
                </div>
                <p className="text-xs text-gray-600">
                  Acréscimos por data e temporada
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={sistemaSazonalAtivo}
                  onChange={(e) => onToggleSistemaSazonal(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
            {!sistemaSazonalAtivo && (
              <p className="text-xs text-gray-600 mt-2">
                ⚠️ Desabilitado - Ajustes por temporada não serão aplicados
              </p>
            )}
          </div>
        </div>
      </div>

      {(sistemaGeograficoAtivo || sistemaSazonalAtivo) && (
        <>
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b">
              <nav className="flex gap-4 px-6">
                <button
                  onClick={() => setActiveTab('geographic')}
                  className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                    activeTab === 'geographic'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <MapPin className="w-5 h-5 inline mr-2" />
                  Ajustes Geográficos
                </button>
                <button
                  onClick={() => setActiveTab('seasonal')}
                  className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                    activeTab === 'seasonal'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Calendar className="w-5 h-5 inline mr-2" />
                  Ajustes Sazonais
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'geographic' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Países */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Países
                      </h4>
                      <button
                        onClick={() => setShowAddPaisModal(true)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Adicionar país"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {paises.map((pais) => (
                        <div
                          key={pais.id}
                          onClick={() => setSelectedPais(pais.id)}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedPais === pais.id
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{pais.nome}</div>
                              <div className="text-sm text-gray-500">{pais.codigo_pais}</div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePais(pais.id);
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {paises.length === 0 && (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          Nenhum país cadastrado
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Estados */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Map className="w-4 h-4" />
                        Estados
                      </h4>
                      <button
                        onClick={() => selectedPais && setShowAddEstadoModal(true)}
                        disabled={!selectedPais}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                        title="Adicionar estado"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {estadosFiltrados.map((estado) => (
                        <div
                          key={estado.id}
                          onClick={() => setSelectedEstado(estado.id)}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedEstado === estado.id
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{estado.nome}</div>
                              <div className="text-sm text-gray-500">{estado.sigla}</div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEstado(estado.id);
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {!selectedPais && (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          Selecione um país
                        </div>
                      )}

                      {selectedPais && estadosFiltrados.length === 0 && (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          Nenhum estado cadastrado
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cidades */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Cidades
                      </h4>
                      <button
                        onClick={() => selectedEstado && setShowAddCidadeModal(true)}
                        disabled={!selectedEstado}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                        title="Adicionar cidade"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {cidadesFiltradas.map((cidade) => (
                        <div
                          key={cidade.id}
                          className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{cidade.nome}</div>
                              {/* Ocultar percentuais na listagem - mantém lógica interna */}
                              <div className="text-xs text-gray-500 mt-1">
                                Ajustes configurados
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteCidade(cidade.id)}
                              className="text-red-600 hover:text-red-700 ml-2"
                              title="Excluir cidade"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Campos de edição ocultos por padrão - podem ser expandidos se necessário */}
                          <details className="mt-2">
                            <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">
                              Editar ajustes
                            </summary>
                            <div className="space-y-2 mt-2 pt-2 border-t">
                              <div>
                                <label className="text-xs text-gray-600">Ajuste (%)</label>
                                <input
                                  key={`ajuste-${cidade.ajuste_percentual}`}
                                  type="number"
                                  step="0.1"
                                  defaultValue={cidade.ajuste_percentual}
                                  onBlur={(e) =>
                                    handleUpdateCidade(
                                      cidade.id,
                                      'ajuste_percentual',
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-full px-2 py-1 text-sm border rounded"
                                />
                              </div>

                              <div>
                                <label className="text-xs text-gray-600">Taxa (R$)</label>
                                <input
                                  key={`taxa-${cidade.taxa_deslocamento}`}
                                  type="number"
                                  step="0.01"
                                  defaultValue={cidade.taxa_deslocamento}
                                  onBlur={(e) =>
                                    handleUpdateCidade(
                                      cidade.id,
                                      'taxa_deslocamento',
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-full px-2 py-1 text-sm border rounded"
                                />
                              </div>
                            </div>
                          </details>
                        </div>
                      ))}

                      {!selectedEstado && (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          Selecione um estado
                        </div>
                      )}

                      {selectedEstado && cidadesFiltradas.length === 0 && (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          Nenhuma cidade cadastrada
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">Temporadas</h4>
                    <button
                      onClick={() => setShowAddTemporadaModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Temporada
                    </button>
                  </div>

                  <div className="space-y-3">
                    {temporadas.map((temporada) => (
                      <div
                        key={temporada.id}
                        className="p-4 border border-gray-200 rounded-lg bg-white"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="font-medium text-gray-900">{temporada.nome}</div>
                          <button
                            onClick={() => handleDeleteTemporada(temporada.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-gray-600">Data Início</label>
                            <input
                              key={`ini-${temporada.data_inicio}`}
                              type="date"
                              defaultValue={temporada.data_inicio}
                              onBlur={(e) =>
                                handleUpdateTemporada(temporada.id, 'data_inicio', e.target.value)
                              }
                              className="w-full px-2 py-1 text-sm border rounded"
                            />
                          </div>

                          <div>
                            <label className="text-xs text-gray-600">Data Fim</label>
                            <input
                              key={`fim-${temporada.data_fim}`}
                              type="date"
                              defaultValue={temporada.data_fim}
                              onBlur={(e) =>
                                handleUpdateTemporada(temporada.id, 'data_fim', e.target.value)
                              }
                              className="w-full px-2 py-1 text-sm border rounded"
                            />
                          </div>

                          <div>
                            <label className="text-xs text-gray-600">Ajuste (%)</label>
                            <input
                              key={`mtp-${temporada.multiplicador}`}
                              type="number"
                              step="0.1"
                              defaultValue={temporada.multiplicador ? ((temporada.multiplicador - 1) * 100).toFixed(1) : '0'}
                              onBlur={(e) =>
                                handleUpdateTemporada(
                                  temporada.id,
                                  'ajuste_percentual',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full px-2 py-1 text-sm border rounded"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {temporadas.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        Nenhuma temporada configurada
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal de Informações */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Como Funciona o Sistema de Ajustes de Preço?
            </h3>

            <div className="space-y-4 text-gray-700">
              <div>
                <h4 className="font-semibold text-lg mb-2">📍 Ajustes Geográficos</h4>
                <p className="text-sm">
                  Configure países, estados e cidades onde você atua. Para cada cidade, você pode definir:
                </p>
                <ul className="list-disc list-inside text-sm ml-4 mt-2 space-y-1">
                  <li><strong>Ajuste Percentual:</strong> Aumenta ou diminui o preço (ex: +15% para cidades distantes)</li>
                  <li><strong>Taxa de Deslocamento:</strong> Valor fixo adicionado (ex: R$ 200,00 de gasolina)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-2">📅 Ajustes Sazonais</h4>
                <p className="text-sm">
                  Defina períodos do ano com preços diferenciados:
                </p>
                <ul className="list-disc list-inside text-sm ml-4 mt-2 space-y-1">
                  <li><strong>Alta Temporada:</strong> Dezembro e Janeiro (+20%)</li>
                  <li><strong>Baixa Temporada:</strong> Março a Maio (-10%)</li>
                  <li><strong>Datas Especiais:</strong> Dia dos Namorados, Natal (+30%)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-2">💡 Quando Desabilitar?</h4>
                <p className="text-sm">
                  Se você desabilitar o sistema, os ajustes não serão aplicados automaticamente.
                  Neste caso, é recomendado informar aos clientes sobre taxas de deslocamento
                  diretamente na mensagem ou durante o contato.
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
