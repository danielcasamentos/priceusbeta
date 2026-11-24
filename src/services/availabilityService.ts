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
  retryCount: number = 0,
  forceHourlySlots: boolean = false
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

    let finalModo = data.modo_agendamento;
    let finalSlots: SlotDisponibilidade[] | undefined = data.slots;

    // Se o template exige escolha de horário (forceHourlySlots) mas a agenda global retornou sem slots (modo 'dia'),
    // geramos os horários consultando os compromissos reais da agenda na data escolhida.
    if (
      forceHourlySlots &&
      !data.bloqueada &&
      (!Array.isArray(finalSlots) || finalSlots.length === 0)
    ) {
      finalModo = 'hora';
      const defaultHours = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
      let candidateHours = defaultHours;

      try {
        const { data: cfg } = await supabase
          .from('configuracao_agenda')
          .select('config_horarios_trabalho')
          .eq('user_id', userId)
          .maybeSingle();

        const dow = new Date(`${dataEvento}T12:00:00`).getDay();
        const customForDay = cfg?.config_horarios_trabalho?.[String(dow)];
        if (Array.isArray(customForDay) && customForDay.length > 0) {
          candidateHours = customForDay;
        }
      } catch {
        // usa defaultHours
      }

      const { data: evts } = await supabase
        .from('eventos_agenda')
        .select('horario_inicio, duracao_minutos, status')
        .eq('user_id', userId)
        .eq('data_evento', dataEvento)
        .in('status', ['confirmado', 'pendente']);

      const durationReq = duracaoMinutos || 60;
      const toMinutes = (hhmm: string) => {
        const [h, m] = hhmm.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
      };

      finalSlots = candidateHours.map((slotStr) => {
        const slotStart = toMinutes(slotStr);
        const slotEnd = slotStart + durationReq;
        let conflict = false;

        for (const ev of evts || []) {
          if (!ev.horario_inicio) continue;
          const evStart = toMinutes(String(ev.horario_inicio).slice(0, 5));
          const evEnd = evStart + (ev.duracao_minutos || 60);
          if (slotStart < evEnd && slotEnd > evStart) {
            conflict = true;
            break;
          }
        }

        return {
          horario: slotStr,
          disponivel: !conflict,
          motivo: conflict ? 'Horário ocupado na agenda' : null,
        };
      });
    }

    return {
      disponivel: data.disponivel,
      status: data.status,
      eventos_atual: data.eventos_atual,
      eventos_max: data.eventos_max,
      modo_aviso: data.modo_aviso,
      bloqueada: data.bloqueada,
      mensagem: data.mensagem,
      cor_status: statusColorMap[data.status as keyof typeof statusColorMap] || 'gray',
      modo_agendamento: finalModo,
      slots: finalSlots,
    };
  } catch (error) {
    console.error('[AGENDA] Erro ao verificar disponibilidade:', error);

    if (retryCount < maxRetries) {
      const delay = 500 * (retryCount + 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      return checkAvailability(userId, dataEvento, duracaoMinutos, retryCount + 1, forceHourlySlots);
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
  action: 'insert' | 'update' | 'delete' | 'list',
  event?: any,
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
    const incomingId = extractCanonicalEventIdentity(
      evento.cliente_nome,
      evento.tipo_evento,
      evento.uid_externo,
      evento.origem
    );

    const normalizedEvento: Partial<EventoAgenda> = {
      ...evento,
      cliente_nome: incomingId.baseName || evento.cliente_nome,
      tipo_evento: incomingId.extractedTag || evento.tipo_evento || 'Evento',
    };

    // Verifica se já existe um evento ativo na mesma data com o mesmo nome canônico (mesma tag ou tag diferente)
    if (normalizedEvento.user_id && normalizedEvento.data_evento && normalizedEvento.cliente_nome) {
      const { data: sameDayEvents } = await supabase
        .from('eventos_agenda')
        .select('*')
        .eq('user_id', normalizedEvento.user_id)
        .eq('data_evento', normalizedEvento.data_evento)
        .neq('status', 'cancelado');

      if (sameDayEvents && sameDayEvents.length > 0) {
        const match = sameDayEvents.find((existing) => {
          const existingId = extractCanonicalEventIdentity(
            existing.cliente_nome,
            existing.tipo_evento,
            existing.uid_externo,
            existing.origem
          );
          return existingId.canonicalKey === incomingId.canonicalKey;
        });

        if (match) {
          const existingId = extractCanonicalEventIdentity(
            match.cliente_nome,
            match.tipo_evento,
            match.uid_externo,
            match.origem
          );
          const mergedUpdates: Partial<EventoAgenda> = {
            cliente_nome: incomingId.baseName || existingId.baseName,
            tipo_evento: chooseBetterEventTag(existingId.extractedTag, incomingId.extractedTag),
            cidade: normalizedEvento.cidade || match.cidade || '',
            status: (normalizedEvento.status as any) || match.status || 'confirmado',
            origem: match.origem === 'ics_sync' && normalizedEvento.origem ? normalizedEvento.origem : match.origem,
            observacoes: normalizedEvento.observacoes || match.observacoes || '',
            horario_inicio: normalizedEvento.horario_inicio || match.horario_inicio || null,
            horario_fim: normalizedEvento.horario_fim || match.horario_fim || null,
            duracao_minutos: normalizedEvento.duracao_minutos || match.duracao_minutos || null,
          };
          if ((normalizedEvento as any).lead_id || (match as any).lead_id) {
            (mergedUpdates as any).lead_id = (normalizedEvento as any).lead_id || (match as any).lead_id;
          }

          await updateEvento(match.id, mergedUpdates, normalizedEvento.origem === 'ics_sync');
          return { ...match, ...mergedUpdates };
        }
      }
    }

    const { data, error } = await supabase
      .from('eventos_agenda')
      .insert([normalizedEvento])
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
          const syncUpdate: Record<string, any> = {
            last_synced_at: new Date().toISOString()
          };
          if (res.googleEventId && (!existingEvent.uid_externo || !existingEvent.uid_externo.startsWith('gcal_'))) {
            syncUpdate.uid_externo = `gcal_${res.googleEventId}`;
          }
          await supabase
            .from('eventos_agenda')
            .update(syncUpdate)
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

export interface CanonicalEventIdentity {
  baseName: string;
  extractedTag: string;
  canonicalName: string;
  canonicalTag: string;
  canonicalKey: string;
  isWorkflow: boolean;
}

const GENERIC_EVENT_TAGS = new Set([
  '',
  'evento',
  'compromisso',
  'agendamento',
  'outro',
  'outros',
  'geral',
]);

export function normalizeTextForMatch(str?: string | null): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function isSpecificEventTag(tag?: string | null): boolean {
  if (!tag) return false;
  const clean = normalizeTextForMatch(tag);
  if (!clean || GENERIC_EVENT_TAGS.has(clean)) return false;
  if (clean.length > 55 || clean.includes('http://') || clean.includes('https://') || clean.includes('id do evento')) {
    return false;
  }
  return true;
}

export function chooseBetterEventTag(tagA?: string | null, tagB?: string | null): string {
  const cleanTag = (t?: string | null) => {
    if (!t) return '';
    let s = t.trim();
    s = s.replace(/^(\[priceu\$\]\s*)+/i, '').trim();
    s = s.replace(/\s*-\s*\d{2}\/\d{2}\/\d{4}\s*$/, '').trim();
    if (/^evento\s+de\s+/i.test(s)) {
      const parts = s.split(' - ').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        s = parts[parts.length - 1];
      }
    }
    return s;
  };

  const a = cleanTag(tagA);
  const b = cleanTag(tagB);
  const aSpec = isSpecificEventTag(a);
  const bSpec = isSpecificEventTag(b);

  if (aSpec && !bSpec) return a;
  if (bSpec && !aSpec) return b;
  if (aSpec && bSpec) return a.length <= b.length ? a : b;
  return a || b || 'Evento';
}

export function extractCanonicalEventIdentity(
  rawName?: string | null,
  rawTag?: string | null,
  uidExterno?: string | null,
  origem?: string | null
): CanonicalEventIdentity {
  let text = (rawName || '').trim();
  text = text.replace(/^(\[priceu\$\]\s*)+/i, '').trim();
  text = text.replace(/^evento\s+de\s+/i, '').trim();
  text = text.replace(/\s*-\s*\d{2}\/\d{2}\/\d{4}\s*$/, '').trim();

  let extractedTag = (rawTag || '').trim();
  let baseName = text;

  const dashParts = text.split(' - ').map(p => p.trim()).filter(Boolean);
  if (dashParts.length >= 2) {
    baseName = dashParts[0].replace(/^evento\s+de\s+/i, '').trim();
    const tailTag = dashParts[dashParts.length - 1];
    extractedTag = chooseBetterEventTag(extractedTag, tailTag);
  } else {
    extractedTag = chooseBetterEventTag(extractedTag, null);
  }

  const canonicalName = normalizeTextForMatch(baseName || rawName || 'cliente');
  const canonicalTag = normalizeTextForMatch(extractedTag || 'evento');
  const isWorkflow =
    origem === 'workflow' ||
    Boolean(uidExterno && uidExterno.includes('workflow_')) ||
    /^tarefa:/i.test(baseName);

  const canonicalKey = isWorkflow
    ? `wf:${canonicalName}:${canonicalTag}`
    : `ev:${canonicalName}`;

  return {
    baseName: baseName || (rawName || 'Cliente').trim(),
    extractedTag: extractedTag || 'Evento',
    canonicalName,
    canonicalTag,
    canonicalKey,
    isWorkflow,
  };
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

    // Helper: busca evento existente em memória usando UID normalizado OU identidade canônica (mesmo nome + mesma tag ou tags diferentes)
    const findExistente = (evento: { data: string; nome: string; tipo?: string; uid_externo?: string }): EventoAgenda | null => {
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

      const incomingId = extractCanonicalEventIdentity(evento.nome, evento.tipo, evento.uid_externo, 'ics_sync');

      // Fallback canônico por data + nome canônico (mesmo se as tags forem diferentes ex: 'evento' vs 'Casamento')
      const foundFallback = eventosLocaisCache.find(e => {
        if (e.data_evento !== evento.data) return false;
        const localId = extractCanonicalEventIdentity(e.cliente_nome, e.tipo_evento, e.uid_externo, e.origem);
        return localId.canonicalKey === incomingId.canonicalKey;
      });

      if (foundFallback) {
        console.log(`[findExistente] Encontrado evento por identidade canônica (cache): ${evento.nome} (${evento.data})`);
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
            (evento.nome && /^\[priceu\$\]/i.test(evento.nome.trim())) ||
            (evento.uid_externo && (evento.uid_externo.includes('workflow_') || evento.uid_externo.includes('priceus')))
          ) {
            // Se o evento do Google com [PriceU$] corresponde a um evento local ainda sem vínculo gcal_, vinculamos sem duplicar!
            const existenteLocal = findExistente(evento);
            if (
              existenteLocal &&
              evento.uid_externo &&
              (!existenteLocal.uid_externo || !existenteLocal.uid_externo.startsWith('gcal_')) &&
              existenteLocal.origem !== 'workflow'
            ) {
              const linkedUid = `gcal_${normalizeUid(evento.uid_externo)}`;
              await supabase
                .from('eventos_agenda')
                .update({
                  uid_externo: linkedUid,
                  last_synced_at: new Date().toISOString(),
                })
                .eq('id', existenteLocal.id);
              existenteLocal.uid_externo = linkedUid;
            }
            console.log(`[importarEventosInteligente] Ignorando evento de sincronismo reverso/workflow: ${evento.nome} (${evento.uid_externo})`);
            result.eventos_ignorados++;
            return;
          }

          const incomingIdentity = extractCanonicalEventIdentity(evento.nome, evento.tipo, evento.uid_externo, 'ics_sync');

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
              const existingIdentity = extractCanonicalEventIdentity(
                existente.cliente_nome,
                existente.tipo_evento,
                existente.uid_externo,
                existente.origem
              );
              const bestTag = chooseBetterEventTag(existingIdentity.extractedTag, incomingIdentity.extractedTag);
              const bestClientName = existingIdentity.baseName || incomingIdentity.baseName;

              const updatePayload: Partial<EventoAgenda> = {
                data_evento: evento.data,
                cliente_nome: bestClientName,
                tipo_evento: bestTag,
                cidade: evento.cidade || existente.cidade,
                observacoes: existente.observacoes || `Atualizado de ${nomeArquivo}`,
                importacao_id: historicoId,
                horario_inicio: evento.horario_inicio !== undefined && evento.horario_inicio !== null ? evento.horario_inicio : existente.horario_inicio,
                duracao_minutos: evento.duracao_minutos !== undefined && evento.duracao_minutos !== null ? evento.duracao_minutos : existente.duracao_minutos,
              };
              // Só inclui uid_externo na atualização se já existe no registro ou no evento importado
              if (evento.uid_externo || (existente as any).uid_externo) {
                (updatePayload as any).uid_externo = (existente as any).uid_externo?.startsWith('gcal_')
                  ? (existente as any).uid_externo
                  : (evento.uid_externo || (existente as any).uid_externo);
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
            cliente_nome: incomingIdentity.baseName,
            tipo_evento: incomingIdentity.extractedTag || 'Evento',
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
          .select('id, data_evento, cliente_nome, tipo_evento, uid_externo')
          .eq('user_id', userId)
          .or('origem.eq.ics_sync,observacoes.ilike.%google-calendar-sync%');

        if (!errUid) {
          eventosSincronizados = comUid;
        } else {
          // Fallback: seleciona sem uid_externo
          console.warn('[sync] uid_externo indisponível na detecção de órfãos, usando fallback.', errUid.message);
          const { data: semUid } = await supabase
            .from('eventos_agenda')
            .select('id, data_evento, cliente_nome, tipo_evento')
            .eq('user_id', userId)
            .or('origem.eq.ics_sync,observacoes.ilike.%google-calendar-sync%');
          eventosSincronizados = semUid;
        }

        console.log(`[Sync] Eventos sincronizados encontrados no banco de dados: ${eventosSincronizados?.length || 0}`);

        if (eventosSincronizados && eventosSincronizados.length > 0) {
          // Criamos dois conjuntos para comparação resiliente:
          // 1. Pelos UIDs únicos normalizados (sem prefixo gcal_ ou sufixo @google.com)
          const setUidsICS = new Set(eventos.map(e => e.uid_externo ? normalizeUid(e.uid_externo) : '').filter(Boolean));
          // 2. Por data e chave canônica como fallback
          const setCanonicalICS = new Set(
            eventos.map(e => `${e.data.trim()}::${extractCanonicalEventIdentity(e.nome, e.tipo, e.uid_externo, 'ics_sync').canonicalKey}`)
          );
          const datasFeed = eventos.map(e => e.data).filter(Boolean).sort();
          const minDateInFeed = datasFeed[0] || '1970-01-01';

          const idsParaDeletar = eventosSincronizados
            .filter(e => {
              if (e.data_evento && e.data_evento < minDateInFeed) {
                return false;
              }
              const localCanonical = `${e.data_evento.trim()}::${extractCanonicalEventIdentity(e.cliente_nome, e.tipo_evento, e.uid_externo, 'ics_sync').canonicalKey}`;
              if (e.uid_externo) {
                const hasUid = setUidsICS.has(normalizeUid(e.uid_externo)) || setCanonicalICS.has(localCanonical);
                if (!hasUid) {
                  console.log(`[Sync] Evento marcado para exclusão (UID não encontrado no feed): ${e.cliente_nome} (${e.data_evento}), UID: ${e.uid_externo}`);
                }
                return !hasUid;
              }
              const hasFallback = setCanonicalICS.has(localCanonical);
              if (!hasFallback) {
                console.log(`[Sync] Evento marcado para exclusão (Chave canônica '${localCanonical}' não encontrada no feed): ${e.cliente_nome} (${e.data_evento})`);
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

          triggerGoogleCalendarSync(userId, 'update', eventPayload).then(async (res) => {
            if (res?.success && eventId) {
              await supabase
                .from('eventos_agenda')
                .update({ last_synced_at: new Date().toISOString() })
                .eq('id', eventId);
            }
          });
        } else {
          const { data: insertedWf } = await supabase
            .from('eventos_agenda')
            .insert([eventPayload])
            .select('id')
            .single();

          triggerGoogleCalendarSync(userId, 'insert', eventPayload).then(async (res) => {
            if (res?.success && insertedWf?.id) {
              await supabase
                .from('eventos_agenda')
                .update({ last_synced_at: new Date().toISOString() })
                .eq('id', insertedWf.id);
            }
          });
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
      const isAlreadyGcal = evt.uid_externo && (evt.uid_externo.startsWith('gcal_') || (evt.origem === 'workflow' && evt.last_synced_at));
      const isModified = evt.last_synced_at && evt.updated_at && new Date(evt.updated_at).getTime() > new Date(evt.last_synced_at).getTime() + 1000;
      if (isAlreadyGcal && !isModified) {
        continue;
      }

      const isUpdate = evt.uid_externo && evt.uid_externo.startsWith('gcal_');
      const gcalId = isUpdate ? evt.uid_externo.substring(5) : undefined;
      const action = isUpdate ? 'update' : 'insert';

      const payload = {
        id: evt.id,
        user_id: evt.user_id,
        data_evento: evt.data_evento,
        tipo_evento: evt.tipo_evento,
        cliente_nome: evt.cliente_nome,
        cidade: evt.cidade,
        status: evt.status,
        origem: evt.origem,
        observacoes: evt.observacoes,
        horario_inicio: evt.horario_inicio || null,
        horario_fim: evt.horario_fim || null,
        duracao_minutos: evt.duracao_minutos || null,
        uid_externo: evt.uid_externo || undefined,
      };

      const res = await triggerGoogleCalendarSync(userId, action, payload, gcalId);
      if (res?.success) {
        const updateFields: Record<string, any> = {
          last_synced_at: new Date().toISOString(),
        };
        if (res.googleEventId && (!evt.uid_externo || !evt.uid_externo.startsWith('gcal_')) && evt.origem !== 'workflow') {
          updateFields.uid_externo = `gcal_${res.googleEventId}`;
        }
        await supabase
          .from('eventos_agenda')
          .update(updateFields)
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

export interface MissingConvertedClientEvent {
  leadId: string;
  clientName: string;
  dataEvento: string;
  tipoEvento: string;
  cidade: string;
  horarioInicio: string | null;
  duracaoMinutos: number | null;
  hasContract: boolean;
}

export interface AgendaSyncStatus {
  isSynced: boolean;
  hasIntegration: boolean;
  googleOAuthConnected: boolean;
  icsConnected: boolean;
  pendingLocalToGoogle: number;
  pendingLocalEvents: EventoAgenda[];
  missingConvertedClientsCount: number;
  missingConvertedClients: MissingConvertedClientEvent[];
  missingWorkflowStepsCount: number;
  duplicateLocalEventsCount: number;
  syncStale: boolean;
  lastSyncAt: string | null;
}

function normalizeIsoDateString(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  return null;
}

/**
 * Verifica de forma inteligente:
 * 1) Se há clientes convertidos (com ou sem contrato, ou no fluxo de workflow) sem data inserida na agenda
 * 2) Se há eventos duplicados (mesmo nome + mesma tag ou tags diferentes na mesma data)
 * 3) Se a agenda do PriceU$ está sincronizada com o Google Calendar
 */
export async function checkAgendaSyncStatus(userId: string): Promise<AgendaSyncStatus> {
  const defaultStatus: AgendaSyncStatus = {
    isSynced: false,
    hasIntegration: false,
    googleOAuthConnected: false,
    icsConnected: false,
    pendingLocalToGoogle: 0,
    pendingLocalEvents: [],
    missingConvertedClientsCount: 0,
    missingConvertedClients: [],
    missingWorkflowStepsCount: 0,
    duplicateLocalEventsCount: 0,
    syncStale: false,
    lastSyncAt: null,
  };

  if (!userId) return defaultStatus;

  try {
    const [profileRes, configRes, todosEventosRes, leadsRes, contractsRes, citiesRes] = await Promise.all([
      supabase.from('profiles').select('google_auth_data').eq('id', userId).maybeSingle(),
      supabase
        .from('configuracao_agenda')
        .select('calendar_ics_url, last_calendar_sync, bloquear_agenda_workflow')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('eventos_agenda')
        .select('*')
        .eq('user_id', userId)
        .not('status', 'eq', 'cancelado'),
      supabase
        .from('leads')
        .select('id, nome_cliente, data_evento, tipo_evento, cidade_evento, status, workflow, orcamento_detalhe')
        .eq('user_id', userId),
      supabase
        .from('contracts')
        .select('id, lead_id, status, client_data_json, lead_data_json')
        .eq('user_id', userId),
      supabase
        .from('cidades_ajuste')
        .select('id, nome')
        .eq('user_id', userId),
    ]);

    const googleAuthData = profileRes.data?.google_auth_data;
    const googleOAuthConnected = !!(googleAuthData && googleAuthData.refresh_token);
    const icsUrl = configRes.data?.calendar_ics_url?.trim() || '';
    const icsConnected = icsUrl.length > 0;
    const hasIntegration = googleOAuthConnected || icsConnected;
    const lastSyncAt = configRes.data?.last_calendar_sync || null;
    const bloquearWorkflow = configRes.data?.bloquear_agenda_workflow ?? false;

    const cityMap = new Map<string, string>();
    for (const c of citiesRes.data || []) {
      if (c.id && c.nome) cityMap.set(c.id, c.nome);
    }

    const resolveCity = (rawCity?: string | null) => {
      if (!rawCity) return '';
      return cityMap.get(rawCity) || rawCity;
    };

    const todosEventosAtivos: EventoAgenda[] = todosEventosRes.data || [];

    // 1. Detectar duplicatas locais na mesma data com o mesmo nome canônico (mesma tag ou tags diferentes)
    const canonicalGroups = new Map<string, EventoAgenda[]>();
    for (const evt of todosEventosAtivos) {
      const idInfo = extractCanonicalEventIdentity(evt.cliente_nome, evt.tipo_evento, evt.uid_externo, evt.origem);
      const groupKey = `${evt.data_evento}::${idInfo.canonicalKey}`;
      const list = canonicalGroups.get(groupKey) || [];
      list.push(evt);
      canonicalGroups.set(groupKey, list);
    }

    let duplicateLocalEventsCount = 0;
    for (const [, group] of canonicalGroups.entries()) {
      if (group.length > 1) {
        duplicateLocalEventsCount += group.length - 1;
      }
    }

    // 2. Checkup de clientes convertidos (com ou sem contrato) e clientes no fluxo de workflow
    const allContracts = contractsRes.data || [];
    const contractsByLeadId = new Map<string, any[]>();
    for (const ct of allContracts) {
      if (ct.lead_id) {
        const list = contractsByLeadId.get(ct.lead_id) || [];
        list.push(ct);
        contractsByLeadId.set(ct.lead_id, list);
      }
    }

    const allLeads = leadsRes.data || [];
    const missingConvertedClients: MissingConvertedClientEvent[] = [];
    let missingWorkflowStepsCount = 0;

    for (const lead of allLeads) {
      const leadContracts = contractsByLeadId.get(lead.id) || [];
      const hasSignedContract = leadContracts.some((c: any) => c.status === 'signed');
      const hasAnyContract = leadContracts.length > 0;
      const wf = Array.isArray(lead.workflow) ? lead.workflow : [];
      const isConvertedOrInWorkflow =
        lead.status === 'convertido' ||
        hasSignedContract ||
        (wf.length > 0 && lead.status !== 'perdido' && lead.status !== 'abandonado' && lead.status !== 'finalizado');

      if (!isConvertedOrInWorkflow) continue;

      // Coletar data(s) do evento do cliente a partir do lead e/ou contrato
      const candidateDates = new Set<string>();
      const leadDate = normalizeIsoDateString(lead.data_evento);
      if (leadDate) candidateDates.add(leadDate);

      let contractHorario: string | null = null;
      let contractDuracao: number | null = null;

      for (const ct of leadContracts) {
        const d1 = normalizeIsoDateString(ct.client_data_json?.data_evento);
        const d2 = normalizeIsoDateString(ct.lead_data_json?.data_evento);
        if (d1) candidateDates.add(d1);
        if (d2) candidateDates.add(d2);
        if (!contractHorario) {
          contractHorario = ct.client_data_json?.horario_inicio || ct.lead_data_json?.horario_inicio || null;
        }
        if (!contractDuracao) {
          const rawDur = ct.client_data_json?.duracao_minutos || ct.lead_data_json?.duracao_minutos;
          if (rawDur) contractDuracao = Number(rawDur) || null;
        }
      }

      const horarioLead =
        (lead.orcamento_detalhe as any)?.horario_inicio ||
        (lead.orcamento_detalhe as any)?.selectedSlot ||
        contractHorario ||
        null;
      const duracaoLead =
        Number((lead.orcamento_detalhe as any)?.duracao_minutos) ||
        contractDuracao ||
        null;

      const clientName = (lead.nome_cliente || 'Cliente').trim();
      const tipoEvento = chooseBetterEventTag(lead.tipo_evento, 'Evento');
      const leadIdentity = extractCanonicalEventIdentity(clientName, tipoEvento, null, 'lead_convertido');

      for (const dt of candidateDates) {
        // Verifica se já existe na agenda por lead_id + data OU por data + identidade canônica do cliente
        const existsInAgenda = todosEventosAtivos.some((ev) => {
          if (ev.origem === 'workflow') return false;
          if ((ev as any).lead_id === lead.id && ev.data_evento === dt) return true;
          if (ev.data_evento !== dt) return false;
          const evId = extractCanonicalEventIdentity(ev.cliente_nome, ev.tipo_evento, ev.uid_externo, ev.origem);
          return evId.canonicalKey === leadIdentity.canonicalKey;
        });

        if (!existsInAgenda) {
          missingConvertedClients.push({
            leadId: lead.id,
            clientName: leadIdentity.baseName,
            dataEvento: dt,
            tipoEvento,
            cidade: resolveCity(lead.cidade_evento),
            horarioInicio: horarioLead,
            duracaoMinutos: duracaoLead,
            hasContract: hasAnyContract,
          });
        }
      }

      // Verificar etapas do workflow com data e hora definidas (se bloqueio de workflow estiver ativo)
      if (bloquearWorkflow && wf.length > 0) {
        for (const step of wf) {
          const hasDateTime = step.deadline && step.horario_inicio && step.duracao_minutos;
          if (hasDateTime && step.status !== 'concluido') {
            const wfUid = `workflow_${step.id}`;
            const wfExists = todosEventosAtivos.some((ev) => ev.uid_externo === wfUid);
            if (!wfExists) {
              missingWorkflowStepsCount++;
            }
          }
        }
      }
    }

    // 3. Eventos locais que precisam ser enviados/atualizados no Google Calendar
    const eventosLocais = todosEventosAtivos.filter((e) => e.origem !== 'ics_sync');
    const pendingLocalEvents = googleOAuthConnected
      ? eventosLocais.filter((evt) => {
          const hasValidSync =
            (evt.uid_externo && evt.uid_externo.startsWith('gcal_')) ||
            (evt.origem === 'workflow' && !!evt.last_synced_at);
          if (!hasValidSync) return true;
          if (!evt.last_synced_at) return true;
          if (evt.updated_at) {
            const updatedAt = new Date(evt.updated_at).getTime();
            const lastSyncedAt = new Date(evt.last_synced_at).getTime();
            if (updatedAt > lastSyncedAt + 1000) return true;
          }
          return false;
        })
      : [];

    // Considera a leitura externa desatualizada se houver integração e nunca sincronizou ou faz mais de 2h
    const STALE_MS = 2 * 60 * 60 * 1000;
    const syncStale = hasIntegration
      ? !lastSyncAt || Date.now() - new Date(lastSyncAt).getTime() > STALE_MS
      : false;

    const isSynced =
      hasIntegration &&
      pendingLocalEvents.length === 0 &&
      missingConvertedClients.length === 0 &&
      missingWorkflowStepsCount === 0 &&
      duplicateLocalEventsCount === 0 &&
      !syncStale;

    return {
      isSynced,
      hasIntegration,
      googleOAuthConnected,
      icsConnected,
      pendingLocalToGoogle: pendingLocalEvents.length,
      pendingLocalEvents,
      missingConvertedClientsCount: missingConvertedClients.length,
      missingConvertedClients,
      missingWorkflowStepsCount,
      duplicateLocalEventsCount,
      syncStale,
      lastSyncAt,
    };
  } catch (err) {
    console.warn('[checkAgendaSyncStatus] Erro ao verificar status de sincronia:', err);
    return defaultStatus;
  }
}

export interface BidirectionalSyncResult {
  success: boolean;
  restoredConvertedEvents: number;
  deduplicatedEvents: number;
  pushedToGoogle: number;
  pulledFromGoogle: number;
  updatedFromGoogle: number;
  removedOrphans: number;
  message: string;
  errors: string[];
}

/**
 * Executa o Checkup Completo + Deduplicação Espelho + Sincronização Bidirecional:
 * 0A) Verifica todos os clientes convertidos (com ou sem contrato) e workflows e insere na agenda qualquer evento faltante.
 * 0B) Verifica tags e nomes em eventos_agenda e remove duplicatas (mesmo nome + mesma tag ou tags diferentes na mesma data),
 *     mantendo apenas 1 cópia limpa no PriceU$ e 1 cópia no Google Calendar.
 * 1) PriceU$ ➔ Google Calendar (envia eventos locais pendentes/atualizados com horário e tag, sem duplicar).
 * 2) Google Calendar ➔ PriceU$ (busca eventos do Google via OAuth e/ou iCal .ics, deduplica no Google e mescla no PriceU$).
 */
export async function syncBidirectionalAgenda(
  userId: string,
  onProgress?: (info: { step: string; current?: number; total?: number }) => void
): Promise<BidirectionalSyncResult> {
  const result: BidirectionalSyncResult = {
    success: false,
    restoredConvertedEvents: 0,
    deduplicatedEvents: 0,
    pushedToGoogle: 0,
    pulledFromGoogle: 0,
    updatedFromGoogle: 0,
    removedOrphans: 0,
    message: '',
    errors: [],
  };

  try {
    onProgress?.({ step: 'Verificando clientes convertidos, contratos e workflows...' });

    const initialStatus = await checkAgendaSyncStatus(userId);

    // ETAPA 0A: Inserir na agenda eventos faltantes de clientes convertidos (com ou sem contrato) e workflows
    if (initialStatus.missingConvertedClients.length > 0) {
      for (const missing of initialStatus.missingConvertedClients) {
        onProgress?.({ step: `Restaurando evento de cliente convertido: ${missing.clientName}...` });
        const payload: Partial<EventoAgenda> = {
          user_id: userId,
          data_evento: missing.dataEvento,
          cliente_nome: missing.clientName,
          tipo_evento: missing.tipoEvento || 'Evento',
          cidade: missing.cidade || '',
          status: 'confirmado',
          origem: 'lead_convertido',
          observacoes: missing.hasContract
            ? 'Inserido pelo checkup de cliente convertido (com contrato)'
            : 'Inserido pelo checkup de cliente convertido',
          horario_inicio: missing.horarioInicio || null,
          duracao_minutos: missing.duracaoMinutos || null,
        };
        (payload as any).lead_id = missing.leadId;

        const { error: insErr } = await supabase.from('eventos_agenda').insert([payload]);
        if (!insErr) {
          result.restoredConvertedEvents++;
        }
      }
    }

    // Sincronizar etapas de workflow pendentes se bloqueio de workflow estiver ativo
    if (initialStatus.missingWorkflowStepsCount > 0) {
      const { data: leadsWf } = await supabase
        .from('leads')
        .select('id, nome_cliente, status, workflow')
        .eq('user_id', userId);
      for (const l of leadsWf || []) {
        if (Array.isArray(l.workflow) && l.workflow.length > 0 && l.status !== 'perdido' && l.status !== 'abandonado') {
          await syncWorkflowToCalendar(userId, l.id, l.nome_cliente || 'Cliente', l.workflow);
        }
      }
    }

    // ETAPA 0B: Deduplicar eventos locais (mesmo nome + mesma tag ou tags diferentes na mesma data) e higienizar tags
    onProgress?.({ step: 'Verificando tags e eliminando duplicidades na agenda...' });
    const { data: allActiveLocal } = await supabase
      .from('eventos_agenda')
      .select('*')
      .eq('user_id', userId)
      .not('status', 'eq', 'cancelado');

    // Mapa de leads convertidos para enriquecer tags e lead_id em eventos já existentes
    const { data: convertedLeadsList } = await supabase
      .from('leads')
      .select('id, nome_cliente, data_evento, tipo_evento, status')
      .eq('user_id', userId)
      .eq('status', 'convertido');

    const leadByDateAndCanonical = new Map<string, { id: string; tipo_evento?: string; nome_cliente?: string }>();
    for (const l of convertedLeadsList || []) {
      const dt = normalizeIsoDateString(l.data_evento);
      if (dt && l.nome_cliente) {
        const lid = extractCanonicalEventIdentity(l.nome_cliente, l.tipo_evento, null, 'lead_convertido');
        leadByDateAndCanonical.set(`${dt}::${lid.canonicalKey}`, l);
      }
    }

    const groupsByDateAndCanonical = new Map<string, EventoAgenda[]>();
    for (const evt of allActiveLocal || []) {
      const idInfo = extractCanonicalEventIdentity(evt.cliente_nome, evt.tipo_evento, evt.uid_externo, evt.origem);
      const key = `${evt.data_evento}::${idInfo.canonicalKey}`;
      const list = groupsByDateAndCanonical.get(key) || [];
      list.push(evt);
      groupsByDateAndCanonical.set(key, list);
    }

    for (const [groupKey, group] of groupsByDateAndCanonical.entries()) {
      // Ordena para escolher o melhor registro principal ("keeper")
      group.sort((a, b) => {
        const score = (e: EventoAgenda) =>
          ((e as any).lead_id ? 10 : 0) +
          (e.origem === 'lead_convertido' ? 6 : e.origem !== 'ics_sync' ? 3 : 0) +
          (e.uid_externo && e.uid_externo.startsWith('gcal_') ? 5 : 0) +
          (isSpecificEventTag(e.tipo_evento) ? 3 : 0) +
          (e.horario_inicio ? 2 : 0);
        return score(b) - score(a);
      });

      const keeper = group[0];
      const keeperIdentity = extractCanonicalEventIdentity(
        keeper.cliente_nome,
        keeper.tipo_evento,
        keeper.uid_externo,
        keeper.origem
      );

      let mergedBaseName = keeperIdentity.baseName;
      let mergedTag = keeperIdentity.extractedTag;
      let mergedLeadId: string | null = (keeper as any).lead_id || null;
      let mergedGcalUid: string | undefined =
        keeper.uid_externo && keeper.uid_externo.startsWith('gcal_') ? keeper.uid_externo : undefined;
      let mergedHorarioInicio = keeper.horario_inicio || null;
      let mergedHorarioFim = keeper.horario_fim || null;
      let mergedDuracao = keeper.duracao_minutos || null;
      let mergedCidade = keeper.cidade || '';
      let mergedOrigem = keeper.origem;

      const matchedLead = leadByDateAndCanonical.get(groupKey);
      if (matchedLead) {
        if (!mergedLeadId) mergedLeadId = matchedLead.id;
        if (matchedLead.tipo_evento) {
          mergedTag = chooseBetterEventTag(mergedTag, matchedLead.tipo_evento);
        }
        if (mergedOrigem === 'ics_sync') {
          mergedOrigem = 'lead_convertido';
        }
      }

      // Mesclar atributos das cópias duplicadas no keeper e remover as cópias extras
      for (let i = 1; i < group.length; i++) {
        const dup = group[i];
        const dupIdentity = extractCanonicalEventIdentity(dup.cliente_nome, dup.tipo_evento, dup.uid_externo, dup.origem);
        mergedTag = chooseBetterEventTag(mergedTag, dupIdentity.extractedTag);
        if (!mergedLeadId && (dup as any).lead_id) mergedLeadId = (dup as any).lead_id;
        if (!mergedHorarioInicio && dup.horario_inicio) mergedHorarioInicio = dup.horario_inicio;
        if (!mergedHorarioFim && dup.horario_fim) mergedHorarioFim = dup.horario_fim;
        if (!mergedDuracao && dup.duracao_minutos) mergedDuracao = dup.duracao_minutos;
        if (!mergedCidade && dup.cidade) mergedCidade = dup.cidade;
        if (mergedOrigem === 'ics_sync' && dup.origem && dup.origem !== 'ics_sync') {
          mergedOrigem = dup.origem;
        }

        if (dup.uid_externo && dup.uid_externo.startsWith('gcal_')) {
          if (!mergedGcalUid) {
            mergedGcalUid = dup.uid_externo;
          } else if (dup.uid_externo !== mergedGcalUid && initialStatus.googleOAuthConnected) {
            // Se a duplicata tinha outro ID no Google Calendar, apaga a cópia extra no Google Calendar também!
            const dupGcalId = dup.uid_externo.substring(5);
            await triggerGoogleCalendarSync(userId, 'delete', dup, dupGcalId);
          }
        }

        await supabase.from('eventos_agenda').delete().eq('id', dup.id);
        result.deduplicatedEvents++;
      }

      // Atualizar o keeper se houve fusão de duplicatas ou limpeza de nome/tag/vínculo de lead
      const needsKeeperUpdate =
        group.length > 1 ||
        keeper.cliente_nome !== mergedBaseName ||
        keeper.tipo_evento !== mergedTag ||
        (mergedLeadId && (keeper as any).lead_id !== mergedLeadId) ||
        (mergedGcalUid && keeper.uid_externo !== mergedGcalUid) ||
        keeper.origem !== mergedOrigem;

      if (needsKeeperUpdate) {
        const keeperUpdate: Record<string, any> = {
          cliente_nome: mergedBaseName,
          tipo_evento: mergedTag,
          cidade: mergedCidade,
          horario_inicio: mergedHorarioInicio,
          horario_fim: mergedHorarioFim,
          duracao_minutos: mergedDuracao,
          origem: mergedOrigem,
        };
        if (mergedLeadId) keeperUpdate.lead_id = mergedLeadId;
        if (mergedGcalUid) keeperUpdate.uid_externo = mergedGcalUid;

        await supabase.from('eventos_agenda').update(keeperUpdate).eq('id', keeper.id);
      }
    }

    // Revalidar status após o checkup de convertidos e deduplicação local
    const status = await checkAgendaSyncStatus(userId);
    if (!status.hasIntegration) {
      const localParts: string[] = [];
      if (result.restoredConvertedEvents > 0) {
        localParts.push(`${result.restoredConvertedEvents} evento(s) de cliente(s) convertido(s) restaurado(s) na agenda`);
      }
      if (result.deduplicatedEvents > 0) {
        localParts.push(`${result.deduplicatedEvents} duplicata(s) removida(s)`);
      }
      result.success = localParts.length > 0;
      result.message =
        localParts.length > 0
          ? `Checkup local concluído (${localParts.join(' • ')}). Conecte sua conta Google Calendar na aba Configurações para espelhar com o Google.`
          : 'Checkup local concluído! Nenhuma conta Google Calendar está vinculada no momento.';
      return result;
    }

    // ETAPA 1: PriceU$ -> Google Calendar (via OAuth)
    if (status.googleOAuthConnected && status.pendingLocalEvents.length > 0) {
      const total = status.pendingLocalEvents.length;
      for (let i = 0; i < total; i++) {
        const evt = status.pendingLocalEvents[i];
        onProgress?.({
          step: `Enviando eventos do PriceU$ para o Google (${i + 1}/${total})...`,
          current: i + 1,
          total,
        });

        const isUpdate = evt.uid_externo && evt.uid_externo.startsWith('gcal_');
        const gcalId = isUpdate ? evt.uid_externo!.substring(5) : undefined;
        const action = isUpdate ? 'update' : 'insert';

        const payload = {
          id: evt.id,
          user_id: evt.user_id,
          data_evento: evt.data_evento,
          tipo_evento: evt.tipo_evento,
          cliente_nome: evt.cliente_nome,
          cidade: evt.cidade,
          status: evt.status,
          origem: evt.origem,
          observacoes: evt.observacoes,
          horario_inicio: evt.horario_inicio || null,
          horario_fim: evt.horario_fim || null,
          duracao_minutos: evt.duracao_minutos || null,
          uid_externo: evt.uid_externo || undefined,
        };

        const res = await triggerGoogleCalendarSync(userId, action, payload, gcalId);
        if (res?.success) {
          const updateFields: Record<string, any> = {
            last_synced_at: new Date().toISOString(),
          };
          if (res.googleEventId && (!evt.uid_externo || !evt.uid_externo.startsWith('gcal_')) && evt.origem !== 'workflow') {
            updateFields.uid_externo = `gcal_${res.googleEventId}`;
          }
          await supabase.from('eventos_agenda').update(updateFields).eq('id', evt.id);
          result.pushedToGoogle++;
        } else {
          result.errors.push(`Falha ao enviar "${evt.cliente_nome}" (${evt.data_evento}) ao Google.`);
        }

        if (total > 1) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    }

    // ETAPA 2: Google Calendar -> PriceU$ (via OAuth list e/ou iCal .ics) com deduplicação por chave canônica
    onProgress?.({ step: 'Verificando eventos e duplicidades no Google Calendar...' });

    const externalEventsMap = new Map<
      string,
      {
        data: string;
        nome: string;
        tipo?: string;
        uid_externo?: string;
        horario_inicio?: string | null;
        duracao_minutos?: number | null;
      }
    >();

    const buildExternalCanonicalKey = (data: string, nome: string, tipo?: string, uid?: string) => {
      const idInfo = extractCanonicalEventIdentity(nome, tipo, uid, 'ics_sync');
      return `${data.trim()}::${idInfo.canonicalKey}`;
    };

    // 2a. Buscar via Google Calendar API OAuth (action: 'list')
    if (status.googleOAuthConnected) {
      const listRes = await triggerGoogleCalendarSync(userId, 'list', {});
      if (listRes?.success) {
        if (typeof listRes.deduplicatedInGoogle === 'number' && listRes.deduplicatedInGoogle > 0) {
          result.deduplicatedEvents += listRes.deduplicatedInGoogle;
        }
        if (Array.isArray(listRes.events)) {
          for (const ev of listRes.events) {
            if (!ev.data || !ev.nome) continue;
            const key = buildExternalCanonicalKey(ev.data, ev.nome, ev.tipo, ev.uid_externo);
            externalEventsMap.set(key, {
              data: ev.data,
              nome: ev.nome,
              tipo: ev.tipo || 'evento',
              uid_externo: ev.uid_externo,
              horario_inicio: ev.horario_inicio || null,
              duracao_minutos: ev.duracao_minutos || null,
            });
          }
        }
      }
    }

    // 2b. Buscar via link iCal (.ics) se configurado
    if (status.icsConnected) {
      const { data: cfg } = await supabase
        .from('configuracao_agenda')
        .select('calendar_ics_url')
        .eq('user_id', userId)
        .maybeSingle();

      if (cfg?.calendar_ics_url) {
        const { data: icsData, error: icsErr } = await supabase.functions.invoke('fetch-calendar', {
          body: { url: cfg.calendar_ics_url },
        });
        if (!icsErr && icsData?.text && icsData.text.includes('BEGIN:VCALENDAR')) {
          const parsedIcs = parseICS(icsData.text);
          for (const ev of parsedIcs) {
            if (!ev.data_evento || !ev.cliente_nome) continue;
            const key = buildExternalCanonicalKey(ev.data_evento, ev.cliente_nome, ev.tipo_evento, ev.uid_externo);
            if (!externalEventsMap.has(key)) {
              externalEventsMap.set(key, {
                data: ev.data_evento,
                nome: ev.cliente_nome,
                tipo: ev.tipo_evento || 'evento',
                uid_externo: ev.uid_externo,
                horario_inicio: ev.horario_inicio || null,
                duracao_minutos: ev.duracao_minutos || null,
              });
            } else {
              // Se já existe no mapa, enriquece a tag caso o ICS tenha uma tag mais específica
              const current = externalEventsMap.get(key)!;
              current.tipo = chooseBetterEventTag(current.tipo, ev.tipo_evento);
            }
          }
        }
      }
    }

    const externalEvents = Array.from(externalEventsMap.values());
    if (externalEvents.length > 0) {
      onProgress?.({ step: `Espelhando ${externalEvents.length} evento(s) do Google na agenda...` });
      const importRes = await importarEventosInteligente(
        userId,
        'google-calendar-sync',
        externalEvents,
        'mesclar_atualizar'
      );
      result.pulledFromGoogle = importRes.eventos_adicionados;
      result.updatedFromGoogle = importRes.eventos_atualizados;
      result.removedOrphans = importRes.eventos_removidos;
      if (importRes.errors.length > 0) {
        result.errors.push(...importRes.errors);
      }
    }

    const nowIso = new Date().toISOString();
    await supabase
      .from('configuracao_agenda')
      .update({ last_calendar_sync: nowIso })
      .eq('user_id', userId);

    result.success = true;
    const parts: string[] = [];
    if (result.restoredConvertedEvents > 0) {
      parts.push(`${result.restoredConvertedEvents} cliente(s) convertido(s) inserido(s) na agenda`);
    }
    if (result.deduplicatedEvents > 0) {
      parts.push(`${result.deduplicatedEvents} duplicata(s) unificada(s)`);
    }
    if (result.pushedToGoogle > 0) parts.push(`${result.pushedToGoogle} enviado(s) ao Google`);
    if (result.pulledFromGoogle > 0) parts.push(`${result.pulledFromGoogle} trazido(s) do Google`);
    if (result.updatedFromGoogle > 0) parts.push(`${result.updatedFromGoogle} atualizado(s)`);
    if (result.removedOrphans > 0) parts.push(`${result.removedOrphans} removido(s)`);

    result.message =
      parts.length > 0
        ? `Checkup e espelhamento concluídos: ${parts.join(' • ')}.`
        : 'Checkup concluído! Todos os clientes convertidos, tags e eventos estão 100% espelhados entre PriceU$ e Google Calendar (sem duplicatas).';

    return result;
  } catch (err: any) {
    console.error('[syncBidirectionalAgenda] Erro:', err);
    result.errors.push(err.message || 'Erro inesperado na sincronização.');
    result.message = err.message || 'Erro ao sincronizar agendas.';
    return result;
  }
}
