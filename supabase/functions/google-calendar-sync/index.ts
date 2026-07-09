import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Falha na autenticação: cabeçalho ausente')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente do Supabase ausentes')
    }

    // Usamos o client de admin/service_role para ler/atualizar perfis e eventos com segurança
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })

    // Validar usuário logado
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Usuário não autenticado ou token inválido')
    }

    const body = await req.json();
    const { action, event, eventId } = body;

    if (!action || !['insert', 'update', 'delete'].includes(action)) {
      throw new Error('Ação inválida. Ações permitidas: insert, update, delete')
    }

    // 1. Obter credenciais do Google do perfil do usuário
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('google_auth_data, business_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('Perfil de usuário não encontrado')
    }

    const googleAuthData = profile.google_auth_data;
    if (!googleAuthData || !googleAuthData.refresh_token) {
      return new Response(JSON.stringify({ success: false, message: 'Integração com Google Calendar não conectada' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // 2. Renovar access_token usando o refresh_token
    const clientId = Deno.env.get('SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID') || Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET') || Deno.env.get('GOOGLE_CLIENT_SECRET');

    console.log(`[GoogleSync] Solicitando refresh de token para user_id: ${user.id}`);
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId || '',
        client_secret: clientSecret || '',
        refresh_token: googleAuthData.refresh_token,
        grant_type: 'refresh_token',
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[GoogleSync] Erro ao renovar token:', errorText);
      throw new Error(`Falha ao autorizar no Google: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Atualizar token no perfil local
    const updatedAuth = {
      ...googleAuthData,
      access_token: accessToken,
      updated_at: new Date().toISOString()
    };
    await supabaseAdmin
      .from('profiles')
      .update({ google_auth_data: updatedAuth })
      .eq('id', user.id);

    // 3. Auxiliares para formatação de datas (offset de São Paulo: UTC-3)
    const formatDateTime = (dataStr: string, timeStr?: string | null, minutes?: number | null) => {
      // Se não há horário de início, criamos um evento de dia inteiro (all-day event)
      if (!timeStr) {
        const start = dataStr;
        // Google espera o fim do evento exclusivo no próximo dia
        const startDate = new Date(`${dataStr}T12:00:00`);
        startDate.setDate(startDate.getDate() + 1);
        const end = startDate.toISOString().split('T')[0];
        return { start: { date: start }, end: { date: end }, isAllDay: true };
      }

      // Se há horário de início: "14:00" ou "14:00:00"
      const timePart = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
      const startDateTime = `${dataStr}T${timePart}-03:00`;

      // Calcular fim do evento baseado na duração (minutos)
      const duration = minutes || 60;
      const startDateObj = new Date(`${dataStr}T${timePart}`);
      const endDateObj = new Date(startDateObj.getTime() + duration * 60 * 1000);
      
      const pad = (n: number) => String(n).padStart(2, '0');
      const endDateTime = `${endDateObj.getFullYear()}-${pad(endDateObj.getMonth() + 1)}-${pad(endDateObj.getDate())}T${pad(endDateObj.getHours())}:${pad(endDateObj.getMinutes())}:${pad(endDateObj.getSeconds())}-03:00`;

      return {
        start: { dateTime: startDateTime, timeZone: 'America/Sao_Paulo' },
        end: { dateTime: endDateTime, timeZone: 'America/Sao_Paulo' },
        isAllDay: false
      };
    };

    // Helper: Encontra evento por query (ex: q=workflow_123)
    const findGoogleEventIdByQuery = async (queryText: string): Promise<string | null> => {
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${encodeURIComponent(queryText)}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          return data.items[0].id;
        }
      }
      return null;
    };

    // 4. Executar operações
    let googleEventId = eventId;

    if (action === 'delete') {
      if (!googleEventId && event?.uid_externo) {
        // Tenta achar por query caso não tenhamos o ID direto
        googleEventId = await findGoogleEventIdByQuery(event.uid_externo);
      }
      if (!googleEventId) {
        return new Response(JSON.stringify({ success: true, message: 'Evento não encontrado no Google Calendar' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`[GoogleSync] Deletando evento no Google Calendar: ${googleEventId}`);
      const delResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!delResponse.ok && delResponse.status !== 404) {
        const errText = await delResponse.text();
        throw new Error(`Erro ao excluir evento no Google: ${errText}`);
      }

      return new Response(JSON.stringify({ success: true, action: 'delete', id: googleEventId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Ações: insert / update
    const dateMapping = formatDateTime(event.data_evento, event.horario_inicio, event.duracao_minutos);
    const eventUid = event.uid_externo || `event_${event.id}`;
    
    const googleEventPayload = {
      summary: `[PriceU$] ${event.cliente_nome} - ${event.tipo_evento || 'Compromisso'}`,
      description: `${event.observacoes || ''}\n\nID do Evento no PriceU$: ${eventUid}`,
      start: dateMapping.start,
      end: dateMapping.end,
    };

    if (action === 'insert') {
      console.log('[GoogleSync] Inserindo evento no Google Calendar:', googleEventPayload.summary);
      const insResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(googleEventPayload)
      });

      if (!insResponse.ok) {
        const errText = await insResponse.text();
        throw new Error(`Erro ao criar evento no Google: ${errText}`);
      }

      const createdEvent = await insResponse.json();
      return new Response(JSON.stringify({ success: true, action: 'insert', googleEventId: createdEvent.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'update') {
      if (!googleEventId && event.uid_externo) {
        googleEventId = await findGoogleEventIdByQuery(event.uid_externo);
      }
      if (!googleEventId) {
        // Se não achou, faz o insert como fallback para manter integridade
        console.log('[GoogleSync] Evento para atualização não localizado. Criando novo...');
        const insResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(googleEventPayload)
        });
        if (!insResponse.ok) throw new Error(await insResponse.text());
        const createdEvent = await insResponse.json();
        return new Response(JSON.stringify({ success: true, action: 'insert', googleEventId: createdEvent.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`[GoogleSync] Atualizando evento ${googleEventId} no Google Calendar:`, googleEventPayload.summary);
      const updResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(googleEventPayload)
      });

      if (!updResponse.ok) {
        const errText = await updResponse.text();
        throw new Error(`Erro ao atualizar evento no Google: ${errText}`);
      }

      const updatedEvent = await updResponse.json();
      return new Response(JSON.stringify({ success: true, action: 'update', googleEventId: updatedEvent.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error: any) {
    console.error('[GoogleSync] Erro fatal no Edge Function:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
