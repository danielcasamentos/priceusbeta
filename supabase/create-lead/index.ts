// supabase/functions/create-lead/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Headers para permitir requisições de qualquer origem (CORS)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Tratar requisição OPTIONS (pre-flight) para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const leadPayload = await req.json();

    // Validação básica para garantir que os dados essenciais estão presentes
    if (!leadPayload.user_id || !leadPayload.template_id) {
      throw new Error('user_id e template_id são obrigatórios.');
    }

    // 🔒 PONTO CRÍTICO: Criar um cliente Supabase com a service_role.
    // Isso ignora as políticas de RLS para a inserção, permitindo que
    // a função salve o lead em nome do visitante anônimo.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ✅ MAPEAMENTO CORRETO: Converter campos do frontend para o schema do banco de dados
    const leadData = {
      template_id: leadPayload.template_id,
      user_id: leadPayload.user_id,
      // Mapeamento de nomes de campos do frontend para o banco
      client_name: leadPayload.nome_cliente || leadPayload.nomeCliente || null,
      client_email: leadPayload.email_cliente || leadPayload.emailCliente || null,
      client_phone: leadPayload.telefone_cliente || leadPayload.telefoneCliente || null,
      tipo_evento: leadPayload.tipo_evento || leadPayload.tipoEvento || null,
      data_evento: leadPayload.data_evento || leadPayload.dataEvento || null,
      cidade_evento: leadPayload.cidade_evento || leadPayload.cidadeEvento || null,
      // valor_total (banco) <- valor_total (frontend)
      valor_total: leadPayload.valor_total || leadPayload.valorTotal || 0,
      // orcamento_detalhes (banco) <- orcamento_detalhe (frontend)
      orcamento_detalhes: leadPayload.orcamento_detalhe || leadPayload.orcamentoDetalhe || {},
      url_origem: leadPayload.url_origem || null,
      origem: leadPayload.origem || 'web',
      session_id: leadPayload.session_id || null,
      user_agent: leadPayload.user_agent || null,
      tempo_preenchimento_segundos: leadPayload.tempo_preenchimento_segundos || null,
      status: leadPayload.status || 'novo',
      // Campos LGPD
      lgpd_consent_timestamp: leadPayload.lgpd_consent_timestamp || null,
      lgpd_consent_text: leadPayload.lgpd_consent_text || null,
    };

    // Inserir os dados na tabela 'leads'
    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert(leadData)
      .select()
      .single();

    if (error) {
      // Se houver um erro no banco de dados (ex: tipo de dado errado), ele será lançado aqui.
      console.error('Erro do Supabase Admin ao criar lead:', error);
      throw error;
    }

    // ✅ ETAPA 2: Criar a notificação para o usuário (fotógrafo)
    if (data) {
      const notificationPayload = {
        user_id: leadPayload.user_id, // O ID do fotógrafo
        type: 'new_lead',
        message: `Você recebeu um novo lead de ${leadPayload.nome_cliente || leadPayload.nomeCliente || 'um cliente'}!`,
        related_id: data.id, // ID do lead recém-criado
        link: '/dashboard/leads', // Link para a página de leads
      };

      const { error: notificationError } = await supabaseAdmin
        .from('notifications')
        .insert(notificationPayload);

      if (notificationError) {
        // Log do erro de notificação, mas não interrompe o fluxo.
        // O lead foi criado, que é o mais importante.
        console.error('Erro ao criar notificação:', notificationError);
      }
    }

    // Retornar os dados do lead salvo com sucesso
    return new Response(JSON.stringify({ lead: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    // Capturar qualquer outro erro e retornar uma resposta de erro
    console.error('Erro na Edge Function:', err);
    return new Response(String(err?.message ?? err), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
