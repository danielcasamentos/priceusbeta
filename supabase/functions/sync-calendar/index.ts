import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const parseICalDate = (dateStr: string): string | null => {
  if (!dateStr || dateStr.length < 8) return null;
  // Handle UTC datetime (ends with Z), convert to America/Sao_Paulo date
  if (dateStr.endsWith('Z') && dateStr.includes('T')) {
    try {
      const year = parseInt(dateStr.substring(0, 4), 10);
      const month = parseInt(dateStr.substring(4, 6), 10) - 1;
      const day = parseInt(dateStr.substring(6, 8), 10);
      const hour = parseInt(dateStr.substring(9, 11), 10);
      const minute = parseInt(dateStr.substring(11, 13), 10);
      const second = parseInt(dateStr.substring(13, 15), 10);

      if (!isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(hour) && !isNaN(minute) && !isNaN(second)) {
        const utcMs = Date.UTC(year, month, day, hour, minute, second);
        // America/Sao_Paulo is UTC-3 (or UTC-2 during DST)
        // Use Intl if available in Deno, otherwise offset manually by -3h
        try {
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
          const parts = formatter.formatToParts(new Date(utcMs));
          const y = parts.find((p: {type: string; value: string}) => p.type === 'year')?.value;
          const m = parts.find((p: {type: string; value: string}) => p.type === 'month')?.value;
          const d = parts.find((p: {type: string; value: string}) => p.type === 'day')?.value;
          if (y && m && d) return `${y}-${m}-${d}`;
        } catch (_) {
          // Deno fallback: manual offset -3h
          const localMs = utcMs - 3 * 60 * 60 * 1000;
          const localDate = new Date(localMs);
          const y = localDate.getUTCFullYear();
          const m = String(localDate.getUTCMonth() + 1).padStart(2, '0');
          const d = String(localDate.getUTCDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      }
    } catch (_) {
      // fall through to digit-extraction below
    }
  }

  // Handles date-only format YYYYMMDD or datetime without Z
  const dateMatch = dateStr.match(/^(\d{4})(\d{2})(\d{2})/);
  if (dateMatch) {
    return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }
  return null;
};

const parseICS = (text: string): Array<{ data_evento: string; cliente_nome: string; tipo_evento?: string; uid_externo?: string }> => {
  const eventos: Array<{ data_evento: string; cliente_nome: string; tipo_evento?: string; uid_externo?: string }> = [];
  // RFC 5545 line unfolding: CRLF followed by whitespace is a continuation
  const unfoldedText = text.replace(/\r?\n[ \t]/g, '');
  const lines = unfoldedText.split(/\r?\n/);

  let currentEvent: { data_evento?: string; cliente_nome?: string; tipo_evento?: string; uid_externo?: string } = {};
  let inEvent = false;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex === -1) continue;

    // Split key (may have params like SUMMARY;CHARSET=UTF-8) from value
    const keyWithParams = trimmedLine.substring(0, colonIndex);
    const value = trimmedLine.substring(colonIndex + 1).trim();
    const key = keyWithParams.split(';')[0].trim().toUpperCase();

    if (key === 'BEGIN' && value === 'VEVENT') {
      inEvent = true;
      currentEvent = { tipo_evento: 'evento' };
    } else if (key === 'END' && value === 'VEVENT') {
      if (currentEvent.data_evento && currentEvent.cliente_nome) {
        eventos.push(currentEvent as { data_evento: string; cliente_nome: string; tipo_evento?: string; uid_externo?: string });
      }
      inEvent = false;
      currentEvent = {};
    } else if (inEvent) {
      if (key === 'DTSTART') {
        const parsedDate = parseICalDate(value);
        if (parsedDate) currentEvent.data_evento = parsedDate;
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
            created_at: dataHoraAtual
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
