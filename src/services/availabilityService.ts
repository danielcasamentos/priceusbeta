import { supabase } from '../lib/supabase';
import { WorkflowStep } from '../types/workflow';

export interface SlotDisponibilidade {
  horario: string;
  disponivel: boolean;
  motivo: string | null;
}

export interface AvailabilityResult {
  disponivel: boolean;
  status: 'disponivel' | 'parcial' | 'ocupada' | 'bloqueada';
  eventos_atual: number;
  eventos_max: number;
  modo_aviso: 'informativo' | 'sugestivo' | 'restritivo';
  bloqueada: boolean;
  mensagem: string;
  cor_status: string;
  modo_agendamento?: 'dia' | 'hora';
  slots?: SlotDisponibilidade[];
}

export interface ConfiguracaoAgenda {
  id: string;
  user_id: string;
  eventos_max_por_dia: number;
  modo_aviso: 'informativo' | 'sugestivo' | 'restritivo';
  agenda_ativa: boolean;
  calendar_ics_url?: string;
  last_calendar_sync?: string | null;
  auto_sync_enabled?: boolean;
  // Campos de regras de bloqueio em massa
  dias_semana_bloqueados?: number[];
  regras_massa_ativas?: boolean;
  bloquear_feriados?: boolean;
  regra_par_impar?: 'nenhum' | 'pares' | 'impares';
  regra_semanal?: 'nenhum' | 'trabalha_pares' | 'trabalha_impares';
  regra_semanal_inicio?: string | null;
  modo_agendamento?: 'dia' | 'hora';
  politica_bloqueio?: 'dia_inteiro' | 'por_horario';
  config_horarios_trabalho?: Record<string, string[]> | null;
  bloquear_agenda_workflow?: boolean;
  permitir_conflito_interno?: boolean;
  bloquear_tarefas_internas?: boolean;
  bloquear_tarefas_externas?: boolean;
}

export interface EventoAgenda {
  id: string;
  user_id: string;
  data_evento: string;
  tipo_evento: string;
  cliente_nome: string;
  cidade: string;
  status: 'confirmado' | 'pendente' | 'concluido' | 'cancelado';
  origem: string;
  observacoes: string;
  importacao_id?: string | null;
  uid_externo?: string;
  horario_inicio?: string | null;
  duracao_minutos?: number | null;
  horario_fim?: string | null;
  last_synced_at?: string | null;
  updated_at?: string;
}

export interface HistoricoImportacao {
  id: string;
  user_id: string;
  nome_arquivo: string;
  estrategia_importacao: 'substituir_tudo' | 'adicionar_novos' | 'mesclar_atualizar';
  eventos_adicionados: number;
  eventos_atualizados: number;
  eventos_ignorados: number;
  eventos_removidos: number;
  created_at: string;
}

export interface ImportResult {
  success: boolean;
  historico_id?: string;
  eventos_adicionados: number;
  eventos_atualizados: number;
  eventos_ignorados: number;
  eventos_removidos: number;
  errors: string[];
}

/**
 * Verifica disponibilidade de uma data usando função RPC otimizada
 * com retry automático e cache
 */
export async function checkAvailability(
  userId: string,
  dataEvento: string,
  duracaoMinutos?: number,
  retryCount: number = 0
): Promise<AvailabilityResult> {
  const maxRetries = 2;

  try {
    const { data, error } = await supabase.rpc('check_date_availability', {
      p_user_id: userId,
      p_data_evento: dataEvento,
      p_duracao_minutos: duracaoMinutos || 60,
    });

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Resposta vazia do servidor');
    }

    const statusColorMap = {
      disponivel: 'green',
      parcial: 'yellow',
      ocupada: 'red',
      bloqueada: 'gray',
      inativa: 'gray',
    };

    return {
      disponivel: data.disponivel,
      status: data.status,
      eventos_atual: data.eventos_atual,
      eventos_max: data.eventos_max,
      modo_aviso: data.modo_aviso,
      bloqueada: data.bloqueada,
      mensagem: data.mensagem,
      cor_status: statusColorMap[data.status as keyof typeof statusColorMap] || 'gray',
      modo_agendamento: data.modo_agendamento,
      slots: data.slots,
    };
  } catch (error) {
    console.error('[AGENDA] Erro ao verificar disponibilidade:', error);

    if (retryCount < maxRetries) {
      const delay = 500 * (retryCount + 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      return checkAvailability(userId, dataEvento, duracaoMinutos, retryCount + 1);
    }

    return {
      disponivel: true,
      status: 'disponivel',
      eventos_atual: 0,
      eventos_max: 1,
      modo_aviso: 'informativo',
      bloqueada: false,
      mensagem: 'Sistema de verificação temporariamente indisponível',
      cor_status: 'green',
    };
  }
}

