// supabase/functions/create-lead/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.23.4/mod.ts'

// Headers para permitir requisições de qualquer origem (CORS)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ✅ PASSO 1: Definir o schema de validação com Zod.
// Este schema deve espelhar EXATAMENTE o payload enviado pelo frontend.
const leadPayloadSchema = z.object({
  templateId: z.string().uuid(),
  userId: z.string().uuid(),
  formData: z
    .record(z.any())
    .pipe(
      z
        .object({
          nome_cliente: z.string().min(1, { message: 'Nome do cliente é obrigatório' }),
          email_cliente: z.string().email({ message: 'Email do cliente inválido' }),
          telefone_cliente: z.string().optional().nullable(),
        })
        .passthrough()
    ),
  orcamentoDetalhe: z.object({
    // 🔥 PONTO CRÍTICO: Espera um ARRAY de produtos, não um objeto.
    produtos: z
      .array(
        z.object({
          produto_id: z.string().uuid(),
          quantidade: z.number().int().min(1),
        })
      )
      .min(1, { message: 'Pelo menos um produto deve ser selecionado' }),
    forma_pagamento_id: z.string().uuid().optional().nullable(),
    priceBreakdown: z.record(z.any()).optional(), // Aceita o breakdown, mas não valida profundamente
  }).passthrough(),
  valorTotal: z.number(),
})

serve(async (req) => {
  // Tratar requisição OPTIONS (pre-flight) para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()

    // ✅ PASSO 2: Validar o payload recebido.
    const validationResult = leadPayloadSchema.safeParse(payload)

    if (!validationResult.success) {
      console.error('Erro de Validação Zod:', validationResult.error.flatten())
      return new Response(JSON.stringify({ error: 'Payload inválido', details: validationResult.error.flatten() }), {
        status: 400, // Retorna 400 Bad Request
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Se a validação passou, usamos os dados seguros.
    const { templateId, userId, formData, orcamentoDetalhe, valorTotal } = validationResult.data

    // 🔒 PONTO CRÍTICO: Criar um cliente Supabase com a service_role.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ✅ PASSO 3: Preparar o objeto para ser inserido na tabela 'leads'
    const leadData = {
      template_id: templateId,
      user_id: userId,
      nome_cliente: formData.nome_cliente,
      email_cliente: formData.email_cliente,
      telefone_cliente: formData.telefone_cliente,
      dados_formulario: formData,
      orcamento_detalhe: orcamentoDetalhe,
      valor_total: valorTotal,
      status: 'novo',
    }

    // Inserir os dados na tabela 'leads'
    const { data: newLead, error: insertError } = await supabaseAdmin.from('leads').insert(leadData).select().single()

    if (insertError) throw insertError

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
    return new Response(String(err?.message ?? err), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
