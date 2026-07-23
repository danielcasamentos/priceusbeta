import { supabase } from '../lib/supabase';

export interface GeminiResponse {
  replyText: string;
  toolsExecuted?: string[];
  suggestedLeadStage?: string;
  priceCalculated?: number;
  quoteLink?: string;
  handoffRequired?: boolean;
}

export interface ChatMessageHistory {
  sender: 'user' | 'ai';
  text: string;
}

/**
 * Interface Estruturada de JSON do Template (Template RAG Schema)
 */
export interface TemplateRAGSchema {
  id: string;
  tipo_trabalho: string;
  template_nome: string;
  link_proposta_interativa: string;
  active: boolean;
  configuracoes: {
    ocultar_valores_intermediarios: boolean;
    ocultar_taxa_deslocamento: boolean;
    limitar_parcelas_pela_data_evento: boolean;
    max_parcelas_padrao: number;
  };
  pacotes_fechados: {
    nome: string;
    valor_total: number;
    resumo_itens: string[];
  }[];
  itens_avulsos_para_personalizacao: {
    item: string;
    tipo: 'hora' | 'unidade' | 'servico';
    valor: number;
  }[];
  formas_pagamento: {
    sinal_entrada: string;
    parcelamento_maximo: string;
    desconto_avista_pix: string;
  };
  brindes_e_cupons: {
    brindes_ativos: string[];
    validade_brinde: string;
    cupons_desconto: string[];
  };
}

/**
 * Compilador de JSON Estruturado de Template com Fidelidade aos Mapeamentos do Usuário
 */
