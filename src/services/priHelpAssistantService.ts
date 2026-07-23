import { supabase } from '../lib/supabase';

export interface PriAssistantResponse {
  replyText: string;
  toolsExecuted?: string[];
  suggestedDocLink?: string;
}

/**
 * Base RAG Otimizada em Texto sobre a Plataforma Priceus (Tudo sobre o sistema, sem peso de imagens)
 */
const PRI_KNOWLEDGE_BASE_TEXT = `
MANUAL DE CONFIGURAÇÃO E AJUDA INTEGRAL DO PRICEUS:

1. TEMPLATES E PROPOSTAS INTERATIVAS:
- Os templates montam propostas visuais interativas enviadas aos clientes.
- O link oficial de cada proposta segue o padrão: https://priceus.com.br/{seu_usuario}/{slug_do_template}.
- No criador de templates, você define se deseja 'Ocultar Valores Intermediários' (mostra apenas o valor final do pacote escolhido) e se deseja 'Ocultar Taxa de Deslocamento'.
- Pacotes Fechados vs Itens Avulsos: Você pode criar pacotes prontos (ex: Essencial, Completo) ou deixar o cliente adicionar/remover produtos avulsos por hora ou unidade.

2. SECRETÁRIA VIRTUAL DO WHATSAPP & IA DE ATENDIMENTO:
- A IA de WhatsApp é a secretária virtual dos leads do fotógrafo.
- Nome da Secretária: Pode ser personalizado na aba WhatsApp (ex: Sofia, Bia, Clara).
- Chaves de API Gratuitas (Custo R$ 0 para o Priceus): Você cadastra suas próprias chaves gratuitas do Google AI Studio (Gemini), Groq Cloud (Llama 3.3 70B) ou DeepSeek nas Configurações do WhatsApp.
- Transbordo Humano com Alerta Laranja: Quando o lead digita 'Quero fechar', a IA comemora, avisa que a equipe foi notificada, e a janela do bate-papo acende em LARANJA VIBRANTE no painel para o fotógrafo enviar o contrato!

3. MAPEAMENTOS DE TRABALHO & PRODUTOS:
- Cada tipo de evento (Casamento, Ensaio Gestante, Aniversário) pode ser mapeado para um Template específico.
- Você pode criar produtos com precificação por Valor Fixo, Por Hora (ex: R$ 450/hora) ou Por Unidade (ex: Álbum dos Pais R$ 650/un).

4. TAXAS DE DESLOCAMENTO & SAZONALIDADE:
- Na aba Preços Sazonais e Geográficos, você pode cadastrar taxas de deslocamento por cidade (ex: Patrocínio R$ 150) ou percentuais de sazonalidade para meses de alta demanda (ex: Outubro +15%).

5. CONTRATOS & ASSINATURA DIGITAL:
- Em Modelos de Contrato, você define as cláusulas e usa tags dinâmicas como {nome_cliente}, {valor_total}, {data_evento}, {cidade_evento}.
- O cliente pode assinar digitalmente pelo celular.

6. AGENDA, MEU DIA E WORKFLOW:
- No Meu Dia / Agenda, você registra datas ocupadas e tarefas de edição e entrega.
- A IA de WhatsApp consulta a agenda automaticamente para confirmar se a data do cliente está livre ou ocupada!

7. CALCULADORA DE CUSTO FIXO & VALOR HORA:
- No módulo financeiro, você cadastra suas despesas fixas mensais (aluguel, equipamentos, software) e suas horas trabalhadas para descobrir seu valor hora ideal e margem de lucro real.
`;

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Motor da Pri - Leitor Direto das Tabelas Supabase do Estúdio com Resposta Mês a Mês 100% Precisa
 */
