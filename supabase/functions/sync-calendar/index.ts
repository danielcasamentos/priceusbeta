import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
          // Manual fallback if Intl fails in Deno environment
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

interface EventoImportado {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Falha na autenticação')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment details missing')
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, { 
      global: { headers: { Authorization: authHeader } } 
    })

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      console.error('Erro no getUser:', userError);
      throw new Error('Usuário não autenticado')
    }

    const { data: config, error: configError } = await supabase
      .from('configuracao_agenda')
      .select('calendar_ics_url, auto_sync_enabled')
      .eq('user_id', user.id)
      .maybeSingle()

    if (configError) throw configError
    if (!config || !config.calendar_ics_url) {
       return new Response(JSON.stringify({ error: 'Nenhuma URL de calendário configurada' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    let url = config.calendar_ics_url;
    if (url.startsWith('webcal://')) {
      url = url.replace(/^webcal:\/\//i, 'https://');
    }
    
    console.log(`Buscando calendário da URL para o usuário ${user.id}: ${url}`);
    
    // We use headers to avoid cached responses and simulate a standard browser agent
    // to prevent some providers (like iCloud) from blocking our servers.
    const response = await fetch(url, { 
      headers: { 
        'Cache-Control': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/calendar, text/plain, */*'
      } 
    });
    if (!response.ok) {
       throw new Error(`Falha ao buscar URL: ${response.statusText}`);
    }
    const icsText = await response.text();
    
    const parsedEventos = parseICS(icsText);
    let adicionados = 0;
    
    if (parsedEventos.length > 0) {
      const { data: existentes, error: queryError } = await supabase
         .from('eventos_agenda')
         .select('cliente_nome, data_evento, uid_externo')
         .eq('user_id', user.id)
         .or('origem.eq.ics_sync,observacoes.ilike.%google-calendar-sync%')

      if (queryError) throw queryError;
      
      // Build lookup sets: by UID (preferred) and by name+date (fallback)
      const setUidsExistentes = new Set(existentes?.map((e: any) => e.uid_externo).filter(Boolean));
      const setDataNomeExistentes = new Set(existentes?.map((e: any) => `${e.cliente_nome}-${e.data_evento}`));
      const novosEventos: any[] = [];
      const dataHoraAtual = new Date().toISOString();
      
      for (const evento of parsedEventos) {
         // Skip if already exists by UID
         if (evento.uid_externo && setUidsExistentes.has(evento.uid_externo)) continue;
         // Skip if already exists by name+date (case-sensitive, best effort here)
         const chave = `${evento.cliente_nome}-${evento.data_evento}`;
         if (!evento.uid_externo && setDataNomeExistentes.has(chave)) continue;

         const novoEvento: any = {
            user_id: user.id,
            data_evento: evento.data_evento,
            cliente_nome: evento.cliente_nome,
            tipo_evento: evento.tipo_evento || 'evento',
            cidade: '', // required field
            status: 'confirmado',
            origem: 'ics_sync',
            observacoes: 'Importado automaticamente do calendário externo',
            created_at: dataHoraAtual,
            horario_inicio: (evento as any).horario_inicio || null,
            duracao_minutos: (evento as any).duracao_minutos || null
         };
         if (evento.uid_externo) {
           novoEvento.uid_externo = evento.uid_externo;
         }
         novosEventos.push(novoEvento);
         adicionados++;
      }
      
      if (novosEventos.length > 0) {
         const { error: insertError } = await supabase
            .from('eventos_agenda')
            .insert(novosEventos);
            
         if (insertError) {
           // Fallback: retry without uid_externo in case column doesn't exist yet
           console.warn('Falha ao inserir com uid_externo, reintentando sem o campo.', insertError.message);
           const novosSemUid = novosEventos.map(({ uid_externo, ...resto }: any) => resto);
           const { error: insertError2 } = await supabase
              .from('eventos_agenda')
              .insert(novosSemUid);
           if (insertError2) throw insertError2;
         }
      }
    }
    
    await supabase
       .from('configuracao_agenda')
       .update({ last_calendar_sync: new Date().toISOString() })
       .eq('user_id', user.id);

    return new Response(
      JSON.stringify({ success: true, adicionados, total_analisados: parsedEventos.length }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('Erro na sincronizacao:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