export async function getOrCreateAgendaConfig(userId: string): Promise<ConfiguracaoAgenda | null> {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('configuracao_agenda')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existing) {
      return existing;
    }

    const { data: newConfig, error: insertError } = await supabase
      .from('configuracao_agenda')
      .insert([
        {
          user_id: userId,
          eventos_max_por_dia: 1,
          modo_aviso: 'sugestivo',
          agenda_ativa: true,
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    return newConfig;
  } catch (error) {
    console.error('Erro ao obter/criar configuração da agenda:', error);
    return null;
  }
}

export async function getEventosByDate(userId: string, dataEvento: string): Promise<EventoAgenda[]> {
  try {
    const { data, error } = await supabase
      .from('eventos_agenda')
      .select('*')
      .eq('user_id', userId)
      .eq('data_evento', dataEvento)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    return [];
  }
}

export async function getEventosByMonth(userId: string, year: number, month: number): Promise<EventoAgenda[]> {
  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('eventos_agenda')
      .select('*')
      .eq('user_id', userId)
      .gte('data_evento', startDate)
      .lte('data_evento', endDate)
      .order('data_evento', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar eventos do mês:', error);
    return [];
  }
}

export async function triggerGoogleCalendarSync(
  _userId: string,
  action: 'insert' | 'update' | 'delete',
  event: any,
  eventId?: string
) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      console.warn('[GoogleSync] Sincronização abortada: sessão ausente ou token indisponível');
      return null;
    }

    const response = await fetch('https://vkwpcyahwzzeyesyytpa.supabase.co/functions/v1/google-calendar-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
      },
      body: JSON.stringify({
        action,
        event,
        eventId
      })
    });

    const responseText = await response.text();
    console.log('[GoogleSync] Resposta da Edge Function:', response.status, responseText);

    if (!response.ok) {
      console.warn(`[GoogleSync] Erro HTTP ${response.status} no invoke:`, responseText);
      return null;
    }

    try {
      return JSON.parse(responseText);
    } catch {
      return { success: true, message: responseText };
    }
  } catch (err) {
    console.error('[GoogleSync] Erro ao disparar sincronização:', err);
    return null;
  }
}

export async function addEvento(evento: Partial<EventoAgenda>): Promise<EventoAgenda | null> {
  try {
    const { data, error } = await supabase
      .from('eventos_agenda')
      .insert([evento])
      .select()
      .single();

    if (error) throw error;

    if (data && data.user_id && data.origem !== 'ics_sync') {
      triggerGoogleCalendarSync(data.user_id, 'insert', data).then(async (res) => {
        if (res?.success && res.googleEventId) {
          await supabase
            .from('eventos_agenda')
            .update({ 
              uid_externo: `gcal_${res.googleEventId}`,
              last_synced_at: new Date().toISOString()
            })
            .eq('id', data.id);
        }
      });
    }

    return data;
  } catch (error) {
    console.error('Erro ao adicionar evento:', error);
    return null;
  }
}

export async function updateEvento(
  id: string,
  updates: Partial<EventoAgenda>,
  bypassGoogleSync: boolean = false
): Promise<boolean> {
  try {
    const { data: existingEvent } = await supabase
      .from('eventos_agenda')
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('eventos_agenda')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    if (!bypassGoogleSync && existingEvent && existingEvent.user_id && existingEvent.origem !== 'ics_sync') {
      const gcalId = existingEvent.uid_externo?.startsWith('gcal_') 
        ? existingEvent.uid_externo.substring(5) 
        : undefined;

      triggerGoogleCalendarSync(
        existingEvent.user_id,
        'update',
        { ...existingEvent, ...updates },
        gcalId
      ).then(async (res) => {
        if (res?.success) {
          await supabase
            .from('eventos_agenda')
            .update({ 
              last_synced_at: new Date().toISOString()
            })
            .eq('id', id);
        }
      });
    }

    return true;
  } catch (error) {
    console.error('Erro ao atualizar evento:', error);
    return false;
  }
}

export async function deleteEvento(
  id: string,
  bypassGoogleSync: boolean = false
): Promise<boolean> {
  try {
    const { data: existingEvent } = await supabase
      .from('eventos_agenda')
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('eventos_agenda')
      .delete()
      .eq('id', id);

    if (error) throw error;

    if (!bypassGoogleSync && existingEvent && existingEvent.user_id && existingEvent.origem !== 'ics_sync') {
      const gcalId = existingEvent.uid_externo?.startsWith('gcal_') 
        ? existingEvent.uid_externo.substring(5) 
        : undefined;

      triggerGoogleCalendarSync(
        existingEvent.user_id,
        'delete',
        existingEvent,
        gcalId
      );
    }

    return true;
  } catch (error) {
    console.error('Erro ao deletar evento:', error);
    return false;
  }
}

