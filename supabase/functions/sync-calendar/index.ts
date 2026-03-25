import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
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
    
    // We append a random query param or use headers to avoid cached responses
    const response = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
    if (!response.ok) {
       throw new Error(`Falha ao buscar URL: ${response.statusText}`);
    }
    const icsText = await response.text();
    
    const parsedEventos = parseICS(icsText);
    let adicionados = 0;
    
    if (parsedEventos.length > 0) {
      const { data: existentes, error: queryError } = await supabase
         .from('eventos_agenda')
         .select('cliente_nome, data_evento')
         .eq('user_id', user.id)

      if (queryError) throw queryError;
      
      const setExistentes = new Set(existentes?.map(e => `${e.cliente_nome}-${e.data_evento}`));
      const novosEventos = [];
      const dataHoraAtual = new Date().toISOString();
      
      for (const evento of parsedEventos) {
         const chave = `${evento.cliente_nome}-${evento.data_evento}`;
         if (!setExistentes.has(chave)) {
            novosEventos.push({
               user_id: user.id,
               data_evento: evento.data_evento,
               cliente_nome: evento.cliente_nome,
               tipo_evento: evento.tipo_evento || 'evento',
               cidade: '', // required field
               status: 'confirmado',
               origem: 'ics_sync',
               observacoes: 'Importado automaticamente do calendário externo',
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
