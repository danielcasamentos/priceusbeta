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
    const { action, event, eventId, timeMin } = body;

    if (!action || !['insert', 'update', 'delete', 'list'].includes(action)) {
      throw new Error('Ação inválida. Ações permitidas: insert, update, delete, list')
    }

    // 1. Obter credenciais do Google do perfil do usuário
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('google_auth_data, nome_profissional')
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
    // Prioridade: GOOGLE_CLIENT_ID (secret manual) > SUPABASE_AUTH_EXTERNAL (auto-injetado)
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID') || Deno.env.get('SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') || Deno.env.get('SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET');

    console.log(`[GoogleSync] user_id: ${user.id}`);
    console.log(`[GoogleSync] client_id usado: ${clientId ? clientId.substring(0, 20) + '...' : 'NAO ENCONTRADO'}`);
    console.log(`[GoogleSync] refresh_token presente: ${!!googleAuthData.refresh_token}`);
    console.log(`[GoogleSync] refresh_token inicio: ${googleAuthData.refresh_token?.substring(0, 10)}`);

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
      console.error(`[GoogleSync] client_id completo: ${clientId}`);
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

    // Helper: Normaliza nome e extrai tag canônica para evitar duplicidades (mesmo nome + mesma tag ou tags diferentes)
    const parseCanonicalEvent = (rawSummary: string, rawTag?: string | null, rawDesc?: string | null) => {
      let text = (rawSummary || '').trim();
      const hasPriceusPrefix = /^\[priceu\$\]/i.test(text);
      text = text.replace(/^(\[priceu\$\]\s*)+/i, '').trim();
      text = text.replace(/^evento\s+de\s+/i, '').trim();
      // Remove datas no final ex: " - 15/11/2026"
      text = text.replace(/\s*-\s*\d{2}\/\d{2}\/\d{4}\s*$/, '').trim();

      let extractedTag = (rawTag || '').trim();
      let baseName = text;

      const dashParts = text.split(' - ').map(p => p.trim()).filter(Boolean);
      if (dashParts.length >= 2) {
        baseName = dashParts[0].replace(/^evento\s+de\s+/i, '').trim();
        const tailTag = dashParts[dashParts.length - 1];
        if (!extractedTag || /^(evento|compromisso)$/i.test(extractedTag)) {
          extractedTag = tailTag;
        }
      }

      if (!extractedTag) extractedTag = 'Evento';

      const normalizeStr = (s: string) =>
        s
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .trim();

      const canonicalName = normalizeStr(baseName || rawSummary || 'evento');
      const isWorkflow = (rawDesc || '').includes('workflow_') || /^tarefa:/i.test(baseName);
      const canonicalKey = isWorkflow
        ? `wf:${canonicalName}:${normalizeStr(extractedTag)}`
        : `ev:${canonicalName}`;

      return {
        baseName: baseName || 'Cliente',
        extractedTag,
        canonicalName,
        canonicalKey,
        hasPriceusPrefix,
      };
    };

    const spFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const extractGoogleItemDateAndTime = (item: any) => {
      let dataStr = '';
      let horarioInicio: string | null = null;
      let duracaoMinutos: number | null = null;

      if (item.start?.date) {
        dataStr = item.start.date;
      } else if (item.start?.dateTime) {
        const startObj = new Date(item.start.dateTime);
        const parts = spFormatter.formatToParts(startObj);
        const y = parts.find(p => p.type === 'year')?.value;
        const m = parts.find(p => p.type === 'month')?.value;
        const d = parts.find(p => p.type === 'day')?.value;
        const hr = parts.find(p => p.type === 'hour')?.value;
        const min = parts.find(p => p.type === 'minute')?.value;
        dataStr = `${y}-${m}-${d}`;
        const normHr = hr === '24' ? '00' : hr;
        horarioInicio = `${normHr}:${min}:00`;

        if (item.end?.dateTime) {
          const endObj = new Date(item.end.dateTime);
          const diffMin = Math.round((endObj.getTime() - startObj.getTime()) / 60000);
          if (diffMin > 0) duracaoMinutos = diffMin;
        }
      }
      return { dataStr, horarioInicio, duracaoMinutos };
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

    // Helper: Busca eventos do mesmo dia no Google Calendar com a mesma identidade canônica (evita duplicatas)
    const findMatchingEventsOnDate = async (dataEvento: string, targetCanonicalKey: string): Promise<any[]> => {
      try {
        const dayStart = `${dataEvento}T00:00:00-03:00`;
        const dayEnd = `${dataEvento}T23:59:59-03:00`;
        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(dayStart)}&timeMax=${encodeURIComponent(dayEnd)}&singleEvents=true&maxResults=100`;
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) return [];
        const data = await response.json();
        const items = Array.isArray(data.items) ? data.items : [];
        return items.filter((item: any) => {
          if (item.status === 'cancelled') return false;
          const { dataStr } = extractGoogleItemDateAndTime(item);
          if (dataStr !== dataEvento) return false;
          const parsed = parseCanonicalEvent(item.summary || '', null, item.description || '');
          return parsed.canonicalKey === targetCanonicalKey;
        });
      } catch {
        return [];
      }
    };

    // 4. Executar operações
    let googleEventId = eventId;

    if (action === 'list') {
      const minDate = timeMin || new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const listUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(minDate)}&singleEvents=true&maxResults=250&orderBy=startTime`;
      const listResponse = await fetch(listUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!listResponse.ok) {
        const errText = await listResponse.text();
        throw new Error(`Erro ao listar eventos do Google Calendar: ${errText}`);
      }

      const listData = await listResponse.json();
      const rawItems = Array.isArray(listData.items) ? listData.items : [];

      const mappedRaw = rawItems
        .filter((item: any) => item.status !== 'cancelled' && (item.start?.date || item.start?.dateTime))
        .map((item: any) => {
          const { dataStr, horarioInicio, duracaoMinutos } = extractGoogleItemDateAndTime(item);
          const parsed = parseCanonicalEvent(item.summary || '', item.location || null, item.description || '');

          return {
            rawId: item.id,
            uid_externo: `gcal_${item.id}`,
            data: dataStr,
            nome: item.summary || 'Evento Google Calendar',
            baseName: parsed.baseName,
            tipo: parsed.extractedTag || item.location || 'evento',
            canonicalKey: parsed.canonicalKey,
            hasPriceusPrefix: parsed.hasPriceusPrefix,
            horario_inicio: horarioInicio,
            duracao_minutos: duracaoMinutos,
            description: item.description || '',
          };
        });

      // Deduplicar eventos no Google Calendar que tenham a mesma data + mesmo nome canônico (mesma tag ou tags diferentes)
      const groups = new Map<string, typeof mappedRaw>();
      for (const ev of mappedRaw) {
        const groupKey = `${ev.data}::${ev.canonicalKey}`;
        const list = groups.get(groupKey) || [];
        list.push(ev);
        groups.set(groupKey, list);
      }

      const deduplicatedEvents: any[] = [];
      let deduplicatedInGoogle = 0;

      for (const [, group] of groups.entries()) {
        if (group.length === 1) {
          deduplicatedEvents.push(group[0]);
          continue;
        }

        // Ordena para manter a cópia mais completa (prioriza [PriceU$], tag específica, horário definido)
        group.sort((a, b) => {
          const score = (x: typeof group[0]) =>
            (x.hasPriceusPrefix ? 4 : 0) +
            (x.tipo && !/^(evento|compromisso)$/i.test(x.tipo) ? 2 : 0) +
            (x.horario_inicio ? 1 : 0);
          return score(b) - score(a);
        });

        const keeper = group[0];
        deduplicatedEvents.push(keeper);

        // Exclui as cópias duplicadas diretamente no Google Calendar
        for (let i = 1; i < group.length; i++) {
          const dup = group[i];
          try {
            console.log(`[GoogleSync] Removendo duplicata no Google Calendar: ${dup.nome} (${dup.data}) ID=${dup.rawId}`);
            const delRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${dup.rawId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (delRes.ok || delRes.status === 404) {
              deduplicatedInGoogle++;
            }
          } catch (delErr) {
            console.warn('[GoogleSync] Falha ao remover duplicata no Google:', delErr);
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        action: 'list',
        events: deduplicatedEvents,
        deduplicatedInGoogle
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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
    const parsedIncoming = parseCanonicalEvent(event.cliente_nome || '', event.tipo_evento || 'Compromisso', eventUid);

    const googleEventPayload = {
      summary: `[PriceU$] ${parsedIncoming.baseName} - ${parsedIncoming.extractedTag || 'Compromisso'}`,
      description: `${event.observacoes || ''}\n\nID do Evento no PriceU$: ${eventUid}`,
      start: dateMapping.start,
      end: dateMapping.end,
    };

    if (action === 'insert') {
      // Verifica se já existe evento no mesmo dia com o mesmo nome canônico no Google Calendar (mesma tag ou tag diferente)
      const sameDayMatches = await findMatchingEventsOnDate(event.data_evento, parsedIncoming.canonicalKey);
      if (sameDayMatches.length > 0) {
        const keeperMatch = sameDayMatches[0];
        console.log(`[GoogleSync] Evento equivalente já existe no Google (${keeperMatch.id}). Atualizando em vez de duplicar.`);
        // Remove eventuais cópias extras no mesmo dia
        for (let i = 1; i < sameDayMatches.length; i++) {
          await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${sameDayMatches[i].id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }).catch(() => {});
        }
        const updResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${keeperMatch.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(googleEventPayload)
        });
        if (updResponse.ok) {
          const updatedEvent = await updResponse.json();
          return new Response(JSON.stringify({ success: true, action: 'update_existing', googleEventId: updatedEvent.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

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
        const sameDayMatches = await findMatchingEventsOnDate(event.data_evento, parsedIncoming.canonicalKey);
        if (sameDayMatches.length > 0) {
          googleEventId = sameDayMatches[0].id;
          for (let i = 1; i < sameDayMatches.length; i++) {
            await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${sameDayMatches[i].id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${accessToken}` }
            }).catch(() => {});
          }
        }
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