export async function bloquearData(userId: string, data: string, motivo: string, descricao: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('datas_bloqueadas')
      .insert([
        {
          user_id: userId,
          data_bloqueada: data,
          motivo,
          descricao,
        },
      ]);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Erro ao bloquear data:', error);
    return false;
  }
}

export async function desbloquearData(userId: string, data: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('datas_bloqueadas')
      .delete()
      .eq('user_id', userId)
      .eq('data_bloqueada', data);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Erro ao desbloquear data:', error);
    return false;
  }
}

export async function getDatasBloqueadas(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('datas_bloqueadas')
      .select('data_bloqueada')
      .eq('user_id', userId);

    if (error) throw error;

    return data?.map((d) => d.data_bloqueada) || [];
  } catch (error) {
    console.error('Erro ao buscar datas bloqueadas:', error);
    return [];
  }
}

export async function limparTodosEventos(userId: string, incluirManuais: boolean = false): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('limpar_todos_eventos', {
      p_user_id: userId,
      p_incluir_manuais: incluirManuais
    });

    if (error) throw error;

    return data?.[0]?.eventos_deletados || 0;
  } catch (error) {
    console.error('Erro ao limpar eventos:', error);
    return 0;
  }
}

export async function getHistoricoImportacoes(userId: string): Promise<HistoricoImportacao[]> {
  try {
    const { data, error } = await supabase
      .from('historico_importacoes_calendario')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar histórico de importações:', error);
    return [];
  }
}

export async function rollbackImportacao(userId: string, importacaoId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('rollback_importacao', {
      p_importacao_id: importacaoId,
      p_user_id: userId
    });

    if (error) throw error;

    return data?.[0]?.eventos_deletados || 0;
  } catch (error) {
    console.error('Erro ao fazer rollback de importação:', error);
    return 0;
  }
}