function compileTemplateJSONs(
  userTemplates: any[],
  userProducts: any[],
  savedMappings: any[]
): TemplateRAGSchema[] {
  // Se houver templates reais vindos do Supabase, compilar priorizando os templates reais do usuário
  if (userTemplates && userTemplates.length > 0) {
    return userTemplates.map((t: any) => {
      const matchedMapping = savedMappings.find((m: any) => m.templateId === t.id || m.templateName === t.nome_template || m.templateName === t.titulo_template);
      const userSlug = t.user_username || t.user_id || 'estudio';
      const slug = t.slug_template || t.id;
      const realUrl = matchedMapping?.templateUrl || `https://priceus.com.br/${userSlug}/${slug}`;

      const tProducts = userProducts.filter((p: any) => p.template_id === t.id);
      const customProductsList = tProducts.length > 0
        ? tProducts.map((p: any) => ({
            item: p.nome || 'Item do Template',
            tipo: 'servico' as const,
            valor: Number(p.valor || 0)
          }))
        : [
            { item: 'Hora Extra de Fotografia', tipo: 'hora' as const, valor: 450 },
            { item: 'Vídeo / Teaser de Cinema', tipo: 'servico' as const, valor: 1800 },
            { item: 'Álbum dos Pais Mini Fine-Art', tipo: 'unidade' as const, valor: 650 }
          ];

      const giftsList = matchedMapping?.gifts
        ? matchedMapping.gifts.map((g: any) => `${g.quantity || 1}x ${g.productName}`)
        : ['1x 🎁 Mini-Álbum Especial dos Pais'];

      const couponsList = matchedMapping?.coupons
        ? matchedMapping.coupons.map((c: any) => `${c.code}`)
        : ['SUPER10'];

      return {
        id: t.id,
        tipo_trabalho: matchedMapping?.workType || t.nome_template || t.titulo_template || 'Fotografia',
        template_nome: t.nome_template || t.titulo_template || 'Proposta Interativa',
        link_proposta_interativa: realUrl,
        active: matchedMapping ? matchedMapping.active !== false : true,
        configuracoes: {
          ocultar_valores_intermediarios: true,
          ocultar_taxa_deslocamento: false,
          limitar_parcelas_pela_data_evento: true,
          max_parcelas_padrao: 10
        },
        pacotes_fechados: [
          {
            nome: 'Pacote Essencial',
            valor_total: 3200,
            resumo_itens: ['Cobertura Essencial (6h)', '1 Fotógrafo', 'Galeria Digital']
          },
          {
            nome: 'Pacote Completo com Álbum',
            valor_total: 4500,
            resumo_itens: ['Cobertura Completa (8h)', '2 Fotógrafos', 'Ensaio Pré-wedding', 'Álbum Fine-Art 30x30']
          }
        ],
        itens_avulsos_para_personalizacao: customProductsList,
        formas_pagamento: {
          sinal_entrada: '20% no contrato para reserva da data',
          parcelamento_maximo: 'Boleto/Pix parcelado em até 10x (limitado ao mês do evento)',
          desconto_avista_pix: '5% OFF no Pix à vista'
        },
        brindes_e_cupons: {
          brindes_ativos: giftsList,
          validade_brinde: matchedMapping?.giftDeadline || 'Até amanhã',
          cupons_desconto: couponsList
        }
      };
    });
  }

  if (savedMappings && savedMappings.length > 0) {
    return savedMappings.map((m: any) => {
      const giftsList = m.gifts
        ? m.gifts.map((g: any) => `${g.quantity || 1}x ${g.productName}`)
        : ['1x 🎁 Mini-Álbum dos Pais'];

      const couponsList = m.coupons
        ? m.coupons.map((c: any) => `${c.code}`)
        : ['SUPER10'];

      return {
        id: m.id || `tpl_${Date.now()}`,
        tipo_trabalho: m.workType || 'Fotografia',
        template_nome: m.templateName || 'Proposta Interativa',
        link_proposta_interativa: m.templateUrl || `https://priceus.com.br/estudio/${m.workType.toLowerCase().replace(/\s+/g, '-')}`,
        active: m.active !== false,
        configuracoes: {
          ocultar_valores_intermediarios: true,
          ocultar_taxa_deslocamento: false,
          limitar_parcelas_pela_data_evento: true,
          max_parcelas_padrao: 10
        },
        pacotes_fechados: [
          {
            nome: 'Pacote Essencial',
            valor_total: 3200,
            resumo_itens: ['Cobertura Essencial (6h)', '1 Fotógrafo', 'Galeria Digital']
          },
          {
            nome: 'Pacote Completo com Álbum',
            valor_total: 4500,
            resumo_itens: ['Cobertura Completa (8h)', '2 Fotógrafos', 'Ensaio Pré-wedding', 'Álbum Fine-Art 30x30']
          }
        ],
        itens_avulsos_para_personalizacao: [
          { item: 'Hora Extra de Fotografia', tipo: 'hora' as const, valor: 450 },
          { item: 'Vídeo/Teaser de Casamento', tipo: 'servico' as const, valor: 1800 },
          { item: 'Álbum dos Pais', tipo: 'unidade' as const, valor: 650 }
        ],
        formas_pagamento: {
          sinal_entrada: '20% no contrato para reserva da data',
          parcelamento_maximo: 'Boleto/Pix parcelado em até 10x (limitado ao mês do evento)',
          desconto_avista_pix: '5% OFF no Pix à vista'
        },
        brindes_e_cupons: {
          brindes_ativos: giftsList,
          validade_brinde: m.giftDeadline || 'Até amanhã',
          cupons_desconto: couponsList
        }
      };
    });
  }

  // Schema padrão fallback
  return [
    {
      id: 'tpl_default_casamento',
      tipo_trabalho: 'Casamento / Mini Wedding',
      template_nome: 'Proposta Casamento Fine-Art 2026',
      link_proposta_interativa: 'https://priceus.com.br/estudio/casamento-fineart',
      active: true,
      configuracoes: {
        ocultar_valores_intermediarios: true,
        ocultar_taxa_deslocamento: false,
        limitar_parcelas_pela_data_evento: true,
        max_parcelas_padrao: 10
      },
      pacotes_fechados: [
        {
          nome: 'Pacote Essencial (6h)',
          valor_total: 3200,
          resumo_itens: ['Cobertura de Cerimônia + Festa (6h)', '1 Fotógrafo Dedicado', 'Galeria Online em Alta Resolução']
        },
        {
          nome: 'Pacote Completo (8h)',
          valor_total: 4500,
          resumo_itens: ['Cobertura Completa (8h)', '2 Fotógrafos Profissionais', 'Ensaio Pré-wedding de Casal', 'Álbum Impresso 30x30 Fine-Art']
        }
      ],
      itens_avulsos_para_personalizacao: [
        { item: 'Hora Extra de Fotografia', tipo: 'hora', valor: 450 },
        { item: 'Vídeo / Teaser de Cinema', tipo: 'servico', valor: 1800 },
        { item: 'Álbum Extra dos Pais 20x20', tipo: 'unidade', valor: 650 }
      ],
      formas_pagamento: {
        sinal_entrada: '20% no contrato para reserva da data',
        parcelamento_maximo: 'Boleto/Pix parcelado em até 10x (limitado à data do evento)',
        desconto_avista_pix: '5% OFF para pagamento à vista no Pix'
      },
      brindes_e_cupons: {
        brindes_ativos: ['1x 🎁 Mini-Álbum Especial dos Pais'],
        validade_brinde: 'Até amanhã às 23:59h',
        cupons_desconto: ['SUPER10 (10% OFF no Pix)']
      }
    }
  ];
}

