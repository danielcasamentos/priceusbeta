import { useState, useEffect, useRef } from 'react';
import { Calendar, Plus, Trash2, Edit2, Save, X, Settings, Upload, CheckCircle, AlertCircle, FileUp, History, Trash, ToggleLeft, ToggleRight, CalendarOff, Flag, PartyPopper, Loader2, Plane, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { CalendarImportModal } from './CalendarImportModal';
import { CalendarUpgradeModal } from './CalendarUpgradeModal';
import {
  getOrCreateAgendaConfig,
  getEventosByMonth,
  addEvento,
  updateEvento,
  deleteEvento,
  bloquearData,
  desbloquearData,
  getDatasBloqueadas,
  getPeriodosBloqueados,
  limparTodosEventos,
  importarEventosInteligente,
  getHistoricoImportacoes,
  rollbackImportacao,
  contarEventosAtivos,
  triggerCalendarSync,
  type EventoAgenda,
  type ConfiguracaoAgenda,
  type HistoricoImportacao,
} from '../services/availabilityService';
import { NumberInput } from './ui/NumberInput';

interface AgendaManagerProps {
  userId: string;
}

export function AgendaManager({ userId }: AgendaManagerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [feriadosPersonalizados, setFeriadosPersonalizados] = useState<any[]>([]);
  const [periodosBloqueados, setPeriodosBloqueados] = useState<any[]>([]);
  const [datasBloqueadas, setDatasBloqueadas] = useState<string[]>([]);
  const [config, setConfig] = useState<ConfiguracaoAgenda | null>(null);
  const [loading, setLoading] = useState(true);
  const [feriadosNacionais, setFeriadosNacionais] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'calendar' | 'list' | 'feriados' | 'config'>('calendar');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvento, setEditingEvento] = useState<EventoAgenda | null>(null);
  const [novoEvento, setNovoEvento] = useState({
    data_evento: '',
    tipo_evento: 'evento',
    cliente_nome: '',
    cidade: '',
    status: 'pendente' as 'confirmado' | 'pendente' | 'concluido' | 'cancelado',
    observacoes: '',
  });

  const [configEdit, setConfigEdit] = useState({
    eventos_max_por_dia: 1,
    modo_aviso: 'sugestivo' as 'informativo' | 'sugestivo' | 'restritivo',
    agenda_ativa: true,
    dias_semana_bloqueados: [] as number[],
    regras_massa_ativas: false,
    bloquear_feriados: true, // Ativado por padrão
    regra_par_impar: 'nenhum' as 'nenhum' | 'pares' | 'impares',    regra_semanal: 'nenhum' as 'nenhum' | 'trabalha_pares' | 'trabalha_impares',
    regra_semanal_inicio: null as string | null,
    calendar_ics_url: '',
    auto_sync_enabled: false,
    last_calendar_sync: null as string | null,
  });

  const [importStatus, setImportStatus] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info';
    message: string;
    details?: string[];
  }>({ show: false, type: 'info', message: '' });

  const [showImportModal, setShowImportModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearIncludeManual, setClearIncludeManual] = useState(false);
  const [historicoImportacoes, setHistoricoImportacoes] = useState<HistoricoImportacao[]>([]);
  const [showAddPeriodoModal, setShowAddPeriodoModal] = useState(false);
  const [novoPeriodo, setNovoPeriodo] = useState({
    motivo: '',
    data_inicio: '',
    data_fim: '',
  });
  const [eventosAtivos, setEventosAtivos] = useState(0);

  const planLimits = usePlanLimits();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [userId, currentMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const configData = await getOrCreateAgendaConfig(userId);
      setConfig(configData);
      if (configData) {
        setConfigEdit({
          eventos_max_por_dia: configData.eventos_max_por_dia,
          modo_aviso: configData.modo_aviso,
          agenda_ativa: configData.agenda_ativa,
          dias_semana_bloqueados: configData.dias_semana_bloqueados || [],
          regras_massa_ativas: configData.regras_massa_ativas || false,
          bloquear_feriados: configData.bloquear_feriados || false,
          regra_par_impar: configData.regra_par_impar || 'nenhum',
          regra_semanal: configData.regra_semanal || 'nenhum',
          regra_semanal_inicio: configData.regra_semanal_inicio,
          calendar_ics_url: configData.calendar_ics_url || '',
          auto_sync_enabled: configData.auto_sync_enabled || false,
          last_calendar_sync: configData.last_calendar_sync || null,
        });
      }

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const eventosData = await getEventosByMonth(userId, year, month);
      setEventos(eventosData);

      const bloqueadas = await getDatasBloqueadas(userId);
      setDatasBloqueadas(bloqueadas);

      const periodos = await getPeriodosBloqueados(userId);
      setPeriodosBloqueados(periodos || []);

      const ativos = await contarEventosAtivos(userId);
      setEventosAtivos(ativos);

      if (planLimits.canImportCalendar) {
        const historico = await getHistoricoImportacoes(userId);
        setHistoricoImportacoes(historico);
      }

      const { data: feriadosData } = await supabase.from('feriados').select('*').eq('user_id', userId);
      setFeriadosPersonalizados(feriadosData || []);

      // Carregar feriados nacionais da API
      try {
        const year = currentMonth.getFullYear();
        const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
        if (!response.ok) throw new Error('Falha na resposta da API de feriados');
        const holidays = await response.json();
        setFeriadosNacionais(holidays || []);
      } catch (apiError) {
        console.error("Erro ao buscar feriados da BrasilAPI:", apiError);
        // Não quebra a aplicação, apenas não mostra os feriados nacionais
      }

    } catch (error) {
      console.error('Erro ao carregar dados da agenda:', error);
      setImportStatus({
        show: true,
        type: 'error',
        message: 'Erro ao carregar dados',
        details: ['Verifique sua conexão e tente novamente']
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvento = async () => {
    if (!novoEvento.data_evento || !novoEvento.cliente_nome) {
      alert('Preencha pelo menos a data e o nome do cliente');
      return;
    }

    if (!planLimits.isPremium && eventosAtivos >= 20) {
      setShowUpgradeModal(true);
      return;
    }

    const result = await addEvento({
      user_id: userId,
      ...novoEvento,
    });

    if (result) {
      await loadData();
      setShowAddModal(false);
      setNovoEvento({
        data_evento: '',
        tipo_evento: 'evento',
        cliente_nome: '',
        cidade: '',
        status: 'pendente',
        observacoes: '',
      });
    } else {
      alert('Erro ao adicionar evento');
    }
  };

  const handleUpdateEvento = async () => {
    if (!editingEvento) return;

    const result = await updateEvento(editingEvento.id, editingEvento);

    if (result) {
      await loadData();
      setEditingEvento(null);
    } else {
      alert('Erro ao atualizar evento');
    }
  };

  const handleDeleteEvento = async (id: string) => {
    if (!confirm('Deseja realmente excluir este evento?')) return;

    const result = await deleteEvento(id);

    if (result) {
      await loadData();
    } else {
      alert('Erro ao excluir evento');
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;

    try {
      const { error } = await supabase
        .from('configuracao_agenda')
        .update(configEdit)
        .eq('user_id', userId);

      if (error) throw error;

      await loadData();
      alert('Configurações salvas!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações');
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const handleSyncNow = async () => {
    setIsSyncing(true);
    setImportStatus({ show: true, type: 'info', message: 'Sincronizando calendário externo...' });
    
    // Salvar a URL antes de sincronizar caso tenha sido alterada
    try {
       await supabase.from('configuracao_agenda').update({ 
         calendar_ics_url: configEdit.calendar_ics_url,
         auto_sync_enabled: configEdit.auto_sync_enabled
       }).eq('user_id', userId);
    } catch(e) { console.error('Erro ao salvar a url: ', e) }

    const result = await triggerCalendarSync();
    if (result.success) {
      setImportStatus({ show: true, type: 'success', message: result.message });
      await loadData(); // Recarregar para pegar a data de ultima sync
    } else {
      setImportStatus({ show: true, type: 'error', message: 'Erro na sincronização', details: [result.message] });
    }
    setIsSyncing(false);
  };

  const handleDiasSemanaChange = (dia: number) => {
    const diasAtuais = configEdit.dias_semana_bloqueados || [];
    let novosDias;
    if (diasAtuais.includes(dia)) {
      novosDias = diasAtuais.filter(d => d !== dia);
    } else {
      novosDias = [...diasAtuais, dia];
    }
    setConfigEdit({ ...configEdit, dias_semana_bloqueados: novosDias });
  };

  const handleRegraChange = (field: 'regra_par_impar' | 'regra_semanal', value: string) => {
    // Se o valor já estiver selecionado, desmarque-o (volte para 'nenhum')
    const novoValor = configEdit[field] === value ? 'nenhum' : value;
    setConfigEdit({ ...configEdit, [field]: novoValor });
  };

  const handleAddPeriodo = async () => {
    if (!novoPeriodo.motivo || !novoPeriodo.data_inicio || !novoPeriodo.data_fim) {
      alert('Preencha todos os campos para adicionar o período.');
      return;
    }

    try {
      const { error } = await supabase.from('periodos_bloqueados').insert({
        user_id: userId,
        motivo: novoPeriodo.motivo,
        data_inicio: novoPeriodo.data_inicio,
        data_fim: novoPeriodo.data_fim,
      });

      if (error) throw error;

      await loadData();
      setShowAddPeriodoModal(false);
      // Limpa o formulário do modal
      setNovoPeriodo({ motivo: '', data_inicio: '', data_fim: '' });
    } catch (error) {
      console.error('Erro ao adicionar período de bloqueio:', error);
      alert('Erro ao adicionar período.');
    }
  };

  const handleAddFeriado = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const nome = (form.elements.namedItem('nome') as HTMLInputElement).value;
    const data = (form.elements.namedItem('data') as HTMLInputElement).value;

    if (!nome || !data) return;

    const { error } = await supabase.from('feriados').insert({ user_id: userId, nome, data });
    if (error) {
      alert('Erro ao adicionar feriado: ' + error.message);
    } else {
      form.reset();
      await loadData();
    }
  };
  const parseCSV = (text: string): Array<{ data: string; nome: string; tipo?: string; cidade?: string }> => {
    const lines = text.split('\n').filter(line => line.trim());
    const eventos: Array<{ data: string; nome: string; tipo?: string; cidade?: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));

      if (parts.length >= 2) {
        const dataStr = parts[0];
        let data = '';

        if (dataStr.includes('/')) {
          const dateParts = dataStr.split('/');
          if (dateParts.length === 3) {
            const [d, m, y] = dateParts;
            data = `${y.padStart(4, '20')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }
        } else if (dataStr.includes('-')) {
          data = dataStr;
        }

        if (data && parts[1]) {
          eventos.push({
            data,
            nome: parts[1],
            tipo: parts[2] || 'evento',
            cidade: parts[3] || ''
          });
        }
      }
    }

    return eventos;
  };

  const parseICS = (text: string): Array<{ data: string; nome: string; tipo?: string }> => {
    const eventos: Array<{ data: string; nome: string; tipo?: string }> = [];
    const lines = text.split('\n');

    let currentEvent: { data?: string; nome?: string; tipo?: string } = {};
    let inEvent = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine === 'BEGIN:VEVENT') {
        inEvent = true;
        currentEvent = { tipo: 'evento' };
      } else if (trimmedLine === 'END:VEVENT') {
        if (currentEvent.data && currentEvent.nome) {
          eventos.push(currentEvent as { data: string; nome: string; tipo?: string });
        }
        inEvent = false;
        currentEvent = {};
      } else if (inEvent) {
        if (trimmedLine.startsWith('DTSTART')) {
          const dateMatch = trimmedLine.match(/(\d{4})(\d{2})(\d{2})/);
          if (dateMatch) {
            currentEvent.data = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
          }
        } else if (trimmedLine.startsWith('SUMMARY:')) {
          currentEvent.nome = trimmedLine.substring(8).trim();
        } else if (trimmedLine.startsWith('DESCRIPTION:')) {
          currentEvent.tipo = trimmedLine.substring(12).trim() || 'evento';
        } else if (trimmedLine.startsWith('LOCATION:')) {
          if (!currentEvent.tipo || currentEvent.tipo === 'evento') {
            currentEvent.tipo = trimmedLine.substring(9).trim() || 'evento';
          }
        }
      }
    }

    return eventos;
  };

  const handleImportClick = () => {
    if (!planLimits.canImportCalendar) {
      setShowUpgradeModal(true);
      return;
    }
    setShowImportModal(true);
  };

  const handleSmartImport = async (file: File, estrategia: 'substituir_tudo' | 'adicionar_novos' | 'mesclar_atualizar') => {
    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isICS = fileName.endsWith('.ics') || fileName.endsWith('.ical');

    if (!isCSV && !isICS) {
      setImportStatus({
        show: true,
        type: 'error',
        message: 'Formato não suportado',
        details: ['Por favor, envie um arquivo CSV ou ICS (iCalendar)']
      });
      return;
    }

    try {
      const text = await file.text();
      let parsedEventos: Array<{ data: string; nome: string; tipo?: string; cidade?: string }> = [];

      if (isCSV) {
        parsedEventos = parseCSV(text);
      } else if (isICS) {
        parsedEventos = parseICS(text);
      }

      if (parsedEventos.length === 0) {
        setImportStatus({
          show: true,
          type: 'error',
          message: 'Nenhum evento encontrado',
          details: ['Verifique se o arquivo está no formato correto']
        });
        return;
      }

      const result = await importarEventosInteligente(userId, file.name, parsedEventos, estrategia);

      await loadData();
      setActiveTab('list');

      if (result.success) {
        const estrategiaLabels = {
          substituir_tudo: 'Substituir Tudo',
          adicionar_novos: 'Adicionar Apenas Novos',
          mesclar_atualizar: 'Mesclar e Atualizar'
        };

        const detalhes = [
          `Estratégia: ${estrategiaLabels[estrategia]}`,
          `✓ ${result.eventos_adicionados} eventos adicionados`,
        ];

        if (result.eventos_atualizados > 0) {
          detalhes.push(`↻ ${result.eventos_atualizados} eventos atualizados`);
        }
        if (result.eventos_ignorados > 0) {
          detalhes.push(`- ${result.eventos_ignorados} eventos ignorados (duplicatas)`);
        }
        if (result.eventos_removidos > 0) {
          detalhes.push(`✗ ${result.eventos_removidos} eventos removidos`);
        }
        if (result.errors.length > 0) {
          detalhes.push(`⚠ ${result.errors.length} erros`);
        }

        setImportStatus({
          show: true,
          type: result.errors.length === 0 ? 'success' : 'info',
          message: 'Importação concluída com sucesso!',
          details: detalhes
        });
      } else {
        setImportStatus({
          show: true,
          type: 'error',
          message: 'Falha na importação',
          details: result.errors.slice(0, 5)
        });
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      setImportStatus({
        show: true,
        type: 'error',
        message: 'Erro ao processar arquivo',
        details: ['Verifique se o arquivo está corrompido ou em formato inválido']
      });
    }
  };

  const handleClearEvents = async () => {
    const count = await limparTodosEventos(userId, clearIncludeManual);
    await loadData();
    setShowClearConfirm(false);
    setImportStatus({
      show: true,
      type: 'success',
      message: `${count} eventos foram removidos com sucesso!`,
      details: [clearIncludeManual ? 'Todos os eventos foram limpos' : 'Eventos importados foram limpos. Eventos manuais foram preservados.']
    });
  };

  const handleRollback = async (importacaoId: string) => {
    if (!confirm('Deseja realmente desfazer esta importação? Esta ação é irreversível.')) return;

    const count = await rollbackImportacao(userId, importacaoId);
    await loadData();
    setImportStatus({
      show: true,
      type: 'success',
      message: `Importação desfeita com sucesso!`,
      details: [`${count} eventos foram removidos`]
    });
  };

  const getEventosPorData = (data: string) => {
    return eventos.filter((e) => e.data_evento === data && e.status !== 'cancelado');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'concluido':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelado':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const statusLabels = {
    confirmado: 'Confirmado',
    pendente: 'Pendente',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const formatDateForDB = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDayStatus = (date: Date) => {
    const dateStr = formatDateForDB(date);
    const eventosDia = getEventosPorData(dateStr);
    const todosFeriados = [...feriadosNacionais.map(f => ({ ...f, tipo: 'nacional' })), ...feriadosPersonalizados];
    const feriadoDoDia = todosFeriados.find(f => f.data === dateStr);
    const isBloqueada = datasBloqueadas.includes(dateStr);

    if (isBloqueada) {
      return { status: 'bloqueada', color: 'bg-gray-200 text-gray-600', count: 0, feriado: feriadoDoDia };
    }

    const eventosAtivos = eventosDia.filter(e => e.status !== 'cancelado').length;
    const maxEventos = config?.eventos_max_por_dia || 1;

    if (eventosAtivos === 0) {
      return { status: 'disponivel', color: 'bg-white hover:bg-gray-50', count: 0, feriado: feriadoDoDia };
    }

    if (eventosAtivos < maxEventos) {
      return { status: 'parcial', color: 'bg-yellow-50 border-yellow-300', count: eventosAtivos, feriado: feriadoDoDia };
    }

    return { status: 'ocupada', color: 'bg-red-50 border-red-300', count: eventosAtivos, feriado: feriadoDoDia };
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(formatDateForDB(date));
    setShowDateModal(true);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-green-600"></div>
      </div>
    );
  }

  const limitPercentage = planLimits.eventsLimit === 'unlimited' ? 0 : (eventosAtivos / (planLimits.eventsLimit as number)) * 100;
  const nearLimit = !planLimits.isPremium && limitPercentage >= 80;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agenda de Eventos</h2>
          <p className="text-sm text-gray-600 mt-1">
            Gerencie seus eventos e controle a disponibilidade de datas
          </p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                {eventosAtivos} / {planLimits.eventsLimit === 'unlimited' ? '∞' : planLimits.eventsLimit} eventos
              </span>
            </div>
            {nearLimit && (
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="px-3 py-1 bg-gradient-to-r from-green-600 to-green-700 text-white text-xs font-medium rounded-full hover:from-green-700 hover:to-green-800 transition-all"
              >
                Upgrade para Ilimitado
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={!planLimits.isPremium && eventosAtivos >= 20}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          Novo Evento
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                activeTab === 'calendar'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-5 h-5" />
              Calendário
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                activeTab === 'list'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-5 h-5" />
              Lista
            </button>
            <button
              onClick={() => setActiveTab('feriados')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                activeTab === 'feriados'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Flag className="w-5 h-5" /> Feriados
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                activeTab === 'config'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-5 h-5" /> Configurações
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'calendar' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={handlePreviousMonth}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  ← Anterior
                </button>
                <h3 className="text-xl font-bold text-gray-900">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <button
                  onClick={handleNextMonth}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Próximo →
                </button>
              </div>

              <div className="overflow-x-auto pb-4">
                <div className="min-w-[700px] grid grid-cols-7 gap-2">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="text-center font-semibold text-gray-700 py-2 text-sm"
                    >
                      {day}
                    </div>
                  ))}

                  {getDaysInMonth(currentMonth).map((date, index) => {
                    if (!date) {
                      return <div key={`empty-${index}`} className="min-h-[100px]" />;
                    }

                    const dayStatus = getDayStatus(date);
                    const isToday =
                      date.toDateString() === new Date().toDateString();
                    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                    
                    const eventosDoDia = eventos.filter(e => {
                      const dataLocal = new Date(e.data_evento + 'T00:00:00');
                      return dataLocal.toDateString() === date.toDateString();
                    });

                    return (
                      <button
                        key={index}
                        onClick={() => handleDateClick(date)}
                        disabled={isPast}
                        className={`min-h-[100px] flex flex-col items-start border rounded-lg p-2 transition-all ${
                          dayStatus.color
                        } ${
                          isToday ? 'ring-2 ring-green-500' : ''
                        } ${
                          isPast ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'
                        } relative overflow-hidden`}
                      >
                        <div className="flex w-full justify-between items-start mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {date.getDate()}
                          </span>
                          {dayStatus.feriado && (
                            <span title={dayStatus.feriado.name || dayStatus.feriado.nome}>🚩</span>
                          )}
                        </div>
                        
                        <div className="flex-1 w-full flex flex-col gap-1 overflow-y-auto hidden-scrollbar">
                           {eventosDoDia.slice(0, 3).map(evento => (
                             <div 
                               key={evento.id} 
                               className={`w-full text-left truncate text-[10px] leading-tight px-1.5 py-1 rounded border ${
                                  evento.status === 'confirmado' ? 'bg-green-100 border-green-200 text-green-800' :
                                  evento.status === 'pendente' ? 'bg-yellow-100 border-yellow-200 text-yellow-800' :
                                  'bg-gray-100 border-gray-200 text-gray-800'
                               }`}
                             >
                               {evento.cliente_nome || 'Evento'}
                             </div>
                           ))}
                           {eventosDoDia.length > 3 && (
                              <div className="text-[10px] text-gray-500 font-medium pl-1">
                                +{eventosDoDia.length - 3} mais
                              </div>
                           )}
                        </div>

                        {dayStatus.status === 'bloqueada' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
                            <div className="w-10 h-0.5 bg-gray-500 rotate-45"></div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 mt-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
                  <span className="text-gray-600">Disponível</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-50 border border-yellow-300 rounded"></div>
                  <span className="text-gray-600">Parcial</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-50 border border-red-300 rounded"></div>
                  <span className="text-gray-600">Ocupada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 rounded relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-0.5 bg-gray-500 rotate-45"></div>
                    </div>
                  </div>
                  <span className="text-gray-600">Bloqueada</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'list' && (
            <div className="space-y-4">
              {eventos.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhum evento cadastrado</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-4 text-green-600 hover:text-green-700 font-medium"
                  >
                    Adicionar primeiro evento
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {eventos.map((evento) => (
                    <div
                      key={evento.id}
                      className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-gray-900">
                            {new Date(evento.data_evento + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                              evento.status
                            )}`}
                          >
                            {statusLabels[evento.status]}
                          </span>
                        </div>
                        <p className="text-gray-900 font-medium">{evento.cliente_nome}</p>
                        {evento.tipo_evento && (
                          <p className="text-sm text-gray-600">Tipo: {evento.tipo_evento}</p>
                        )}
                        {evento.cidade && (
                          <p className="text-sm text-gray-600">Cidade: {evento.cidade}</p>
                        )}
                        {evento.observacoes && (
                          <p className="text-sm text-gray-500 mt-1">{evento.observacoes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingEvento(evento)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvento(evento.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'feriados' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900">Feriados Personalizados</h3>
                <p className="text-sm text-gray-600 mt-1">Adicione feriados estaduais, municipais ou pontos facultativos.</p>
              </div>

              <form onSubmit={handleAddFeriado} className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 border rounded-lg">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Nome do Feriado</label>
                  <input name="nome" type="text" required className="w-full mt-1 p-2 border rounded-md" placeholder="Ex: Aniversário da Cidade" />
                </div>
                <div>
                  <label className="text-sm font-medium">Data</label>
                  <input name="data" type="date" required className="w-full mt-1 p-2 border rounded-md" />
                </div>
                <div className="sm:col-span-3">
                  <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Adicionar Feriado</button>
                </div>
              </form>

              <div className="space-y-3">
                {feriadosPersonalizados.length > 0 ? feriadosPersonalizados.map(feriado => (
                  <div key={feriado.id} className="flex justify-between items-center p-3 bg-white border rounded-lg">
                    <div>
                      <p className="font-medium">{feriado.nome}</p>
                      <p className="text-sm text-gray-500">{new Date(feriado.data + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                    </div>
                    <button onClick={() => handleDeleteFeriado(feriado.id)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )) : (
                  <div className="text-center text-gray-500 py-8">
                    <p>Nenhum feriado personalizado adicionado.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'feriados' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Coluna da Esquerda: Feriados */}
              <div className="space-y-6">
                <div className="text-left">
                  <h3 className="text-xl font-bold text-gray-900">Gestão de Feriados</h3>
                  <p className="text-sm text-gray-600 mt-1">Decida em quais feriados você irá trabalhar.</p>
                </div>

                {/* Feriados Nacionais */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Feriados Nacionais de {currentMonth.getFullYear()}</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {feriadosNacionais.map(feriado => {
                      const isBlocked = datasBloqueadas.includes(feriado.date);
                      return (
                        <div key={feriado.date} className={`flex justify-between items-center p-3 rounded-lg border ${isBlocked ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                          <div>
                            <p className="font-medium">{feriado.name}</p>
                            <p className="text-sm text-gray-500">{new Date(feriado.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
                          </div>
                          <button
                            onClick={() => isBlocked ? desbloquearData(userId, feriado.date).then(loadData) : bloquearData(userId, feriado.date, `Feriado: ${feriado.name}`).then(loadData)}
                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${isBlocked ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                          >
                            {isBlocked ? 'Bloqueado' : 'Trabalhar'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Feriados Personalizados */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Feriados Personalizados</h3>
                  <form onSubmit={handleAddFeriado} className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 border rounded-lg mb-4">
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium">Nome do Feriado</label>
                      <input name="nome" type="text" required className="w-full mt-1 p-2 border rounded-md" placeholder="Ex: Aniversário da Cidade" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Data</label>
                      <input name="data" type="date" required className="w-full mt-1 p-2 border rounded-md" />
                    </div>
                    <div className="sm:col-span-3">
                      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Adicionar Feriado</button>
                    </div>
                  </form>
                  <div className="space-y-2">
                    {feriadosPersonalizados.map(feriado => (
                      <div key={feriado.id} className="flex justify-between items-center p-3 bg-white border rounded-lg">
                        <div>
                          <p className="font-medium">{feriado.nome}</p>
                          <p className="text-sm text-gray-500">{new Date(feriado.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
                        </div>
                        <button onClick={() => handleDeleteFeriado(feriado.id)} className="text-red-500 hover:text-red-700 p-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Coluna da Direita: Períodos de Bloqueio */}
              <div className="space-y-6">
                <div className="text-left">
                  <h3 className="text-xl font-bold text-gray-900">Períodos de Bloqueio</h3>
                  <p className="text-sm text-gray-600 mt-1">Defina suas férias, recessos ou outros períodos de ausência.</p>
                </div>

                <div className="p-4 bg-gray-50 border rounded-lg">
                  <button
                    onClick={() => setShowAddPeriodoModal(true)}
                    className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600"
                  >
                    <Plus size={16} /> Adicionar Período (Férias)
                  </button>
                </div>

                <div className="space-y-3">
                  {periodosBloqueados.length > 0 ? periodosBloqueados.map(periodo => (
                    <div key={periodo.id} className="flex justify-between items-center p-3 bg-white border rounded-lg">
                      <div>
                        <p className="font-medium">{periodo.motivo}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(periodo.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')} até {new Date(periodo.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <button onClick={() => handleDeletePeriodo(periodo.id)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )) : (
                    <div className="text-center text-gray-500 py-8">
                      <Plane className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p>Nenhum período de bloqueio adicionado.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-8 max-w-3xl mx-auto">
              {importStatus.show && (
                <div className={`p-4 rounded-lg border ${
                  importStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                  importStatus.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                  'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{importStatus.message}</p>
                      {importStatus.details && importStatus.details.length > 0 && (
                        <ul className="mt-2 text-sm space-y-1">
                          {importStatus.details.map((detail, idx) => (
                            <li key={idx}>{detail}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button
                      onClick={() => setImportStatus({ show: false, type: 'info', message: '' })}
                      className="ml-4 text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start gap-3 mb-3">
                  <FileUp className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">Importar Calendário</h3>
                      {!planLimits.canImportCalendar && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-green-600 to-green-700 text-white rounded-full">
                          Premium
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Importe eventos de arquivos CSV ou ICS com sistema inteligente anti-duplicatas
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleImportClick}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
                >
                  <Upload className="w-5 h-5" />
                  {planLimits.canImportCalendar ? 'Importar Arquivo de Calendário' : 'Upgrade para Importar Calendários'}
                </button>

                <details className="text-sm text-gray-600 mt-3">
                  <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900 mb-2">
                    Formato CSV esperado
                  </summary>
                  <div className="pl-4 space-y-1 text-xs bg-white p-3 rounded border border-gray-200">
                    <p className="font-mono">data,nome,tipo,cidade</p>
                    <p className="font-mono">01/12/2025,João Silva,Casamento,São Paulo</p>
                    <p className="font-mono">15/12/2025,Maria Santos,Ensaio,Rio de Janeiro</p>
                    <p className="text-gray-500 mt-2">Data pode ser DD/MM/AAAA ou AAAA-MM-DD</p>
                  </div>
                </details>
              </div>

              {planLimits.canImportCalendar && historicoImportacoes.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="w-5 h-5 text-gray-600" />
                    <h3 className="font-medium text-gray-900">Histórico de Importações</h3>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {historicoImportacoes.map((hist) => (
                      <div key={hist.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{hist.nome_arquivo}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {new Date(hist.created_at).toLocaleString('pt-BR')}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                            <span>✓ {hist.eventos_adicionados} adicionados</span>
                            {hist.eventos_atualizados > 0 && <span>↻ {hist.eventos_atualizados} atualizados</span>}
                            {hist.eventos_ignorados > 0 && <span>- {hist.eventos_ignorados} ignorados</span>}
                            {hist.eventos_removidos > 0 && <span>✗ {hist.eventos_removidos} removidos</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRollback(hist.id)}
                          className="ml-3 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Desfazer importação"
                        >
                          Desfazer
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-start gap-3 mb-3">
                  <Trash className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-red-900 mb-1">Limpar Eventos</h3>
                    <p className="text-sm text-red-700 mb-3">
                      Remove eventos do calendário. Esta ação é irreversível!
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  <Trash className="w-5 h-5" />
                </button>
              </div>

              {/* Sincronização Externa */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-start gap-3 mb-4">
                  <RefreshCw className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">Integração Automática Externa</h3>
                    <p className="text-sm text-gray-600">
                      Cole o Link Público/Secreto (formato .ics) do seu Google Calendar ou Apple Calendar para que seus compromissos pessoais sejam sincronizados aqui e bloqueiem seus horários.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4 ml-8">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">URL do Calendário (.ics)</label>
                     <input
                       type="url"
                       placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                       value={configEdit.calendar_ics_url || ''}
                       onChange={(e) => setConfigEdit({ ...configEdit, calendar_ics_url: e.target.value })}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                     />
                   </div>

                   <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex items-start gap-2">
                     <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                     <p>Os eventos importados desta forma sempre entrarão como "Confirmado" e alocarão o seu horário. O sistema irá sincronizar e apenas adicionar os eventos novos.</p>
                   </div>

                   <div className="flex items-center gap-3">
                     <button
                       onClick={handleSyncNow}
                       disabled={isSyncing || !configEdit.calendar_ics_url}
                       className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                     >
                       {isSyncing ? (
                         <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                       ) : (
                         <RefreshCw className="w-4 h-4" />
                       )}
                       {isSyncing ? 'Sincronizando...' : 'Salvar URL e Sincronizar Agora'}
                     </button>
                     
                     {configEdit.last_calendar_sync && (
                        <p className="text-xs text-gray-500">
                           Última sincronização: {new Date(configEdit.last_calendar_sync).toLocaleString('pt-BR')}
                        </p>
                     )}
                   </div>

                   <details className="text-sm text-gray-600 mt-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                     <summary className="cursor-pointer font-medium text-blue-600 hover:text-blue-800">
                       Como encontrar meu Link do Calendário (Google/Apple)?
                     </summary>
                     <div className="pl-4 mt-3 space-y-4 pb-2 text-xs">
                       <div>
                         <p className="font-bold text-gray-800 mb-1">Passo a passo - Google Calendar:</p>
                         <ol className="list-decimal pl-4 space-y-1 text-gray-700">
                           <li>Acesse <strong>calendar.google.com</strong> no seu computador.</li>
                           <li>Clique no ícone de Engrenagem ⚙️ e vá em "Configurações".</li>
                           <li>Na aba esquerda, procure por "Configurações das minhas agendas" e clique no seu e-mail.</li>
                           <li>Role a tela até a seção <strong>Integrar agenda</strong>.</li>
                           <li>Copie o <strong>Endereço secreto no formato iCal</strong> e cole-o no campo acima.</li>
                         </ol>
                       </div>
                       <div>
                         <p className="font-bold text-gray-800 mb-1">Passo a passo - Apple Calendar (iCloud):</p>
                         <ol className="list-decimal pl-4 space-y-1 text-gray-700">
                           <li>Abra o aplicativo Calendário no Mac, iPhone ou em <strong>icloud.com/calendar</strong>.</li>
                           <li>Clique no ícone redondo de "compartilhamento" ao lado do nome do calendário na barra lateral.</li>
                           <li>Marque a opção "Calendário Público" (apenas quem tiver o link longo gerado terá acesso).</li>
                           <li>Copie o link que aparecer, volte aqui e cole-o no campo acima.</li>
                         </ol>
                       </div>
                     </div>
                   </details>
                </div>
              </div>

              {/* Bloqueio de Feriados */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Bloquear Feriados Nacionais</h3>
                    <p className="text-sm text-gray-600">
                      Bloqueia automaticamente os feriados cadastrados no sistema.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={configEdit.bloquear_feriados} onChange={(e) => setConfigEdit({ ...configEdit, bloquear_feriados: e.target.checked })} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">Nota: Você precisará cadastrar os feriados para que esta função funcione.</p>
              </div>

              {/* REGRAS DE BLOQUEIO EM MASSA */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${configEdit.regras_massa_ativas ? 'bg-blue-100' : 'bg-gray-200'}`}>
                      {configEdit.regras_massa_ativas ? <ToggleRight className="w-5 h-5 text-blue-600" /> : <ToggleLeft className="w-5 h-5 text-gray-500" />}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Regras de Bloqueio em Massa</h3>
                      <p className="text-sm text-gray-600">
                        Defina regras para bloquear dias automaticamente na sua agenda.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={configEdit.regras_massa_ativas} onChange={(e) => setConfigEdit({ ...configEdit, regras_massa_ativas: e.target.checked })} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className={`space-y-6 pl-4 transition-opacity ${configEdit.regras_massa_ativas ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                  {/* Bloqueio por dia da semana */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bloquear dias da semana
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {weekDays.map((dia, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleDiasSemanaChange(index)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                            configEdit.dias_semana_bloqueados?.includes(index)
                              ? 'bg-red-600 text-white border-red-700 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {dia}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bloqueio por dias pares/ímpares */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bloquear por dia do mês
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleRegraChange('regra_par_impar', 'pares')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                          configEdit.regra_par_impar === 'pares'
                            ? 'bg-red-600 text-white border-red-700 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Bloquear Dias Pares
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRegraChange('regra_par_impar', 'impares')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                          configEdit.regra_par_impar === 'impares'
                            ? 'bg-red-600 text-white border-red-700 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Bloquear Dias Ímpares
                      </button>
                    </div>
                  </div>

                  {/* Bloqueio por semana sim/não */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bloqueio Semanal Alternado
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button /* Trabalhar semanas PARES */
                        type="button"
                        onClick={() => handleRegraChange('regra_semanal', 'trabalha_pares')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                          configEdit.regra_semanal === 'trabalha_pares'
                            ? 'bg-red-600 text-white border-red-700 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Trabalhar Semanas Pares
                      </button>
                      <button /* Trabalhar semanas ÍMPARES */
                        type="button"
                        onClick={() => handleRegraChange('regra_semanal', 'trabalha_impares')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                          configEdit.regra_semanal === 'trabalha_impares'
                            ? 'bg-red-600 text-white border-red-700 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Trabalhar Semanas Ímpares
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Define um padrão de trabalho em semanas alternadas do ano.</p>
                    {configEdit.regra_semanal !== 'nenhum' && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data de início da contagem
                        </label>
                        <input
                          type="date"
                          value={configEdit.regra_semanal_inicio || ''}
                          onChange={(e) => setConfigEdit({ ...configEdit, regra_semanal_inicio: e.target.value })}
                          className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <p className="text-xs text-gray-500 mt-1">A contagem de semanas pares/ímpares começará a partir desta data.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 mb-4">
                  <input // CORREÇÃO: O estado `configEdit` deve ser usado aqui para refletir as mudanças antes de salvar.
                    type="checkbox"
                    checked={configEdit.agenda_ativa ?? false}
                    onChange={(e) =>
                      setConfigEdit({ ...configEdit, agenda_ativa: e.target.checked })
                    }
                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                  />
                  <span className="font-medium text-gray-900">Sistema de Agenda Ativo</span>
                </label>
                <p className="text-sm text-gray-600 ml-7">
                  Quando ativo, o sistema verifica a disponibilidade de datas no orçamento
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Eventos por Dia
                </label>
                <select
                  value={configEdit.eventos_max_por_dia}
                  onChange={(e) =>
                    setConfigEdit({
                      ...configEdit,
                      eventos_max_por_dia: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  {[1, 2, 3, 4, 5].map((num) => (
                    <option key={num} value={num}>
                      {num} evento{num > 1 ? 's' : ''} por dia
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-600 mt-1">
                  Quantos eventos você pode realizar no mesmo dia?
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Modo de Aviso ao Cliente
                </label>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer">
                    <input
                      type="radio"
                      name="modo_aviso"
                      value="informativo"
                      checked={configEdit.modo_aviso === 'informativo'}
                      onChange={(e) =>
                        setConfigEdit({
                          ...configEdit,
                          modo_aviso: e.target.value as 'informativo' | 'sugestivo' | 'restritivo',
                        })
                      }
                      className="mt-1 w-4 h-4 text-green-600 focus:ring-2 focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Informativo</div>
                      <p className="text-sm text-gray-600">
                        Mostra status mas permite continuar mesmo se ocupado
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer">
                    <input
                      type="radio"
                      name="modo_aviso"
                      value="sugestivo"
                      checked={configEdit.modo_aviso === 'sugestivo'}
                      onChange={(e) =>
                        setConfigEdit({
                          ...configEdit,
                          modo_aviso: e.target.value as 'informativo' | 'sugestivo' | 'restritivo',
                        })
                      }
                      className="mt-1 w-4 h-4 text-green-600 focus:ring-2 focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        Sugestivo (Recomendado)
                      </div>
                      <p className="text-sm text-gray-600">
                        Mostra aviso e sugere outra data, mas permite continuar
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer">
                    <input
                      type="radio"
                      name="modo_aviso"
                      value="restritivo"
                      checked={configEdit.modo_aviso === 'restritivo'}
                      onChange={(e) =>
                        setConfigEdit({
                          ...configEdit,
                          modo_aviso: e.target.value as 'informativo' | 'sugestivo' | 'restritivo',
                        })
                      }
                      className="mt-1 w-4 h-4 text-green-600 focus:ring-2 focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Restritivo</div>
                      <p className="text-sm text-gray-600">
                        BLOQUEIA orçamento se data estiver ocupada
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <button
                onClick={handleSaveConfig}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <Save className="w-5 h-5" />
                Salvar Configurações
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Adicionar Período de Bloqueio */}
      {showAddPeriodoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Adicionar Período de Bloqueio</h3>
              <button
                onClick={() => setShowAddPeriodoModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddPeriodo();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
                <input
                  type="text"
                  value={novoPeriodo.motivo}
                  onChange={(e) => setNovoPeriodo({ ...novoPeriodo, motivo: e.target.value })}
                  placeholder="Ex: Férias, Recesso, Viagem"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Início *</label>
                  <input
                    type="date"
                    value={novoPeriodo.data_inicio}
                    onChange={(e) => setNovoPeriodo({ ...novoPeriodo, data_inicio: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Fim *</label>
                  <input
                    type="date"
                    value={novoPeriodo.data_fim}
                    onChange={(e) => setNovoPeriodo({ ...novoPeriodo, data_fim: e.target.value })}
                    min={novoPeriodo.data_inicio}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddPeriodoModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                  Adicionar Período
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDateModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <button
                onClick={() => {
                  setShowDateModal(false);
                  setSelectedDate(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {(() => {
                const eventosDia = getEventosPorData(selectedDate);
                const isBloqueada = datasBloqueadas.includes(selectedDate);
                const maxEventos = config?.eventos_max_por_dia || 1;

                return (
                  <>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Eventos: {eventosDia.length} / {maxEventos}
                        </p>
                        {isBloqueada && (
                          <p className="text-sm text-red-600 mt-1">Data bloqueada</p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setNovoEvento({ ...novoEvento, data_evento: selectedDate });
                          setShowDateModal(false);
                          setShowAddModal(true);
                        }}
                        disabled={isBloqueada}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar Evento
                      </button>
                    </div>

                    {eventosDia.length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900">Eventos do Dia</h4>
                        {eventosDia.map((evento) => (
                          <div
                            key={evento.id}
                            className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="font-medium text-gray-900">{evento.cliente_nome}</p>
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                                    evento.status
                                  )}`}
                                >
                                  {statusLabels[evento.status]}
                                </span>
                              </div>
                              {evento.tipo_evento && (
                                <p className="text-sm text-gray-600">Tipo: {evento.tipo_evento}</p>
                              )}
                              {evento.cidade && (
                                <p className="text-sm text-gray-600">Cidade: {evento.cidade}</p>
                              )}
                              {evento.observacoes && (
                                <p className="text-sm text-gray-500 mt-1">{evento.observacoes}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingEvento(evento);
                                  setShowDateModal(false);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteEvento(evento.id);
                                  if (getEventosPorData(selectedDate).length === 1) {
                                    setShowDateModal(false);
                                  }
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p>Nenhum evento nesta data</p>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-200">
                      {isBloqueada ? (
                        <button
                          onClick={async () => {
                            const result = await desbloquearData(userId, selectedDate);
                            if (result) {
                              await loadData();
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Desbloquear Data
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            const motivo = prompt('Motivo do bloqueio:', 'Pessoal');
                            if (motivo) {
                              const result = await bloquearData(userId, selectedDate, motivo, '');
                              if (result) {
                                await loadData();
                              }
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                          <AlertCircle className="w-5 h-5" />
                          Bloquear Data
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Novo Evento</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data *
                </label>
                <input
                  type="date"
                  value={novoEvento.data_evento}
                  onChange={(e) => setNovoEvento({ ...novoEvento, data_evento: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  value={novoEvento.cliente_nome}
                  onChange={(e) => setNovoEvento({ ...novoEvento, cliente_nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Digite o nome do cliente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Evento
                </label>
                <input
                  type="text"
                  value={novoEvento.tipo_evento}
                  onChange={(e) => setNovoEvento({ ...novoEvento, tipo_evento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Ex: Casamento, Ensaio, Corporativo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input
                  type="text"
                  value={novoEvento.cidade}
                  onChange={(e) => setNovoEvento({ ...novoEvento, cidade: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Digite a cidade"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={novoEvento.status}
                  onChange={(e) =>
                    setNovoEvento({
                      ...novoEvento,
                      status: e.target.value as 'confirmado' | 'pendente' | 'concluido' | 'cancelado',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="pendente">Pendente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={novoEvento.observacoes}
                  onChange={(e) => setNovoEvento({ ...novoEvento, observacoes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={3}
                  placeholder="Observações adicionais"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleAddEvento}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                Adicionar
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {editingEvento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Editar Evento</h3>
              <button
                onClick={() => setEditingEvento(null)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                <input
                  type="date"
                  value={editingEvento.data_evento}
                  onChange={(e) =>
                    setEditingEvento({ ...editingEvento, data_evento: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  value={editingEvento.cliente_nome}
                  onChange={(e) =>
                    setEditingEvento({ ...editingEvento, cliente_nome: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Evento
                </label>
                <input
                  type="text"
                  value={editingEvento.tipo_evento}
                  onChange={(e) =>
                    setEditingEvento({ ...editingEvento, tipo_evento: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input
                  type="text"
                  value={editingEvento.cidade}
                  onChange={(e) =>
                    setEditingEvento({ ...editingEvento, cidade: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editingEvento.status}
                  onChange={(e) =>
                    setEditingEvento({
                      ...editingEvento,
                      status: e.target.value as 'confirmado' | 'pendente' | 'concluido' | 'cancelado',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="pendente">Pendente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={editingEvento.observacoes}
                  onChange={(e) =>
                    setEditingEvento({ ...editingEvento, observacoes: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleUpdateEvento}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <Save className="w-5 h-5" />
                Salvar
              </button>
              <button
                onClick={() => setEditingEvento(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <CalendarImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleSmartImport}
        />
      )}

      {showUpgradeModal && (
        <CalendarUpgradeModal
          onClose={() => setShowUpgradeModal(false)}
          currentLimit={planLimits.eventsLimit as number}
          currentUsed={eventosAtivos}
        />
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Limpar Eventos</h3>
              </div>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600">
                Esta ação removerá eventos do seu calendário. Escolha o que deseja limpar:
              </p>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-green-300 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="clearType"
                    checked={!clearIncludeManual}
                    onChange={() => setClearIncludeManual(false)}
                    className="mt-1 w-4 h-4 text-green-600 focus:ring-2 focus:ring-green-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1">Apenas Eventos Importados</div>
                    <p className="text-sm text-gray-600">
                      Remove somente eventos que vieram de arquivos CSV/ICS. Eventos adicionados manualmente serão preservados.
                    </p>
                    <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                      Recomendado
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-red-300 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="clearType"
                    checked={clearIncludeManual}
                    onChange={() => setClearIncludeManual(true)}
                    className="mt-1 w-4 h-4 text-green-600 focus:ring-2 focus:ring-green-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1">Todos os Eventos</div>
                    <p className="text-sm text-gray-600">
                      Remove TODOS os eventos ativos (confirmados e pendentes), incluindo os adicionados manualmente.
                    </p>
                    <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                      Cuidado
                    </span>
                  </div>
                </label>
              </div>

              {clearIncludeManual && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium mb-1">Atenção: Ação Irreversível</p>
                    <p>
                      Esta opção removerá TODOS os eventos ativos do seu calendário, incluindo eventos manuais. Eventos concluídos e cancelados serão preservados.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleClearEvents}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <Trash className="w-5 h-5" />
                Confirmar Limpeza
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