export async function importarEventosInteligente(
  userId: string,
  nomeArquivo: string,
  eventos: Array<{ 
    data: string; 
    nome: string; 
    tipo?: string; 
    cidade?: string; 
    uid_externo?: string;
    horario_inicio?: string | null;
    duracao_minutos?: number | null;
  }>,
  estrategia: 'substituir_tudo' | 'adicionar_novos' | 'mesclar_atualizar'
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    eventos_adicionados: 0,
    eventos_atualizados: 0,
    eventos_ignorados: 0,
    eventos_removidos: 0,
    errors: []
  };

  try {
    let eventosRemovidos = 0;

    if (estrategia === 'substituir_tudo') {
      eventosRemovidos = await limparTodosEventos(userId, false);
      result.eventos_removidos = eventosRemovidos;
    }

    const { data: historico, error: historicoError } = await supabase
      .from('historico_importacoes_calendario')
      .insert([{
        user_id: userId,
        nome_arquivo: nomeArquivo,
        estrategia_importacao: estrategia,
        eventos_adicionados: 0,
        eventos_atualizados: 0,
        eventos_ignorados: 0,
        eventos_removidos: eventosRemovidos
      }])
      .select()
      .single();

    if (historicoError) throw historicoError;

    const historicoId = historico.id;

    // Busca todos os eventos locais do usuário uma única vez para evitar consultas N+1
    const { data: todosEventosLocais, error: fetchLocaisError } = await supabase
      .from('eventos_agenda')
      .select('*')
      .eq('user_id', userId);

    if (fetchLocaisError) throw fetchLocaisError;
    const eventosLocaisCache = todosEventosLocais || [];

    // Helper: normaliza UIDs do Google e Priceus para comparação
    const normalizeUid = (uid: string): string => {
      let clean = uid.trim().toLowerCase();
      if (clean.startsWith('gcal_')) {
        clean = clean.substring(5);
      }
      if (clean.endsWith('@google.com')) {
        clean = clean.substring(0, clean.length - 11);
      }
      return clean;
    };

    // Helper: busca evento existente em memória
    const findExistente = (evento: { data: string; nome: string; uid_externo?: string }): EventoAgenda | null => {
      const targetName = evento.nome.trim().toLowerCase();
      
      if (evento.uid_externo) {
        const targetUidNormalized = normalizeUid(evento.uid_externo);
        const found = eventosLocaisCache.find(e => {
          if (!e.uid_externo) return false;
          return normalizeUid(e.uid_externo) === targetUidNormalized;
        });
        if (found) {
          console.log(`[findExistente] Encontrado evento por UID externo (cache): ${evento.nome} (${evento.uid_externo})`);
          return found;
        }
      }

      // Limpeza de nome para fallback em eventos criados pelo Priceus
      let cleanImportedName = targetName;
      if (cleanImportedName.startsWith('[priceu$]')) {
        let parts = cleanImportedName.substring(9).trim(); // Remove '[priceu$]'
        const dashIdx = parts.indexOf(' - ');
        if (dashIdx !== -1) {
          parts = parts.substring(0, dashIdx).trim();
        }
        cleanImportedName = parts;
      }

      // Fallback por data e nome (comparando nomes limpos)
      const foundFallback = eventosLocaisCache.find(e => {
        const localName = e.cliente_nome.trim().toLowerCase();
        return e.data_evento === evento.data && localName === cleanImportedName;
      });

      if (foundFallback) {
        console.log(`[findExistente] Encontrado evento por data+nome (fallback cache): ${evento.nome} (${evento.data})`);
        return foundFallback;
      }
      return null;
    };

    // Helper: insere evento, com retry sem uid_externo caso a coluna não exista
    const addEventoComFallback = async (payload: Partial<EventoAgenda>): Promise<EventoAgenda | null> => {
      // Tenta inserir com uid_externo
      const { data, error } = await supabase
        .from('eventos_agenda')
        .insert([payload])
        .select()
        .single();
      if (!error) return data;

      // Se falhou e havia uid_externo, tenta sem ele (coluna pode não existir)
      if (payload.uid_externo) {
        console.warn('[addEventoComFallback] Falha com uid_externo, reintentando sem o campo.', error.message);
        const { uid_externo: _dropped, ...payloadSemUid } = payload as any;
        const { data: data2, error: error2 } = await supabase
          .from('eventos_agenda')
          .insert([payloadSemUid])
          .select()
          .single();
        if (!error2) return data2;
        console.error('[addEventoComFallback] Falha definitiva ao inserir evento:', error2);
        return null;
      }

      console.error('[addEventoComFallback] Falha ao inserir evento:', error);
      return null;
    };

    const chunkSize = 10;
    for (let i = 0; i < eventos.length; i += chunkSize) {
      const chunk = eventos.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (evento) => {
        try {
          const lowercaseName = (evento.nome || '').toLowerCase().trim();
          if (
            lowercaseName.startsWith('aniversário de') ||
            lowercaseName.startsWith('aniversário:') ||
            lowercaseName.includes('\'s birthday') ||
            lowercaseName.includes('s\' birthday') ||
            lowercaseName.startsWith('birthday:')
          ) {
            console.log(`[importarEventosInteligente] Ignorando aniversário de contato: ${evento.nome}`);
            result.eventos_ignorados++;
            return;
          }

          if (
            (evento.nome && evento.nome.startsWith('[PriceU$]')) ||
            (evento.uid_externo && (evento.uid_externo.includes('workflow_') || evento.uid_externo.includes('priceus')))
          ) {
            console.log(`[importarEventosInteligente] Ignorando evento de sincronismo reverso/workflow: ${evento.nome} (${evento.uid_externo})`);
            result.eventos_ignorados++;
            return;
          }

          if (estrategia === 'adicionar_novos') {
            const existente = findExistente(evento);
            if (existente) {
              result.eventos_ignorados++;
              return;
            }
          }

          if (estrategia === 'mesclar_atualizar') {
            const existente = findExistente(evento);
            if (existente) {
              const updatePayload: Partial<EventoAgenda> = {
                data_evento: evento.data,
                cliente_nome: evento.nome,
                tipo_evento: evento.tipo || existente.tipo_evento,
                cidade: evento.cidade || existente.cidade,
                observacoes: `Atualizado de ${nomeArquivo}`,
                importacao_id: historicoId,
              };
              // Só inclui uid_externo na atualização se já existe no registro ou no evento importado
              if (evento.uid_externo || (existente as any).uid_externo) {
                (updatePayload as any).uid_externo = evento.uid_externo || (existente as any).uid_externo;
              }
              await updateEvento(existente.id, updatePayload, true);
              // Atualiza o cache local
              const cacheIdx = eventosLocaisCache.findIndex(e => e.id === existente.id);
              if (cacheIdx !== -1) {
                eventosLocaisCache[cacheIdx] = {
                  ...eventosLocaisCache[cacheIdx],
                  ...updatePayload
                };
              }
              result.eventos_atualizados++;
              return;
            }
          }

          const novoPayload: Partial<EventoAgenda> = {
            user_id: userId,
            data_evento: evento.data,
            cliente_nome: evento.nome,
            tipo_evento: evento.tipo || 'evento',
            cidade: evento.cidade || '',
            status: 'confirmado',
            // 'google-calendar-sync' viola o CHECK constraint (só aceita valores fixos).
            // Usar 'ics_sync' que já é válido e identifica sincronização por link iCalendar.
            origem: nomeArquivo === 'google-calendar-sync' ? 'ics_sync' : 'csv_import',
            observacoes: `Importado de ${nomeArquivo}`,
            importacao_id: historicoId,
            horario_inicio: evento.horario_inicio || null,
            duracao_minutos: evento.duracao_minutos || null,
          };
          if (evento.uid_externo) {
            (novoPayload as any).uid_externo = evento.uid_externo;
          }

          const novoEvento = await addEventoComFallback(novoPayload);

          if (novoEvento) {
            eventosLocaisCache.push(novoEvento);
            result.eventos_adicionados++;
          } else {
            result.errors.push(`${evento.nome} (${evento.data})`);
          }
        } catch (error) {
          result.errors.push(`${evento.nome} (${evento.data}): ${error}`);
        }
      }));
    }

    // Lógica para apagar eventos deletados no Google Calendar
    if (estrategia === 'mesclar_atualizar' && nomeArquivo === 'google-calendar-sync') {
      try {
        console.log(`[Sync] Iniciando detecção de eventos órfãos. Recebidos do ICS: ${eventos.length}`);
        
        // Trava de segurança: se a lista recebida for vazia, não removemos nada do banco
        if (eventos.length === 0) {
          console.warn('[Sync] Nenhum evento recebido no feed ICS. Cancelando remoção de órfãos por segurança.');
          return result;
        }
        
        // Tenta selecionar com uid_externo; se a coluna não existir, usa apenas id/data/nome
        // Busca por origem 'ics_sync' (valor atual) OU observacoes contendo 'google-calendar-sync' (compat. legado)
        let eventosSincronizados: any[] | null = null;
        const { data: comUid, error: errUid } = await supabase
          .from('eventos_agenda')
          .select('id, data_evento, cliente_nome, uid_externo')
          .eq('user_id', userId)
          .or('origem.eq.ics_sync,observacoes.ilike.%google-calendar-sync%');

        if (!errUid) {
          eventosSincronizados = comUid;
        } else {
          // Fallback: seleciona sem uid_externo
          console.warn('[sync] uid_externo indisponível na detecção de órfãos, usando fallback.', errUid.message);
          const { data: semUid } = await supabase
            .from('eventos_agenda')
            .select('id, data_evento, cliente_nome')
            .eq('user_id', userId)
            .or('origem.eq.ics_sync,observacoes.ilike.%google-calendar-sync%');
          eventosSincronizados = semUid;
        }

        console.log(`[Sync] Eventos sincronizados encontrados no banco de dados: ${eventosSincronizados?.length || 0}`);

        if (eventosSincronizados && eventosSincronizados.length > 0) {
          // Criamos dois conjuntos para comparação resiliente:
          // 1. Pelos UIDs únicos fornecidos pelo iCalendar (com trim)
          const setUidsICS = new Set(eventos.map(e => e.uid_externo?.trim()).filter(Boolean));
          // 2. Por data e nome como fallback (normalizado e case-insensitive)
          const setDataNomeICS = new Set(eventos.map(e => `${e.data.trim()}-${e.nome.trim().toLowerCase()}`));

          const idsParaDeletar = eventosSincronizados
            .filter(e => {
              if (e.uid_externo) {
                const hasUid = setUidsICS.has(e.uid_externo.trim());
                if (!hasUid) {
                  console.log(`[Sync] Evento marcado para exclusão (UID não encontrado no ICS): ${e.cliente_nome} (${e.data_evento}), UID: ${e.uid_externo}`);
                }
                return !hasUid;
              }
              const chFallback = `${e.data_evento.trim()}-${e.cliente_nome.trim().toLowerCase()}`;
              const hasFallback = setDataNomeICS.has(chFallback);
              if (!hasFallback) {
                console.log(`[Sync] Evento marcado para exclusão (Chave fallback '${chFallback}' não encontrada no ICS): ${e.cliente_nome} (${e.data_evento})`);
              }
              return !hasFallback;
            })
            .map(e => e.id);

          console.log(`[Sync] Total de eventos órfãos a deletar: ${idsParaDeletar.length}`);

          if (idsParaDeletar.length > 0) {
            // Deleta em chunks de 50
            for (let i = 0; i < idsParaDeletar.length; i += 50) {
              const chunkIds = idsParaDeletar.slice(i, i + 50);
              await supabase.from('eventos_agenda').delete().in('id', chunkIds);
            }
            result.eventos_removidos += idsParaDeletar.length;
          }
        }
      } catch (err) {
        console.warn('Erro ao tentar deletar eventos órfãos do calendário', err);
      }
    }

    await supabase
      .from('historico_importacoes_calendario')
      .update({
        eventos_adicionados: result.eventos_adicionados,
        eventos_atualizados: result.eventos_atualizados,
        eventos_ignorados: result.eventos_ignorados
      })
      .eq('id', historicoId);

    result.success = true;
    result.historico_id = historicoId;

    return result;
  } catch (error) {
    console.error('Erro ao importar eventos:', error);
    result.errors.push(`Erro geral: ${error}`);
    return result;
  }
}

