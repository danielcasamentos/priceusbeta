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
  orcamentoDetalhe: z.object({
    produtos: z
      .array(
        z.object({
          produto_id: z.string().uuid(),
          quantidade: z.number().int().min(1),
        })
      )
      .min(1, { message: 'Pelo menos um produto deve ser selecionado' }),
    forma_pagamento_id: z.string().uuid().optional().nullable(),
    priceBreakdown: z.record(z.any()).optional(),
  }),
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
      status: status || 'novo', // Usa o status enviado ou 'novo' como padrão
      session_id: sessionId,
      url_origem: urlOrigem,
      user_agent: userAgent,
      tempo_preenchimento_segundos: tempoPreenchimento,
      data_evento: dataEvento,
      cidade_evento: cidadeEvento,
      tipo_evento: tipoEvento,
    }

    console.log('📤 Preparando dados do lead:', JSON.stringify(leadData, null, 2))

    // Verificar se já existe um lead com o mesmo session_id para evitar duplicatas
    let newLead = null
    let insertError = null
    
    if (sessionId) {
      // Primeiro tenta encontrar um lead existente com o mesmo session_id
      const { data: existingLead } = await supabaseAdmin
        .from('leads')
        .select('id')
        .eq('session_id', sessionId)
        .maybeSingle()
      
      if (existingLead) {
        console.log('🔄 Lead existente encontrado, atualizando...')
        // Atualiza o lead existente
        const { data: updatedLead, error: updateError } = await supabaseAdmin
          .from('leads')
          .update(leadData)
          .eq('id', existingLead.id)
          .select()
          .single()
        
        newLead = updatedLead
        insertError = updateError
      } else {
        // Insere um novo lead
        console.log('🆕 Criando novo lead...')
        const { data: insertedLead, error: insertErr } = await supabaseAdmin
          .from('leads')
          .insert(leadData)
          .select()
          .single()
        
        newLead = insertedLead
        insertError = insertErr
      }
    } else {
      // Se não tem session_id, insere normalmente
      const { data: insertedLead, error: insertErr } = await supabaseAdmin
        .from('leads')
        .insert(leadData)
        .select()
        .single()
      
      newLead = insertedLead
      insertError = insertErr
    }

    if (insertError) {
      console.error('❌ Erro ao salvar lead:', JSON.stringify(insertError, null, 2))
      throw insertError
    }
    
    console.log('✅ Lead salvo com sucesso:', newLead?.id)

    // ✅ ETAPA 2: Criar a notificação para o usuário (fotógrafo)
    if (newLead) {
      const notificationPayload = {
        user_id: userId, // O ID do fotógrafo
        type: 'new_lead',
        message: `Você recebeu um novo lead de ${formData.nome_cliente || 'um cliente'}!`,
        related_id: newLead.id, // ID do lead recém-criado
        link: '/dashboard/leads', // Link para a página de leads
      }

      const { error: notificationError } = await supabaseAdmin.from('notifications').insert(notificationPayload)

      if (notificationError) console.error('Erro ao criar notificação (não fatal):', notificationError)
    }

    // Retornar os dados do lead salvo com sucesso
    return new Response(JSON.stringify(newLead), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // 201 Created
    })
  } catch (err) {
    // Capturar qualquer outro erro e retornar uma resposta de erro
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