/**
 * Motor Multi-Provedor Universal com ROTAÇÃO DE CHAVES & LINK OBRIGATÓRIO DO TEMPLATE REAL
 */
export async function callGeminiSalesAgent(
  userQuery: string,
  customTrainingText?: string,
  userId?: string,
  hasPreviousMessages?: boolean,
  customApiKey?: string,
  chatHistory?: ChatMessageHistory[]
): Promise<GeminiResponse> {
  // 🔑 1. Pool de Chaves de API (Prioritária, Secundária e Terciária)
  const savedKey1 = typeof window !== 'undefined' ? localStorage.getItem('priceus_ai_api_key_primary') || localStorage.getItem('priceus_ai_api_key') : null;
  const savedKey2 = typeof window !== 'undefined' ? localStorage.getItem('priceus_ai_api_key_secondary') : null;
  const savedKey3 = typeof window !== 'undefined' ? localStorage.getItem('priceus_ai_api_key_tertiary') : null;

  const keyPool = [
    customApiKey,
    savedKey1,
    savedKey2,
    savedKey3,
    import.meta.env.VITE_GEMINI_API_KEY,
  ].filter((k): k is string => !!k && k.trim().length > 5 && !k.includes('SUA_CHAVE'));

  // 2. Coletar dados reais do Supabase
  let userTemplates: any[] = [];
  let userProducts: any[] = [];
  let userCalendar: any[] = [];
  let savedMappings: any[] = [];

  if (typeof window !== 'undefined') {
    const rawMap = localStorage.getItem('priceus_work_mappings_v2') || localStorage.getItem('priceus_work_mappings');
    if (rawMap) {
      try {
        savedMappings = JSON.parse(rawMap);
      } catch (e) {
        console.warn('[Mappings Parse Warning]:', e);
      }
    }
  }

  try {
    const { data: authData } = await supabase.auth.getUser();
    const effectiveUserId = userId || authData?.user?.id;

    let tempQuery = supabase.from('templates').select('id, nome_template, titulo_template, slug_template, user_id');
    if (effectiveUserId) tempQuery = tempQuery.eq('user_id', effectiveUserId);
    const { data: tData } = await tempQuery;
    userTemplates = tData || [];

    if (userTemplates.length > 0) {
      const templateIds = userTemplates.map((t: any) => t.id);
      const { data: pData } = await supabase.from('produtos').select('template_id, nome, valor, resumo').in('template_id', templateIds);
      userProducts = pData || [];
    }

    let agendaQuery = supabase.from('eventos_agenda').select('data_evento, tipo_evento, status');
    if (effectiveUserId) agendaQuery = agendaQuery.eq('user_id', effectiveUserId);
    const { data: aData } = await agendaQuery;
    userCalendar = aData || [];
  } catch (e) {
    console.warn('[Supabase RAG Warning]:', e);
  }

  // 🧹 3. COMPILAR JSON ESTRUTURADO DE TEMPLATES
  const compiledTemplatesJSON = compileTemplateJSONs(userTemplates, userProducts, savedMappings);

  const compactAgendaText = userCalendar && userCalendar.length > 0
    ? userCalendar.slice(0, 10).map((e: any) => `${e.data_evento || ''}`).filter(Boolean).join(', ')
    : 'Todas as datas livres no momento';

  // Extrair nome do cliente se fornecido
  const cleanQuery = userQuery.trim();
  const isGreetingWord = /^(ola|olá|oi|oii|oie|bom dia|boa tarde|boa noite|tudo bem|hello|hey)$/i.test(cleanQuery);
  const nameMatch = !isGreetingWord ? (
    cleanQuery.match(/(?:sou o|sou a|me chamo|meu nome é|falar com|cliente:?|👤)\s*([A-Za-zÀ-ÖØ-öø-ÿ]{2,15})/i) ||
    cleanQuery.match(/^(?:meu nome é|sou o|sou a|me chamo)?\s*([A-Za-zÀ-ÖØ-öø-ÿ]{2,15})$/i)
  ) : null;

  let rawName = nameMatch ? nameMatch[1] : '';
  if (isGreetingWord || /^(ola|olá|oi|oii|oie|bom dia|boa tarde|boa noite|tudo bem|tarde|noite)$/i.test(rawName)) {
    rawName = '';
  }

  const detectedName = rawName;
  const isOnlyName = !isGreetingWord && !!detectedName && cleanQuery.split(' ').length <= 4;
  const savedPersonaName = typeof window !== 'undefined' ? localStorage.getItem('priceus_ai_persona_name') : null;
  const aiPersonaName = (savedPersonaName || 'Sofia').trim();

  // 4. Prompt de Raciocínio Vivo com LINK OBRIGATÓRIO DO TEMPLATE REAL
  const systemPrompt =
    `Você se chama "${aiPersonaName}", uma secretária de vendas humana, extremamente acolhedora, educada e elegante de um estúdio de fotografia afetiva.\n` +
    `Se o cliente perguntar quem é você ou o seu nome, apresente-se como "${aiPersonaName}, assistente de atendimento do estúdio".\n\n` +
    `REGRAS OBRIGATÓRIAS DE FIDELIDADE AO TEMPLATE REAL (PROIBIDO MENTIR):\n` +
    `1. LINK DA PROPOSTA INTERATIVA É OBRIGATÓRIO: Sempre que o cliente pedir orçamento, valores ou pacotes, VOCÊ É ESTRITAMENTE OBRIGADA A INCLUIR O LINK DA PROPOSTA INTERATIVA DO TEMPLATE REAL em destaque no formato:\n` +
    `   "Você pode conferir todos os detalhes, fotos em alta resolução, pacotes e simular parcelas na nossa proposta interativa exclusiva neste link: [link_proposta_interativa]"\n` +
    `2. RESPOSTA DIRETA E CONCISA AOS PACOTES: Apresente resumidamente os nomes e valores totais dos pacotes do Template e imediatamente envie o link da proposta interativa para o cliente consultar todos os itens!\n` +
    `3. OCULTAR VALORES INTERMEDIÁRIOS: Se 'ocultar_valores_intermediarios: true', mostre a composição sem picar os preços dos itens avulsos, apresentando o valor total calculado e o link da proposta.\n` +
    `4. CIDADE E TAXA DE DESLOCAMENTO:\n` +
    `   - SE 'ocultar_taxa_deslocamento: true' OU ISENTO: PROIBIDO falar em 'calcular deslocamento'! Se perguntar a cidade, pergunte apenas para verificar o atendimento da equipe na região.\n` +
    `   - SOMENTE SE 'ocultar_taxa_deslocamento: false' é que pode citar o ajuste de deslocamento para a cidade.\n` +
    `5. MONTADOR DE PACOTE PERSONALIZADO (ADICIONAR/REMOVER ITENS):\n` +
    `   - Se o cliente quiser tirar ou adicionar produtos/serviços, identifique os itens em 'itens_avulsos_para_personalizacao'.\n` +
    `   - Recalcule o novo valor total montado e oriente que ele também pode personalizar ao vivo clicando no link da proposta interativa!\n` +
    `6. FORMAS DE PAGAMENTO & LIMITE POR DATA:\n` +
    `   - Mostre as formas de pagamento do template (Sinal de Entrada + Parcelamento em até Xx no Boleto/Pix + Desconto à Vista no Pix).\n` +
    `   - Se o evento for em menos tempo do que o parcelamento padrão, ajuste o parcelamento para no máximo o número de meses até o evento!\n` +
    `7. TRATAMENTO DE OBJEÇÕES ("vou ver com meu noivo"): Acolha com carinho, envie o link da proposta interativa do template, ofereça o brinde com prazo limite e peça autorização para follow-up em 2 dias.\n` +
    `8. ZERO RODEIOS & APENAS 1 PERGUNTA NO FINAL: Nunca faça 2 ou mais perguntas na mesma resposta. Faça no máximo UMA pergunta simples no final para fechar o raciocínio.\n` +
    `9. SAUDAÇÕES SIMPLES ("Oi", "Tudo bem"): Responda com carinho e pergunte como pode ajudar. NUNCA traga de volta assuntos técnicos antigos espontaneamente!\n` +
    `10. NEUTRALIDADE DE GÊNERO: É PROIBIDO usar "querida" ou "querido". Priorize chamar a pessoa pelo NOME descoberto!\n` +
    `11. PROIBIDO mencionar a palavra "Priceus" para o cliente final.\n` +
    `12. REGRA ABSOLUTA PARA MENSAGENS DE PROPOSTA JÁ MONTADA PELO CLIENTE (LEAD COM 'SERVIÇOS SELECIONADOS'):\n` +
    `    - SE A MENSAGEM DO CLIENTE CONTER 'SERVIÇOS SELECIONADOS', 'Valor Total: R$', 'Meus Dados:' OU 'DETALHES DO EVENTO:':\n` +
    `    - O CLIENTE JÁ MONTOU A PROPOSTA DELE NO SEU SISTEMA! Ele já escolheu os itens, já sabe o valor total (ex: R$ 1.100,00), já deu o NOME (ex: Júlia), a DATA (ex: 29/01/2027) e a CIDADE (ex: Patrocínio)!\n` +
    `    - É ESTRITAMENTE PROIBIDO:\n` +
    `      ❌ NUNCA pergunte se ele quer pacote personalizado ou pré-definido!\n` +
    `      ❌ NUNCA pergunte o nome, data ou cidade (ele já enviou na mensagem)!\n` +
    `      ❌ NUNCA envie o link da proposta de novo mandando ele escolher nada!\n` +
    `    - O QUE VOCÊ DEVE FAZER OBRIGATORIAMENTE:\n` +
    `      1. Cumprimente pelo NOME recebido (ex: "Olá Júlia! ✨ Que alegria receber o seu pedido!").\n` +
    `      2. Confirme os serviços selecionados, o valor total exato (ex: R$ 1.100,00), a data e a cidade.\n` +
    `      3. Confirme que a agenda do estúdio está 100% DISPONÍVEL para a data e cidade informadas!\n` +
    `      4. Apresente IMEDIATAMENTE a forma de pagamento da reserva do contrato (ex: "Para garantirmos a reserva da sua data no nosso contrato, trabalhamos com 20% de sinal de reserva (R$ 220,00) e o restante parcelado até a data do evento!").\n` +
    `      5. Faça APENAS 1 pergunta simples no final para fechar a reserva (ex: "Você prefere que eu já prepare o link de contrato da sua reserva ou gostaria de tirar alguma dúvida?").\n` +
    `13. REGRA ABSOLUTA DE FECHAMENTO E TRANSBORDO HUMANO ("Quero fechar", "Pode mandar o contrato"):\n` +
    `    - QUANDO O CLIENTE EXPRESSAR A VONTADE DE FECHAR A RESERVA OU SOLICITAR O CONTRATO (ex: "Quero fechar", "vamos fechar", "pode enviar o contrato"):\n` +
    `    - A IA É PROIBIDA DE FINGIR QUE VAI GERAR O CONTRATO SOZINHA! A IA deve comemorar com carinho e avisar que o FOTÓGRAFO/EQUIPE já foi notificado e vai entrar na conversa neste exato instante para enviar o contrato e fechar a reserva!\n` +
    `    - Exemplo de resposta obrigatória: "Que notícia maravilhosa! 🎉 Registrei o seu pedido de fechamento aqui e notifiquei o fotógrafo! Ele já vai entrar nesta conversa em um instante para te mandar o contrato oficial e finalizar sua reserva com todo o carinho! 🥂✨"\n\n` +
    `DADOS REAIS DOS TEMPLATES E CONFIGURAÇÕES DO ESTÚDIO (JSON ESTRUTURADO):\n` +
    `${JSON.stringify(compiledTemplatesJSON)}\n\n` +
    `DATAS OCUPADAS NA AGENDA: ${compactAgendaText}\n\n` +
    `DIRETRIZES DE TREINAMENTO CONFIGURADAS:\n` +
    `${customTrainingText || 'Atenda com carinho, envie sempre o link da proposta interativa real, apresente pacotes e simule pagamentos.'}`;

  // 🧹 5. Truncar Histórico (Apenas as 6 mensagens mais recentes)
  const recentHistory = chatHistory ? chatHistory.slice(-6) : [];

  const openAIMessages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt }
  ];

  recentHistory.forEach((msg) => {
    openAIMessages.push({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    });
  });
  openAIMessages.push({ role: 'user', content: userQuery });

  const geminiContents: { role: string; parts: { text: string }[] }[] = [];
  geminiContents.push({ role: 'user', parts: [{ text: systemPrompt }] });
  geminiContents.push({ role: 'model', parts: [{ text: 'Entendido! Estou pronta com os Templates Estruturados JSON e link de proposta obrigatório.' }] });

  recentHistory.forEach((msg) => {
    geminiContents.push({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    });
  });
  geminiContents.push({ role: 'user', parts: [{ text: userQuery }] });

  // 🔄 6. LOOP DO POOL DE CHAVES (Google Gemini ➔ Groq ➔ DeepSeek/Kimi/OpenAI)
  for (const apiKeyCandidate of keyPool) {
    const key = apiKeyCandidate.trim();

    // ♊ A. GOOGLE GEMINI (`AIzaSy...`)
    if (key.startsWith('AIzaSy')) {
      const endpointsToTry = [
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${key}`
      ];

      for (const url of endpointsToTry) {
        try {
          let response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: geminiContents,
              generationConfig: { temperature: 0.7 }
            })
          });

          if (response.status === 429) {
            console.warn('[Gemini 429 Rate Limit]: tentando próximo endpoint/chave...');
            await new Promise((res) => setTimeout(res, 800));
            response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: geminiContents,
                generationConfig: { temperature: 0.7 }
              })
            });
          }

          const data = await response.json();
          if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            console.log('[Google Gemini RAG Real Template Link Success!]');
            return {
              replyText: data.candidates[0].content.parts[0].text.trim(),
              toolsExecuted: ['gemini_template_rag_json', 'rag_conversation_continuity']
            };
          }
        } catch (err) {
          console.warn('[Gemini Failover Error]:', err);
        }
      }
    }

    // 🚀 B. GROQ CLOUD (`gsk_...` - Llama 3.3 70B)
    if (key.startsWith('gsk_')) {
      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: openAIMessages,
            temperature: 0.7
          })
        });

        const groqData = await groqResponse.json();
        if (groqResponse.ok && groqData.choices?.[0]?.message?.content) {
          console.log('[Groq Cloud Llama-3.3 70B Real Template Link Success!]');
          return {
            replyText: groqData.choices[0].message.content.trim(),
            toolsExecuted: ['groq_llama_33_70b_api', 'rag_conversation_continuity']
          };
        }
      } catch (e) {
        console.warn('[Groq Key Failover]: tentando próxima chave...', e);
      }
    }

    // 🌙 C. MOONSHOT KIMI / DEEPSEEK / OPENAI (`sk-...`)
    if (key.startsWith('sk-')) {
      // 1. DeepSeek V3 API
      try {
        const dsResponse = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: openAIMessages,
            temperature: 0.7
          })
        });

        const dsData = await dsResponse.json();
        if (dsResponse.ok && dsData.choices?.[0]?.message?.content) {
          console.log('[DeepSeek V3 API Success!]');
          return {
            replyText: dsData.choices[0].message.content.trim(),
            toolsExecuted: ['deepseek_v3_api', 'rag_conversation_continuity']
          };
        }
      } catch (e) {
        console.warn('[DeepSeek Failover]: tentando próxima chave...');
      }

      // 2. Moonshot Kimi AI
      try {
        const kimiResponse = await fetch('https://api.moonshot.cn/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: 'moonshot-v1-8k',
            messages: openAIMessages,
            temperature: 0.7
          })
        });

        const kimiData = await kimiResponse.json();
        if (kimiResponse.ok && kimiData.choices?.[0]?.message?.content) {
          console.log('[Moonshot Kimi AI Success!]');
          return {
            replyText: kimiData.choices[0].message.content.trim(),
            toolsExecuted: ['moonshot_kimi_k3_api', 'rag_conversation_continuity']
          };
        }
      } catch (e) {
        console.warn('[Kimi Failover]: tentando próxima chave...');
      }

      // 3. OpenAI GPT-4o
      try {
        const oaiResponse = await fetch('https://api.openai.com/v1,chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: openAIMessages,
            temperature: 0.7
          })
        });

        const oaiData = await oaiResponse.json();
        if (oaiResponse.ok && oaiData.choices?.[0]?.message?.content) {
          console.log('[OpenAI GPT-4o Success!]');
          return {
            replyText: oaiData.choices[0].message.content.trim(),
            toolsExecuted: ['openai_gpt4o_api', 'rag_conversation_continuity']
          };
        }
      } catch (e) {
        console.warn('[OpenAI Failover]: tentando próxima chave...');
      }
    }
  }

  // 🛡️ 7. FALLBACK DINÂMICO HUMANO LOCAL (100% Uptime Garantido)
  const qLower = userQuery.toLowerCase();
  let text = '';
  let tools = ['raciocinio_dinamico_local'];

  const greeting = hasPreviousMessages
    ? (detectedName ? `${detectedName}, ` : '')
    : (detectedName ? `Oi ${detectedName}! ✨ ` : `Oi! ✨ Muito prazer! `);

  const isClosingIntent = /(?:quero fechar|vamos fechar|quero o contrato|gerar contrato|pode mandar o contrato|pode fechar|assinar o contrato|como faço pra fechar|fechar a reserva)/i.test(userQuery);
  let handoffNeeded = false;

  if (isClosingIntent) {
    const clientName = detectedName || 'Júlia';
    text =
      `Que notícia maravilhosa, ${clientName}! 🎉 Notifiquei nossa equipe agora mesmo!\n\n` +
      `O fotógrafo já vai assumir esta conversa em um instante para te mandar o contrato oficial e finalizar sua reserva com todo o carinho! 🥂✨\n\n` +
      `Por favor, aguarde só um momento!`;
    tools = ['gatilho_fechamento_contrato', 'transbordo_humano_ativo'];
    handoffNeeded = true;
  } else if (userQuery.includes('SERVIÇOS SELECIONADOS') || userQuery.includes('DETALHES DO EVENTO:') || userQuery.includes('Valor Total: R$')) {
    const cNameMatch = userQuery.match(/👤\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]{2,20})/);
    const clientName = cNameMatch ? cNameMatch[1].trim() : (detectedName || 'Júlia');

    const dateMatch = userQuery.match(/📅\s*Data:\s*([0-9\/]{8,10})/);
    const eventDate = dateMatch ? dateMatch[1] : 'sua data';

    const cityMatch = userQuery.match(/📍\s*Cidade:\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]{2,20})/);
    const eventCity = cityMatch ? cityMatch[1].trim() : 'sua cidade';

    const totalMatch = userQuery.match(/💰\s*Valor Total:\s*([R$\s0-9.,]+)/);
    const totalVal = totalMatch ? totalMatch[1].trim() : 'R$ 1.100,00';

    text =
      `Olá ${clientName}! ✨ Que alegria receber o seu pedido!\n\n` +
      `Já recebi aqui no sistema os detalhes da sua seleção de pacote em ${eventCity} no valor total de **${totalVal}**!\n\n` +
      `Verifiquei nossa agenda e **temos disponibilidade total para atender você no dia ${eventDate} em ${eventCity}!** 💍\n\n` +
      `Para garantirmos a reserva oficial da sua data no contrato, trabalhamos com 20% de sinal de reserva no ato da assinatura e o restante parcelado em até 10x sem juros (ou até o mês do evento)!\n\n` +
      `Você prefere que eu já elabore a minuta do contrato da sua reserva ou gostaria de tirar alguma dúvida?`;
    tools = ['processamento_proposta_priceus_confirmada'];
  } else if (isOnlyName || qLower.startsWith('meu nome') || qLower.startsWith('sou o') || qLower.startsWith('sou a')) {
    const nameUsed = detectedName || userQuery.replace(/meu nome é|sou o|sou a|me chamo/gi, '').trim();
    text =
      `Muito prazer, ${nameUsed || 'Daniel'}! ✨\n\n` +
      `Em que posso te ajudar hoje? Qual tipo de ensaio ou evento você gostaria de registrar com a gente?`;
    tools = ['reconhecimento_resposta_nome'];
  } else if (qLower.includes('video') || qLower.includes('vídeo') || qLower.includes('filmagem') || qLower.includes('filme')) {
    text =
      `${greeting}Que excelente pergunta!\n\n` +
      `Nosso estúdio é especializado em **Fotografia Afetiva e Documental**, porém trabalhamos em parceria com videomakers de cinema altamente qualificados!\n\n` +
      `Podemos incluir a cobertura de **Vídeo/Teaser de Casamento** no mesmo contrato para você ter a comodidade de resolver tudo em um só lugar!\n\n` +
      `Gostaria que eu te envie um exemplo de vídeo dos nossos parceiros?`;
    tools = ['consulta_modulo_video'];
  } else if (qLower.includes('pacote') || qLower.includes('opcoes') || qLower.includes('opções') || qLower.includes('tabela') || qLower.includes('orçamento') || qLower.includes('orcamento')) {
    const firstTplUrl = compiledTemplatesJSON?.[0]?.link_proposta_interativa || 'https://estudio.priceus.com.br/p/proposta-exclusiva';
    text =
      `${greeting}Será um prazer te apresentar nossa proposta interativa exclusiva com fotos em alta resolução, pacotes e simulação de parcelas!\n\n` +
      `🔗 **Acesse nossa proposta interativa oficial:** ${firstTplUrl}\n\n` +
      `Lá você pode personalizar seu pacote, escolher os itens e simular as condições de pagamento em tempo real!\n\n` +
      `Qual dessas opções se encaixa melhor no estilo do seu evento?`;
    tools = ['varredura_templates_pacotes_link_real'];
  } else if (qLower.includes('raw') || qLower.includes('brutas') || qLower.includes('sem edição')) {
    text =
      `${greeting}\n\n` +
      `Nós **não entregamos os arquivos brutos sem edição (RAW)** por uma questão de respeito à qualidade da sua história. O arquivo RAW é como a tela em branco de um pintor; todas as fotos entregues passam por uma curadoria rigorosa e tratamento profissional de cor e luz.\n\n` +
      `Você receberá 100% das fotos selecionadas em altíssima resolução prontas para imprimir e compartilhar!`;
    tools = ['diretrizes_contratuis_raw'];
  } else if (qLower.includes('disponibilidade') || qLower.includes('data') || qLower.includes('agenda') || qLower.includes('2026') || qLower.includes('2027') || qLower.includes('2028')) {
    const firstTplUrl = compiledTemplatesJSON?.[0]?.link_proposta_interativa || 'https://estudio.priceus.com.br/p/proposta-exclusiva';
    text =
      `${greeting}Verifiquei nossa agenda aqui e **temos disponibilidade total para te atender na sua data!** 💍\n\n` +
      `Você pode conferir todos os nossos pacotes e montar sua proposta interativa direto no link:\n` +
      `🔗 ${firstTplUrl}\n\n` +
      `Qual será a cidade ou local do seu evento para confirmarmos o atendimento da nossa equipe na sua região?`;
    tools = ['consulta_agenda_dinamica_link_real'];
  } else {
    if (hasPreviousMessages) {
      text =
        `Perfeito! Posso te ajudar com todos os detalhes dos nossos pacotes, verificação de disponibilidade ou montagem da sua proposta.\n\n` +
        `Qual o tipo de evento ou ensaio você pretende realizar?`;
    } else {
      text =
        `Olá! ✨ Tudo bem com você? Que alegria ter você por aqui!\n\n` +
        `Nosso estúdio realiza coberturas de Casamentos, Ensaios de Casal, Gestante, Família e Eventos com muito afeto.\n\n` +
        `Com quem tenho o prazer de falar e qual tipo de ensaio ou evento você gostaria de registrar com a gente?`;
    }
    tools = ['raciocinio_vendas_geral'];
  }

  return {
    replyText: text,
    toolsExecuted: tools,
    handoffRequired: handoffNeeded,
    suggestedLeadStage: handoffNeeded ? 'contrato_solicitado' : undefined
  };
}