export async function contarEventosAtivos(userId: string): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { count, error } = await supabase
      .from('eventos_agenda')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['confirmado', 'pendente'])
      .gte('data_evento', today);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Erro ao contar eventos ativos:', error);
    return 0;
  }
}
// Adicione esta função ao seu arquivo /src/services/availabilityService.ts

export async function getPeriodosBloqueados(userId: string) {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('periodos_bloqueados')
      .select('*')
      .eq('user_id', userId)
      .order('data_inicio', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar períodos bloqueados:', error);
    return [];
  }
}

interface ParsedDateTime {
  date: string;
  time: string | null;
  rawDate: Date | null;
}

const parseICalDateTime = (dateStr: string): ParsedDateTime | null => {
  if (!dateStr || dateStr.length < 8) return null;
  const isDateTime = dateStr.includes('T');
  try {
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1;
    const day = parseInt(dateStr.substring(6, 8), 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    if (isDateTime) {
      const tIndex = dateStr.indexOf('T');
      const timePart = dateStr.substring(tIndex + 1);
      const hour = parseInt(timePart.substring(0, 2), 10);
      const minute = parseInt(timePart.substring(2, 4), 10);
      const second = parseInt(timePart.substring(4, 6), 10) || 0;

      if (!isNaN(hour) && !isNaN(minute)) {
        let dateObj: Date;
        if (dateStr.endsWith('Z')) {
          dateObj = new Date(Date.UTC(year, month, day, hour, minute, second));
        } else {
          dateObj = new Date(year, month, day, hour, minute, second);
        }

        try {
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          });

          const parts = formatter.formatToParts(dateObj);
          const y = parts.find(p => p.type === 'year')?.value;
          const m = parts.find(p => p.type === 'month')?.value;
          const d = parts.find(p => p.type === 'day')?.value;
          const hr = parts.find(p => p.type === 'hour')?.value;
          const min = parts.find(p => p.type === 'minute')?.value;
          const sec = parts.find(p => p.type === 'second')?.value;

          if (y && m && d && hr && min) {
            const normalizedHour = hr === '24' ? '00' : hr;
            return {
              date: `${y}-${m}-${d}`,
              time: `${normalizedHour}:${min}:${sec || '00'}`,
              rawDate: dateObj,
            };
          }
        } catch (_) {
          const utcMs = Date.UTC(year, month, day, hour, minute, second);
          const localMs = utcMs - 3 * 60 * 60 * 1000;
          const localDate = new Date(localMs);
          const y = localDate.getUTCFullYear();
          const m = String(localDate.getUTCMonth() + 1).padStart(2, '0');
          const d = String(localDate.getUTCDate()).padStart(2, '0');
          const hr = String(localDate.getUTCHours()).padStart(2, '0');
          const min = String(localDate.getUTCMinutes()).padStart(2, '0');
          const sec = String(localDate.getUTCSeconds()).padStart(2, '0');
          return {
            date: `${y}-${m}-${d}`,
            time: `${hr}:${min}:${sec}`,
            rawDate: new Date(localMs),
          };
        }
      }
    }

    const rawDate = new Date(year, month, day);
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return {
      date: `${year}-${mStr}-${dStr}`,
      time: null,
      rawDate,
    };
  } catch (_) {
    const dateMatch = dateStr.match(/^(\d{4})(\d{2})(\d{2})/);
    if (dateMatch) {
      return {
        date: `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`,
        time: null,
        rawDate: null,
      };
    }
  }
  return null;
};

