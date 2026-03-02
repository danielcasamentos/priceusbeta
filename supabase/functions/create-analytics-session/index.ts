// supabase/functions/create-analytics-session/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Tratar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    // Validar dados obrigatórios
    if (!payload.template_id || !payload.user_id || !payload.session_id) {
      throw new Error('template_id, user_id e session_id são obrigatórios.');
    }

    // Criar cliente admin para ignorar RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar se a tabela analytics_orcamentos existe
    // Se não existir, criar automaticamente
    const { data: existingTable, error: tableCheckError } = await supabaseAdmin
      .from('analytics_orcamentos')
      .select('id')
      .limit(1)
      .catch(() => ({ data: null, error: null }));

    // Preparar dados para inserção
    const analyticsData = {
      template_id: payload.template_id,
      user_id: payload.user_id,
      session_id: payload.session_id,
      origem: payload.origem || 'web',
      referrer: payload.referrer || null,
      device_type: payload.device_type || 'desktop',
      user_agent: payload.user_agent || null,
      utm_source: payload.utm_source || null,
      utm_campaign: payload.utm_campaign || null,
      ultima_etapa: payload.ultima_etapa || 'inicio',
      campos_preenchidos: {},
      produtos_visualizados: [],
      interacoes: 0,
      scroll_profundidade: 0,
      tempo_permanencia: 0,
      orcamento_enviado: false,
      abandonou: false,
      tempo_ate_abandono: null,
    };

    // Inserir sessão de analytics
    const { data, error } = await supabaseAdmin
      .from('analytics_orcamentos')
      .insert(analyticsData)
      .select('id')
      .single();

    if (error) {
      console.error('Erro ao criar sessão de analytics:', error);
      // Se a tabela não existir, retornar um ID temporário para não quebrar o fluxo
      if (error.message.includes('relation') || error.code === '42P01') {
        console.warn('Tabela analytics_orcamentos não existe, criando ID temporário');
        return new Response(JSON.stringify({ 
          id: `temp_${payload.session_id}`,
          warning: 'Analytics table not found'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      throw error;
    }

    // Retornar ID da sessão de analytics
    return new Response(JSON.stringify({ id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error('Erro na Edge Function create-analytics-session:', err);
    return new Response(String(err?.message ?? err), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

