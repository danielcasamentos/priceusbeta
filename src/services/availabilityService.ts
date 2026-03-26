import { supabase } from '../lib/supabase';

export interface AvailabilityResult {
  disponivel: boolean;
  status: 'disponivel' | 'parcial' | 'ocupada' | 'bloqueada';
  eventos_atual: number;
  eventos_max: number;
  modo_aviso: 'informativo' | 'sugestivo' | 'restritivo';
  bloqueada: boolean;
  mensagem: string;
  cor_status: string;
}

export interface ConfiguracaoAgenda {
  id: string;
  user_id: string;
  eventos_max_por_dia: number;
  modo_aviso: 'informativo' | 'sugestivo' | 'restritivo';
  agenda_ativa: boolean;
  calendar_ics_url?: string;
  last_calendar_sync?: string;
  auto_sync_enabled?: boolean;
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
  retryCount: number = 0
): Promise<AvailabilityResult> {
  const maxRetries = 2;

  try {
    const { data, error } = await supabase.rpc('check_date_availability', {
      p_user_id: userId,
      p_data_evento: dataEvento,
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
    };
  } catch (error) {
    console.error('[AGENDA] Erro ao verificar disponibilidade:', error);

    if (retryCount < maxRetries) {
      const delay = 500 * (retryCount + 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      return checkAvailability(userId, dataEvento, retryCount + 1);
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

export async function addEvento(evento: Partial<EventoAgenda>): Promise<EventoAgenda | null> {
  try {
    const { data, error } = await supabase
      .from('eventos_agenda')
      .insert([evento])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Erro ao adicionar evento:', error);
    return null;
  }
}

export async function updateEvento(id: string, updates: Partial<EventoAgenda>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('eventos_agenda')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Erro ao atualizar evento:', error);
    return false;
  }
}

export async function deleteEvento(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('eventos_agenda')
      .delete()
      .eq('id', id);

    if (error) throw error;

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
  eventos: Array<{ data: string; nome: string; tipo?: string; cidade?: string }>,
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

    for (const evento of eventos) {
      try {
        if (estrategia === 'adicionar_novos') {
          const { data: existente } = await supabase
            .from('eventos_agenda')
            .select('id')
            .eq('user_id', userId)
            .eq('data_evento', evento.data)
            .eq('cliente_nome', evento.nome)
            .maybeSingle();

          if (existente) {
            result.eventos_ignorados++;
            continue;
          }
        }

        if (estrategia === 'mesclar_atualizar') {
          const { data: existente } = await supabase
            .from('eventos_agenda')
            .select('*')
            .eq('user_id', userId)
            .eq('data_evento', evento.data)
            .eq('cliente_nome', evento.nome)
            .maybeSingle();

          if (existente) {
            await updateEvento(existente.id, {
              tipo_evento: evento.tipo || existente.tipo_evento,
              cidade: evento.cidade || existente.cidade,
              observacoes: `Atualizado de ${nomeArquivo}`,
              importacao_id: historicoId
            });
            result.eventos_atualizados++;
            continue;
          }
        }

        const novoEvento = await addEvento({
          user_id: userId,
          data_evento: evento.data,
          cliente_nome: evento.nome,
          tipo_evento: evento.tipo || 'evento',
          cidade: evento.cidade || '',
          status: 'confirmado',
          origem: 'csv_import',
          observacoes: `Importado de ${nomeArquivo}`,
          importacao_id: historicoId
        });

        if (novoEvento) {
          result.eventos_adicionados++;
        } else {
          result.errors.push(`${evento.nome} (${evento.data})`);
        }
      } catch (error) {
        result.errors.push(`${evento.nome} (${evento.data}): ${error}`);
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

const parseICS = (text: string): Array<{ data_evento: string; cliente_nome: string; tipo_evento?: string }> => {
  const eventos: Array<{ data_evento: string; cliente_nome: string; tipo_evento?: string }> = [];
  const lines = text.split('\n');

  let currentEvent: { data_evento?: string; cliente_nome?: string; tipo_evento?: string } = {};
  let inEvent = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = { tipo_evento: 'evento' };
    } else if (trimmedLine === 'END:VEVENT') {
      if (currentEvent.data_evento && currentEvent.cliente_nome) {
        eventos.push(currentEvent as { data_evento: string; cliente_nome: string; tipo_evento?: string });
      }
      inEvent = false;
      currentEvent = {};
    } else if (inEvent) {
      if (trimmedLine.startsWith('DTSTART')) {
        const dateMatch = trimmedLine.match(/(\d{4})(\d{2})(\d{2})/);
        if (dateMatch) {
          currentEvent.data_evento = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
        }
      } else if (trimmedLine.startsWith('SUMMARY:')) {
        currentEvent.cliente_nome = trimmedLine.substring(8).trim() || 'Evento de Calendário';
      } else if (trimmedLine.startsWith('DESCRIPTION:')) {
        currentEvent.tipo_evento = trimmedLine.substring(12).trim() || 'evento';
      } else if (trimmedLine.startsWith('LOCATION:')) {
        if (!currentEvent.tipo_evento || currentEvent.tipo_evento === 'evento') {
          currentEvent.tipo_evento = trimmedLine.substring(9).trim() || 'evento';
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
    const novosEventos = [];
    const dataHoraAtual = new Date().toISOString();
    
    for (const evento of parsedEventos) {
       const chave = `${evento.cliente_nome}-${evento.data_evento}`;
       if (!setExistentes.has(chave)) {
          novosEventos.push({
             user_id: userId,
             data_evento: evento.data_evento,
             cliente_nome: evento.cliente_nome,
             tipo_evento: evento.tipo_evento || 'evento',
             cidade: '', // required field
             status: 'confirmado',
             origem: 'ics_sync',
             observacoes: 'Importado manualmente do calendário externo',
             created_at: dataHoraAtual
          });
          adicionados++;
       }
    }
    
    if (novosEventos.length > 0) {
       const { error: insertError } = await supabase
          .from('eventos_agenda')
          .insert(novosEventos);
          
       if (insertError) throw insertError;
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
