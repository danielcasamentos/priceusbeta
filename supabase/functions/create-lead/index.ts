// supabase/functions/create-lead/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.23.4/mod.ts'

// Headers para permitir requisições de qualquer origem (CORS)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ✅ Schema para validação de AUTO-SAVE (produtos opcionais)
const leadPayloadSchemaAutoSave = z.object({
  templateId: z.string().uuid(),
  userId: z.string().uuid(),
  formData: z.record(z.any()).optional().default({}),
  orcamentoDetalhe: z.record(z.any()).optional().default({}),
  valorTotal: z.number().optional().default(0),
  status: z.string().optional().default('abandonado'),
  sessionId: z.string().optional(),
  urlOrigem: z.string().optional(),
  userAgent: z.string().optional(),
  tempoPreenchimento: z.number().optional(),
})

// ✅ Schema para validação FINAL (produtos obrigatórios)
const leadPayloadSchemaFinal = z.object({
  templateId: z.string().uuid(),
  userId: z.string().uuid(),
  formData: z.record(z.any()),
  orcamentoDetalhe: z.record(z.any()).optional().default({}),
  valorTotal: z.number(),
  status: z.string().optional(),
  sessionId: z.string().optional(),
  urlOrigem: z.string().optional(),
  userAgent: z.string().optional(),
  tempoPreenchimento: z.number().optional(),
})

serve(async (req) => {
  // Tratar requisição OPTIONS (pre-flight) para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    
    // 📝 Log do payload recebido para debug
    console.log('📥 Payload recebido:', JSON.stringify(payload, null, 2))

    // ✅ Detectar se é auto-save ou save final
    // Auto-save tem status 'abandonado' ou não tem produtos preenchidos
    const isAutoSave = payload.status === 'abandonado' || !payload.orcamentoDetalhe?.produtos || payload.orcamentoDetalhe.produtos.length === 0
    
    // ✅ PASSO 2: Validar o payload recebido usando o schema apropriado
    let validationResult
    if (isAutoSave) {
      console.log('🔄 Usando schema de AUTO-SAVE (produtos opcionais)')
      validationResult = leadPayloadSchemaAutoSave.safeParse(payload)
    } else {
      console.log('🔄 Usando schema FINAL (produtos obrigatórios)')
      validationResult = leadPayloadSchemaFinal.safeParse(payload)
    }

    if (!validationResult.success) {
      console.error('❌ Erro de Validação Zod:', JSON.stringify(validationResult.error.flatten(), null, 2))
      return new Response(JSON.stringify({ 
        error: 'Payload inválido', 
        details: validationResult.error.flatten(),
        isAutoSave 
      }), {
        status: 400, // Retorna 400 Bad Request
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('✅ Payload validado com sucesso')
    
    // Se a validação passou, usamos os dados seguros.
    const { templateId, userId, formData, orcamentoDetalhe, valorTotal, status, sessionId, urlOrigem, userAgent, tempoPreenchimento } = validationResult.data

    // 🔒 PONTO CRÍTICO: Criar um cliente Supabase com a service_role.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ✅ PASSO 3: Preparar o objeto para ser inserido na tabela 'leads'
    // Normalizar os dados do formulário para usar os nomes corretos dos campos
    const nomeCliente = formData?.nome_cliente || formData?.nomeCliente || formData?.name || ''
    const emailCliente = formData?.email_cliente || formData?.emailCliente || formData?.email || ''
    const telefoneCliente = formData?.telefone_cliente || formData?.telefoneCliente || formData?.phone || ''
    const dataEvento = formData?.data_evento || formData?.dataEvento || null
    const cidadeEvento = formData?.cidade_evento || formData?.cidadeEvento || formData?.city || ''
    const tipoEvento = formData?.tipo_evento || formData?.tipoEvento || ''

    const leadData = {
      template_id: templateId,
      user_id: userId,
      nome_cliente: nomeCliente,
      email_cliente: emailCliente,
      telefone_cliente: telefoneCliente,
      dados_formulario: formData,
      orcamento_detalhe: orcamentoDetalhe,
      valor_total: valorTotal,
    console.log('📥 Normalizando dados para inserção do lead...')

    // Se for auto-save, inserimos normalmente no profissional do template
    if (isAutoSave) {
      const leadData = {
        template_id: templateId,
        user_id: userId,
        nome_cliente: nomeCliente,
        email_cliente: emailCliente,
        telefone_cliente: telefoneCliente,
        dados_formulario: formData,
        orcamento_detalhe: orcamentoDetalhe,
        valor_total: valorTotal,
        status: 'abandonado',
        session_id: sessionId,
        url_origem: urlOrigem,
        user_agent: userAgent,
        tempo_preenchimento_segundos: tempoPreenchimento,
        data_evento: dataEvento,
        cidade_evento: cidadeEvento,
        tipo_evento: tipoEvento,
      }

      let existingLead = null
      if (sessionId) {
        const { data } = await supabaseAdmin
          .from('leads')
          .select('id')
          .eq('session_id', sessionId)
          .eq('status', 'abandonado')
          .maybeSingle()
        existingLead = data
      }

      let savedLead = null
      if (existingLead) {
        const { data, error } = await supabaseAdmin
          .from('leads')
          .update(leadData)
          .eq('id', existingLead.id)
          .select()
          .single()
        if (error) throw error
        savedLead = data
      } else {
        const { data, error } = await supabaseAdmin
          .from('leads')
          .insert(leadData)
          .select()
          .single()
        if (error) throw error
        savedLead = data
      }

      return new Response(JSON.stringify(savedLead), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      })
    }

    // --- SE FOR LEAD FINAL ---
    console.log('📥 Normalizando dados para inserção do lead final (collab unificado)...')
    const leadDataFinal = {
      template_id: templateId,
      user_id: userId,
      nome_cliente: nomeCliente,
      email_cliente: emailCliente,
      telefone_cliente: telefoneCliente,
      dados_formulario: formData,
      orcamento_detalhe: orcamentoDetalhe,
      valor_total: valorTotal,
      status: 'novo',
      session_id: sessionId,
      url_origem: urlOrigem,
      user_agent: userAgent,
      tempo_preenchimento_segundos: tempoPreenchimento,
      data_evento: dataEvento,
      cidade_evento: cidadeEvento,
      tipo_evento: tipoEvento,
    }

    console.log('📥 Inserindo lead final único na conta do dono do template...')
    const { data: insertedLead, error: insertErr } = await supabaseAdmin
      .from('leads')
      .insert(leadDataFinal)
      .select()
      .single()

    if (insertErr) {
      console.error('Erro ao inserir lead final:', insertErr)
      throw insertErr
    }

    // Notificação para o profissional (dono do template)
    const msg = `Você recebeu um novo lead de ${nomeCliente || 'um cliente'}!`
    const notificationPayload = {
      user_id: userId,
      type: 'new_lead',
      message: msg,
      related_id: insertedLead.id,
      link: '/dashboard/leads',
    }
    
    const { error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert(notificationPayload)
    if (notificationError) {
      console.error('Erro ao criar notificação de lead:', notificationError)
    }

    return new Response(JSON.stringify(insertedLead), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    })
  } catch (err) {
    console.error('Erro na Edge Function:', err)
    return new Response(
      JSON.stringify({
        message: String(err?.message ?? err),
        stack: err?.stack,
        error: err,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
