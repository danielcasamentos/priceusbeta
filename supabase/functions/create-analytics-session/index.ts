// supabase/functions/create-analytics-session/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.4/mod.ts';

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const analyticsPayloadSchema = z.object({
  template_id: z.string().uuid(),
  user_id: z.string().uuid(),
  session_id: z.string(),
  origem: z.string().optional(),
  referrer: z.string().optional().nullable(),
  user_agent: z.string().optional().nullable(),
}).passthrough();

serve(async (req) => {
  // Tratar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    const validation = analyticsPayloadSchema.safeParse(payload);
    if (!validation.success) {
      return new Response(JSON.stringify({ error: 'Payload de analytics inválido', details: validation.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { template_id, user_id, session_id, origem, referrer, user_agent } = validation.data;

    // Criar cliente admin para ignorar RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Preparar dados para inserção
    const analyticsData = {
      template_id,
      user_id,
      session_id,
      origem: origem || 'web',
      referrer,
      user_agent,
      ultima_etapa: 'inicio',
    };

    // Inserir sessão de analytics
    const { data, error } = await supabaseAdmin
      .from('analytics_orcamentos')
      .insert(analyticsData)
      .select()
      .single();

    if (error) throw error;

    // Retornar ID da sessão de analytics
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });

  } catch (err) {
    console.error('Erro na Edge Function create-analytics-session:', err);
    return new Response(String(err?.message ?? err), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