const parseICalDuration = (durationStr: string): number | null => {
  try {
    const regex = /PT?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const match = durationStr.match(regex);
    if (match) {
      const hours = parseInt(match[1] || '0', 10);
      const minutes = parseInt(match[2] || '0', 10);
      const seconds = parseInt(match[3] || '0', 10);
      return hours * 60 + minutes + Math.round(seconds / 60);
    }
  } catch (_) {}
  return null;
};

export interface EventoImportado {
  data_evento: string;
  cliente_nome: string;
  tipo_evento?: string;
  uid_externo?: string;
  horario_inicio?: string | null;
  duracao_minutos?: number | null;
  horario_fim?: string | null;
}

const parseICS = (text: string): Array<EventoImportado> => {
  const eventos: Array<EventoImportado> = [];
  const unfoldedText = text.replace(/\r?\n[ \t]/g, '');
  const lines = unfoldedText.split(/\r?\n/);

  let currentEvent: EventoImportado = { data_evento: '', cliente_nome: '' };
  let inEvent = false;
  let dtstartVal = '';
  let dtendVal = '';
  let durationVal = '';

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex === -1) continue;

    const keyWithParams = trimmedLine.substring(0, colonIndex);
    const value = trimmedLine.substring(colonIndex + 1).trim();
    const key = keyWithParams.split(';')[0].trim().toUpperCase();

    if (key === 'BEGIN' && value === 'VEVENT') {
      inEvent = true;
      currentEvent = { data_evento: '', cliente_nome: '', tipo_evento: 'evento' };
      dtstartVal = '';
      dtendVal = '';
      durationVal = '';
    } else if (key === 'END' && value === 'VEVENT') {
      if (dtstartVal) {
        const startParsed = parseICalDateTime(dtstartVal);
        if (startParsed) {
          currentEvent.data_evento = startParsed.date;
          currentEvent.horario_inicio = startParsed.time;

          let calculatedDuration: number | null = null;
          if (dtendVal) {
            const endParsed = parseICalDateTime(dtendVal);
            if (endParsed && startParsed.rawDate && endParsed.rawDate && startParsed.time && endParsed.time) {
              const diffMs = endParsed.rawDate.getTime() - startParsed.rawDate.getTime();
              const diffMin = Math.round(diffMs / (1000 * 60));
              if (diffMin > 0) {
                calculatedDuration = diffMin;
              }
            }
          } else if (durationVal) {
            calculatedDuration = parseICalDuration(durationVal);
          }

          if (calculatedDuration !== null) {
            currentEvent.duracao_minutos = calculatedDuration;
          }
        }
      }

      if (currentEvent.data_evento && currentEvent.cliente_nome) {
        eventos.push(currentEvent);
      }
      inEvent = false;
      currentEvent = { data_evento: '', cliente_nome: '' };
    } else if (inEvent) {
      if (key === 'DTSTART') {
        dtstartVal = value;
      } else if (key === 'DTEND') {
        dtendVal = value;
      } else if (key === 'DURATION') {
        durationVal = value;
      } else if (key === 'SUMMARY') {
        currentEvent.cliente_nome = value || 'Evento de Calendário';
      } else if (key === 'UID') {
        currentEvent.uid_externo = value;
      } else if (key === 'DESCRIPTION') {
        currentEvent.tipo_evento = value || 'evento';
      } else if (key === 'LOCATION') {
        if (!currentEvent.tipo_evento || currentEvent.tipo_evento === 'evento') {
          currentEvent.tipo_evento = value || 'evento';
        }
      }
    }
  }

  return eventos;
};