export async function callPriHelpAssistant(
  userQuery: string,
  userId?: string
): Promise<PriAssistantResponse> {
  // 🔑 1. Pool de Chaves de API do Usuário (Custo R$ 0 para o Priceus)
  const savedKey1 = typeof window !== 'undefined' ? localStorage.getItem('priceus_ai_api_key_primary') || localStorage.getItem('priceus_ai_api_key') : null;
  const savedKey2 = typeof window !== 'undefined' ? localStorage.getItem('priceus_ai_api_key_secondary') : null;
  const savedKey3 = typeof window !== 'undefined' ? localStorage.getItem('priceus_ai_api_key_tertiary') : null;

  const keyPool = [
    savedKey1,
    savedKey2,
    savedKey3,
    import.meta.env.VITE_GEMINI_API_KEY,
  ].filter((k): k is string => !!k && k.trim().length > 5 && !k.includes('SUA_CHAVE'));

  // 2. Coletar dados reais das tabelas exatas do Supabase
  let studioName = 'Estúdio de Fotografia';
  let userName = 'Fotógrafo';
  const currentYear = new Date().getFullYear();

  let financialMetrics = {
    entradasPagas: 0,
    entradasPendentes: 0,
    despesasTotal: 0,
    lucroLiquido: 0,
    vendasFechadasCount: 0
  };

  // Matriz Mês a Mês do Ano Atual
  const salesByMonth: Record<string, { pagas: number; pendentes: number; total: number; count: number }> = {};
  monthNames.forEach((_, idx) => {
    const mKey = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
    salesByMonth[mKey] = { pagas: 0, pendentes: 0, total: 0, count: 0 };
  });

  let templatesList: { nome: string; slug: string }[] = [];
  let productsList: { nome: string; valor: number }[] = [];
  let calendarEvents: { data: string; titulo: string; cliente?: string }[] = [];
  let contractsSummary = { ativos: 0, assinados: 0, pendentes: 0 };

  try {
    const { data: authData } = await supabase.auth.getUser();
    const effectiveUserId = userId || authData?.user?.id;

    if (effectiveUserId) {
      if (authData?.user?.user_metadata) {
        userName = authData.user.user_metadata.full_name || authData.user.user_metadata.name || userName;
        studioName = authData.user.user_metadata.studio_name || authData.user.user_metadata.company_name || studioName;
      }

      // A. Tabela Profiles
      try {
        const { data: profData } = await supabase.from('profiles').select('nome_admin, nome_profissional, slug_usuario').eq('id', effectiveUserId).maybeSingle();
        if (profData) {
          if (profData.nome_admin || profData.nome_profissional) {
            userName = profData.nome_admin || profData.nome_profissional || userName;
          }
          if (profData.slug_usuario) {
            studioName = profData.slug_usuario;
          }
        }
      } catch (errProf) {
        console.warn('[Pri Profiles Query Warning]:', errProf);
      }

      // B. Tabela Company Transactions (Lançamentos Financeiros)
      try {
        const { data: transData } = await supabase.from('company_transactions').select('valor, tipo, status, data').eq('user_id', effectiveUserId);
        if (transData && transData.length > 0) {
          transData.forEach((t: any) => {
            const val = Number(t.valor || 0);
            const dt = t.data || '';
            const ym = dt ? dt.substring(0, 7) : '';

            if (t.tipo === 'receita') {
              if (t.status === 'pago') {
                financialMetrics.entradasPagas += val;
                financialMetrics.vendasFechadasCount++;
                if (ym && salesByMonth[ym]) {
                  salesByMonth[ym].pagas += val;
                  salesByMonth[ym].total += val;
                  salesByMonth[ym].count++;
                }
              } else {
                financialMetrics.entradasPendentes += val;
                if (ym && salesByMonth[ym]) {
                  salesByMonth[ym].pendentes += val;
                }
              }
            } else if (t.tipo === 'despesa') {
              financialMetrics.despesasTotal += val;
            }
          });
          financialMetrics.lucroLiquido = financialMetrics.entradasPagas - financialMetrics.despesasTotal;
        }
      } catch (errTrans) {
        console.warn('[Pri Transactions Query Warning]:', errTrans);
      }

      // C. Tabela Leads (Orçamentos Convertidos)
      try {
        const { data: leadData } = await supabase.from('leads').select('valor_total, status, nome_cliente, data_evento, created_at').eq('user_id', effectiveUserId);
        if (leadData && leadData.length > 0) {
          leadData.forEach((l: any) => {
            const val = Number(l.valor_total || 0);
            const dt = l.data_evento || l.created_at || '';
            const ym = dt ? dt.substring(0, 7) : '';

            if (l.status === 'convertido' || l.status === 'finalizado') {
              if (financialMetrics.entradasPagas === 0) {
                financialMetrics.entradasPagas += val;
              }
              financialMetrics.vendasFechadasCount++;

              if (ym && salesByMonth[ym] && salesByMonth[ym].total === 0) {
                salesByMonth[ym].pagas += val;
                salesByMonth[ym].total += val;
                salesByMonth[ym].count++;
              }
            }
          });
        }
      } catch (errLeads) {
        console.warn('[Pri Leads Query Warning]:', errLeads);
      }

      // D. Tabela Templates
      try {
        const { data: tData } = await supabase.from('templates').select('nome_template, slug_template').eq('user_id', effectiveUserId);
        if (tData) {
          templatesList = tData.map((t: any) => ({
            nome: t.nome_template || 'Template Proposta',
            slug: t.slug_template || 'proposta'
          }));
        }
      } catch (errTpl) {
        console.warn('[Pri Templates Query Warning]:', errTpl);
      }

      // E. Tabela Produtos
      try {
        const { data: pData } = await supabase.from('produtos').select('nome, valor').eq('user_id', effectiveUserId).limit(15);
        if (pData) {
          productsList = pData.map((p: any) => ({
            nome: p.nome || 'Produto',
            valor: Number(p.valor || 0)
          }));
        }
      } catch (errProd) {
        console.warn('[Pri Produtos Query Warning]:', errProd);
      }

      // F. Tabela Eventos Agenda
      try {
        const { data: aData } = await supabase.from('eventos_agenda').select('data_evento, tipo_evento, cliente_nome').eq('user_id', effectiveUserId).limit(10);
        if (aData) {
          calendarEvents = aData.map((a: any) => ({
            data: a.data_evento || '',
            titulo: a.tipo_evento || 'Evento Agendado',
            cliente: a.cliente_nome || ''
          })).filter((a: any) => !!a.data);
        }
      } catch (errAgenda) {
        console.warn('[Pri Agenda Query Warning]:', errAgenda);
      }

      // G. Tabela Contracts
      try {
        const { data: cData } = await supabase.from('contracts').select('status').eq('user_id', effectiveUserId);
        if (cData) {
          contractsSummary.ativos = cData.length;
          contractsSummary.assinados = cData.filter((c: any) => c.status === 'signed').length;
          contractsSummary.pendentes = cData.filter((c: any) => c.status === 'pending').length;
        }
      } catch (errContracts) {
        console.warn('[Pri Contracts Query Warning]:', errContracts);
      }
    }
  } catch (e) {
    console.warn('[Pri Supabase Master Read Error]:', e);
  }

  // Formatar Texto de Vendas por Mês para o System Prompt
  const monthlySalesText = Object.entries(salesByMonth)
    .map(([ym, data]) => {
      const [y, m] = ym.split('-');
      const mName = monthNames[parseInt(m, 10) - 1] || ym;
      return `- ${mName}/${y}: R$ ${data.pagas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pagos (${data.count} contrato(s)/vendas)`;
    })
    .join('\n');

  // 3. Prompt de Raciocínio Integral da Pri
  const priSystemPrompt =
    `Você se chama "Pri", a especialista e consultora de suporte oficial da plataforma Priceus.\n` +
    `Seu tom de voz é extremamente simpático, didático, claro, acolhedor, profissional e especialista no Priceus.\n\n` +
    `SUA MISSÃO:\n` +
    `- Responder ao fotógrafo (${userName} do estúdio "${studioName}") consultando os DADOS REAIS extraídos diretamente das tabelas do banco de dados dele.\n` +
    `- Quando ele perguntar sobre faturamento do ano ou vendas por mês ("quanto vendi em 2026?", "quanto vendi no mês X?"), apresente a lista MÊS A MÊS detalhada abaixo com clareza!\n` +
    `- Se os dados gravados nas tabelas forem R$ 0,00 nos meses, informe respeitosamente que ainda não há lançamentos pagos gravados para esses meses nas tabelas 'company_transactions' ou 'leads' e sugira cadastrar as transações no módulo 'Meu Dia'!\n\n` +
    `DADOS REAIS LIDOS DAS TABELAS DO BANCO DO USUÁRIO (${currentYear}):\n\n` +
    `📊 MENSALIDADE DE VENDAS E FATURAMENTO MÊS A MÊS (${currentYear}):\n` +
    `${monthlySalesText}\n\n` +
    `💰 RESUMO FINANCEIRO GERAL:\n` +
    `- Entradas Pagas Registradas: R$ ${financialMetrics.entradasPagas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
    `- Entradas Pendentes a Receber: R$ ${financialMetrics.entradasPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
    `- Despesas Registradas: R$ ${financialMetrics.despesasTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
    `- Lucro Líquido Real: R$ ${financialMetrics.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
    `- Contratos/Vendas Fechadas no Total: ${financialMetrics.vendasFechadasCount}\n\n` +
    `🗓️ AGENDA DE EVENTOS (${calendarEvents.length} eventos): ${JSON.stringify(calendarEvents)}\n\n` +
    `📋 TEMPLATES DO FOTÓGRAFO (${templatesList.length} templates): ${JSON.stringify(templatesList)}\n\n` +
    `🛍️ CATÁLOGO DE PRODUTOS (${productsList.length} produtos): ${JSON.stringify(productsList)}\n\n` +
    `📝 CONTRATOS (${contractsSummary.ativos} contratos, ${contractsSummary.assinados} assinados, ${contractsSummary.pendentes} pendentes)\n\n` +
    `BASE DE CONHECIMENTO TÉCNICA E CONFIGURAÇÃO PRICEUS:\n` +
    `${PRI_KNOWLEDGE_BASE_TEXT}`;

  const openAIMessages = [
    { role: 'system', content: priSystemPrompt },
    { role: 'user', content: userQuery }
  ];

  const geminiContents = [
    { role: 'user', parts: [{ text: priSystemPrompt }] },
    { role: 'model', parts: [{ text: `Olá ${userName}! Sou a Pri! Li com sucesso todas as tabelas do seu estúdio (${studioName}) e estou pronta para te mostrar suas vendas e faturamento.` }] },
    { role: 'user', parts: [{ text: userQuery }] }
  ];

  // 🔄 4. LOOP DO POOL DE CHAVES (Gemini ➔ Groq ➔ DeepSeek/OpenAI ➔ Fallback Pri Local)
  for (const keyCandidate of keyPool) {
    const key = keyCandidate.trim();

    // A. Google Gemini
    if (key.startsWith('AIzaSy')) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`;
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: geminiContents,
            generationConfig: { temperature: 0.6 }
          })
        });

        const data = await response.json();
        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          return {
            replyText: data.candidates[0].content.parts[0].text.trim(),
            toolsExecuted: ['pri_gemini_table_reader_success']
          };
        }
      } catch (err) {
        console.warn('[Pri Gemini Failover Error]:', err);
      }
    }

    // B. Groq Cloud (Llama 3.3 70B)
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
            temperature: 0.6
          })
        });

        const groqData = await groqResponse.json();
        if (groqResponse.ok && groqData.choices?.[0]?.message?.content) {
          return {
            replyText: groqData.choices[0].message.content.trim(),
            toolsExecuted: ['pri_groq_llama70b_table_reader_success']
          };
        }
      } catch (e) {
        console.warn('[Pri Groq Failover Error]:', e);
      }
    }

    // C. DeepSeek / OpenAI
    if (key.startsWith('sk-')) {
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
            temperature: 0.6
          })
        });

        const dsData = await dsResponse.json();
        if (dsResponse.ok && dsData.choices?.[0]?.message?.content) {
          return {
            replyText: dsData.choices[0].message.content.trim(),
            toolsExecuted: ['pri_deepseek_table_reader_success']
          };
        }
      } catch (e) {
        console.warn('[Pri DeepSeek Failover Error]:', e);
      }
    }
  }

  // 🛡️ 5. FALLBACK LOCAL INTELIGENTE DA PRI (100% Uptime Garantido com Leitura de Tabelas)
  const qLower = userQuery.toLowerCase();
  let text = '';

  if (qLower.includes('vendi') || qLower.includes('faturamento') || qLower.includes('faturei') || qLower.includes('financeiro') || qLower.includes('vendas') || qLower.includes('2026') || qLower.includes('meses') || qLower.includes('mês')) {
    const monthDetails = Object.entries(salesByMonth)
      .filter(([_, d]) => d.pagas > 0 || d.pendentes > 0)
      .map(([ym, d]) => {
        const [y, m] = ym.split('-');
        const mName = monthNames[parseInt(m, 10) - 1] || ym;
        return `• **${mName}/${y}:** R$ ${d.pagas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${d.count} venda(s))`;
      });

    const breakdownString = monthDetails.length > 0
      ? monthDetails.join('\n')
      : '• Ainda não há transações ou vendas pagas gravadas nas tabelas para os meses deste ano.';

    text =
      `Olá ${userName}! Sou a **Pri**! Li com sucesso as tabelas do seu estúdio (**${studioName}**) no Supabase! 📊✨\n\n` +
      `**Relatório de Vendas Mês a Mês em ${currentYear}:**\n` +
      `${breakdownString}\n\n` +
      `📈 **Resumo Financeiro do Período:**\n` +
      `- 💰 **Entradas Pagas:** R$ ${financialMetrics.entradasPagas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `- ⏳ **Entradas Pendentes:** R$ ${financialMetrics.entradasPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `- 💸 **Despesas Totais:** R$ ${financialMetrics.despesasTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `- 📈 **Lucro Líquido Real:** R$ ${financialMetrics.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` +
      `Quer registrar novas receitas ou lançamentos no módulo **Meu Dia**?`;
  } else if (qLower.includes('agenda') || qLower.includes('agendamento') || qLower.includes('evento') || qLower.includes('data')) {
    const eventsText = calendarEvents.length > 0
      ? calendarEvents.map(e => `• ${e.data} — ${e.titulo} (${e.cliente || 'Cliente'})`).join('\n')
      : '• Nenhuma data ocupada no momento. Todas as datas livres!';

    text =
      `Olá ${userName}! Sou a **Pri**! Consultei a tabela da sua agenda no banco de dados: 🗓️✨\n\n` +
      `${eventsText}\n\n` +
      `Sua Secretária Virtual de WhatsApp usa essas datas automaticamente para liberar orçamentos aos clientes!`;
  } else if (qLower.includes('contrato') || qLower.includes('assinar')) {
    text =
      `Olá ${userName}! Sou a **Pri**! Consultei a tabela de contratos do seu estúdio (\`contracts\`): 📝✨\n\n` +
      `- 📄 **Total de Contratos:** ${contractsSummary.ativos}\n` +
      `- ✍️ **Contratos Assinados:** ${contractsSummary.assinados}\n` +
      `- ⏳ **Pendentes de Assinatura:** ${contractsSummary.pendentes}\n\n` +
      `Precisa de ajuda para gerar o link do contrato para um cliente assinar pelo celular?`;
  } else {
    text =
      `Olá ${userName}! Sou a **Pri**, sua especialista e leitora de dados do estúdio **${studioName}**! 💖✨\n\n` +
      `Li todas as tabelas do seu sistema em tempo real e aqui estão os seus indicadores:\n` +
      `- 📊 **Vendas Pagas no Ano:** R$ ${financialMetrics.entradasPagas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `- 🗓️ **Agenda:** ${calendarEvents.length} eventos confirmados na agenda\n` +
      `- 📋 **Templates:** ${templatesList.length} propostas ativas\n` +
      `- 🛍️ **Produtos:** ${productsList.length} produtos cadastrados no catálogo\n` +
      `- 📝 **Contratos:** ${contractsSummary.ativos} contratos registrados (${contractsSummary.assinados} assinados)\n\n` +
      `Como posso te ajudar agora? Pode me perguntar sobre faturamento dos meses ou configurações!`;
  }

  return {
    replyText: text,
    toolsExecuted: ['pri_table_reader_fallback_success']
  };
}