export async function uploadICSFile(icsText: string, userId: string): Promise<{success: boolean, message: string}> {
  try {
    const parsedEventos = parseICS(icsText);
    let adicionados = 0;
    
    if (parsedEventos.length === 0) {
       return { success: false, message: 'Nenhum evento encontrado no arquivo.' };
    }

    const { data: existentes, error: queryError } = await supabase
       .from('eventos_agenda')
       .select('cliente_nome, data_evento')
       .eq('user_id', userId);

    if (queryError) throw queryError;
    
    const setExistentes = new Set(existentes?.map(e => `${e.cliente_nome}-${e.data_evento}`));
    const novosEventos: any[] = [];
    const dataHoraAtual = new Date().toISOString();
    
    for (const evento of parsedEventos) {
       const chave = `${evento.cliente_nome}-${evento.data_evento}`;
       if (!setExistentes.has(chave)) {
          const novoEventoPayload: any = {
             user_id: userId,
             data_evento: evento.data_evento,
             cliente_nome: evento.cliente_nome,
             tipo_evento: evento.tipo_evento || 'evento',
             cidade: '', // required field
             status: 'confirmado',
             origem: 'ics_sync',
             observacoes: 'Importado manualmente do calendário externo',
             created_at: dataHoraAtual,
             horario_inicio: (evento as any).horario_inicio || null,
             duracao_minutos: (evento as any).duracao_minutos || null,
          };
          if (evento.uid_externo) {
             novoEventoPayload.uid_externo = evento.uid_externo;
          }
          novosEventos.push(novoEventoPayload);
          adicionados++;
       }
    }
    
    if (novosEventos.length > 0) {
       const { error: insertError } = await supabase
          .from('eventos_agenda')
          .insert(novosEventos);
          
       if (insertError) {
          console.warn('[uploadICSFile] Falha ao inserir em lote com uid_externo, reintentando sem o campo.', insertError.message);
          const novosSemUid = novosEventos.map(({ uid_externo, ...resto }) => resto);
          const { error: insertError2 } = await supabase
             .from('eventos_agenda')
             .insert(novosSemUid);
          if (insertError2) throw insertError2;
       }
    }
    
    await supabase
       .from('configuracao_agenda')
       .update({ last_calendar_sync: new Date().toISOString() })
       .eq('user_id', userId);

    return { success: true, message: `Calendário importado. ${adicionados} novos eventos adicionados de ${parsedEventos.length} lidos.`};
  } catch (error: any) {
    console.error('Erro na sincronização importada:', error);
    return { success: false, message: error.message || 'Erro desconhecido ao importar arquivo ICS.' };
  }
}

/**
 * Sincroniza tarefas de workflow de um lead específico com a tabela eventos_agenda.
 */
export async function syncWorkflowToCalendar(
  userId: string,
  leadId: string,
  leadName: string,
  workflow: WorkflowStep[]
): Promise<void> {
  try {
    // 1. Obter configuração da agenda do profissional
    const config = await getOrCreateAgendaConfig(userId);
    const active = config?.bloquear_agenda_workflow ?? false;

    // 2. Buscar eventos sincronizados desse workflow do banco
    const { data: existingEvents } = await supabase
      .from('eventos_agenda')
      .select('id, uid_externo')
      .eq('lead_id', leadId)
      .eq('origem', 'workflow');

    const existingEventsMap = new Map(
      (existingEvents || []).map((e: any) => [e.uid_externo, e.id])
    );

    // 3. Processar cada etapa do workflow
    for (const step of workflow) {
      const uid = `workflow_${step.id}`;
      const hasDateTime = step.deadline && step.horario_inicio && step.duracao_minutos;
      const shouldSync = active && hasDateTime && step.status !== 'concluido';

      if (shouldSync) {
        const eventPayload = {
          user_id: userId,
          lead_id: leadId,
          data_evento: step.deadline,
          tipo_evento: step.label,
          cliente_nome: leadName,
          observacoes: step.description || 'Tarefa de Workflow',
          horario_inicio: step.horario_inicio,
          duracao_minutos: step.duracao_minutos,
          ambiente: step.ambiente || 'externo',
          origem: 'workflow',
          status: 'confirmado',
          uid_externo: uid
        };

        if (existingEventsMap.has(uid)) {
          const eventId = existingEventsMap.get(uid);
          await supabase
            .from('eventos_agenda')
            .update(eventPayload)
            .eq('id', eventId);
          existingEventsMap.delete(uid);

          triggerGoogleCalendarSync(userId, 'update', eventPayload);
        } else {
          await supabase
            .from('eventos_agenda')
            .insert([eventPayload]);

          triggerGoogleCalendarSync(userId, 'insert', eventPayload);
        }
      } else {
        if (existingEventsMap.has(uid)) {
          const eventId = existingEventsMap.get(uid);
          await supabase
            .from('eventos_agenda')
            .delete()
            .eq('id', eventId);
          existingEventsMap.delete(uid);

          triggerGoogleCalendarSync(userId, 'delete', { uid_externo: uid });
        }
      }
    }

    // 4. Limpar eventos órfãos de etapas deletadas
    for (const [uid, eventId] of existingEventsMap.entries()) {
      await supabase
        .from('eventos_agenda')
        .delete()
        .eq('id', eventId);

      triggerGoogleCalendarSync(userId, 'delete', { uid_externo: uid });
    }
  } catch (err) {
    console.error('Erro ao sincronizar workflow com calendário:', err);
  }
}

export async function syncLocalEventsToGoogle(userId: string): Promise<{ success: boolean; syncedCount: number; message: string }> {
  try {
    const { data: eventos, error } = await supabase
      .from('eventos_agenda')
      .select('*')
      .eq('user_id', userId)
      .neq('origem', 'ics_sync')
      .not('status', 'eq', 'cancelado');

    if (error) throw error;

    if (!eventos || eventos.length === 0) {
      return { success: true, syncedCount: 0, message: 'Nenhum evento local encontrado para sincronizar.' };
    }

    let syncedCount = 0;
    for (const evt of eventos) {
      if (evt.uid_externo && evt.uid_externo.startsWith('gcal_')) {
        continue;
      }

      const payload = {
        id: evt.id,
        user_id: evt.user_id,
        data_evento: evt.data_evento,
        tipo_evento: evt.tipo_evento,
        cliente_nome: evt.cliente_nome,
        cidade: evt.cidade,
        status: evt.status,
        origem: evt.origem,
        observacoes: evt.observacoes
      };

      const res = await triggerGoogleCalendarSync(userId, 'insert', payload);
      if (res?.success && res.googleEventId) {
        await supabase
          .from('eventos_agenda')
          .update({ uid_externo: `gcal_${res.googleEventId}` })
          .eq('id', evt.id);
        syncedCount++;
      }
    }

    return {
      success: true,
      syncedCount,
      message: `${syncedCount} evento(s) local(is) sincronizado(s) com o Google Calendar.`
    };
  } catch (err: any) {
    console.error('Erro na sincronização manual reversa:', err);
    return {
      success: false,
      syncedCount: 0,
      message: err.message || 'Erro ao sincronizar eventos locais.'
    };
  }
}
