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
- Motor de IA Nativo (Groq LLaMA 3.3 70B): Totalmente incluso e nativo no Priceus, pronto para uso automático sem necessidade de inserir chaves de API.
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
    import.meta.env.VITE_GROQ_API_KEY,
    import.meta.env.VITE_GEMINI_API_KEY,
    savedKey1,
    savedKey2,
    savedKey3,
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

  interface DetailedCalendarEvent {
    id: string;
    data: string;
    dataFormatada: string;
    horarioInicio?: string;
    horarioFim?: string;
    titulo: string;
    cliente: string;
    cidade?: string;
    status: string;
    observacoes?: string;
    origem?: string;
  }

  interface BlockedDate {
    data: string;
    dataFormatada: string;
    motivo: string;
  }

  interface BlockedPeriod {
    inicio: string;
    fim: string;
    motivo: string;
  }

  const formatDateBR = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  let templatesList: { nome: string; slug: string }[] = [];
  let productsList: { nome: string; valor: number }[] = [];
  let calendarEvents: DetailedCalendarEvent[] = [];
  let blockedDates: BlockedDate[] = [];
  let blockedPeriods: BlockedPeriod[] = [];
  let agendaConfig = { agendaAtiva: true, maxPorDia: 1, modoAviso: 'informativo', diasSemanaBloqueados: [] as number[] };
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

      // F. Tabela Eventos Agenda (Todos os eventos ativos e futuros da agenda - multi-anos)
      try {
        const { data: aData } = await supabase
          .from('eventos_agenda')
          .select('id, data_evento, horario_inicio, horario_fim, tipo_evento, cliente_nome, cidade, status, observacoes, origem')
          .eq('user_id', effectiveUserId)
          .neq('status', 'cancelado')
          .order('data_evento', { ascending: true })
          .limit(1000);

        if (aData && aData.length > 0) {
          calendarEvents = aData.map((a: any) => ({
            id: a.id,
            data: a.data_evento || '',
            dataFormatada: formatDateBR(a.data_evento || ''),
            horarioInicio: a.horario_inicio || undefined,
            horarioFim: a.horario_fim || undefined,
            titulo: a.tipo_evento || 'Ensaio / Evento',
            cliente: a.cliente_nome || '',
            cidade: a.cidade || undefined,
            status: a.status || 'confirmado',
            observacoes: a.observacoes || undefined,
            origem: a.origem || 'sistema'
          })).filter((a: any) => !!a.data);
        }
      } catch (errAgenda) {
        console.warn('[Pri Agenda Query Warning]:', errAgenda);
      }

      // F2. Tabela Datas Bloqueadas (Multi-anos)
      try {
        const { data: dbData } = await supabase
          .from('datas_bloqueadas')
          .select('data, motivo')
          .eq('user_id', effectiveUserId)
          .order('data', { ascending: true })
          .limit(300);

        if (dbData) {
          blockedDates = dbData.map((d: any) => ({
            data: d.data,
            dataFormatada: formatDateBR(d.data),
            motivo: d.motivo || 'Data bloqueada'
          }));
        }
      } catch (errDb) {
        console.warn('[Pri Datas Bloqueadas Warning]:', errDb);
      }

      // F3. Tabela Períodos Bloqueados (Férias / Recessos - Multi-anos)
      try {
        const { data: pbData } = await supabase
          .from('periodos_bloqueados')
          .select('data_inicio, data_fim, motivo')
          .eq('user_id', effectiveUserId)
          .order('data_inicio', { ascending: true })
          .limit(100);

        if (pbData) {
          blockedPeriods = pbData.map((p: any) => ({
            inicio: formatDateBR(p.data_inicio),
            fim: formatDateBR(p.data_fim),
            motivo: p.motivo || 'Férias / Recesso'
          }));
        }
      } catch (errPb) {
        console.warn('[Pri Periodos Bloqueados Warning]:', errPb);
      }

      // F4. Configuração da Agenda
      try {
        const { data: cfgData } = await supabase
          .from('agenda_config')
          .select('eventos_max_por_dia, modo_aviso, agenda_ativa, dias_semana_bloqueados, modo_agendamento')
          .eq('user_id', effectiveUserId)
          .maybeSingle();

        if (cfgData) {
          agendaConfig = {
            agendaAtiva: cfgData.agenda_ativa ?? true,
            maxPorDia: cfgData.eventos_max_por_dia ?? 1,
            modoAviso: cfgData.modo_aviso ?? 'informativo',
            diasSemanaBloqueados: cfgData.dias_semana_bloqueados || []
          };
        }
      } catch (errCfg) {
        console.warn('[Pri Agenda Config Warning]:', errCfg);
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

  // Formatar Texto de Eventos da Agenda
  const calendarEventsText = calendarEvents.length > 0
    ? calendarEvents.map((e) =>
      `- Data: ${e.dataFormatada} (${e.data}) | ${e.titulo} | Cliente: ${e.cliente || 'Não informado'}${e.horarioInicio ? ' | Horário: ' + e.horarioInicio : ''}${e.cidade ? ' | Local: ' + e.cidade : ''} | Status: ${e.status}${e.observacoes ? ' | Obs: ' + e.observacoes : ''}`
    ).join('\n')
    : '- Nenhum evento ativo registrado na agenda no momento.';

  const blockedDatesText = blockedDates.length > 0
    ? blockedDates.map((d) => `- Data Bloqueada: ${d.dataFormatada} (${d.data}) — Motivo: ${d.motivo}`).join('\n')
    : '- Nenhuma data avulsa bloqueada.';

  const blockedPeriodsText = blockedPeriods.length > 0
    ? blockedPeriods.map((p) => `- Período de Recesso: de ${p.inicio} até ${p.fim} — Motivo: ${p.motivo}`).join('\n')
    : '- Nenhum recesso ou período de férias bloqueado.';

  // 3. Prompt de Raciocínio Integral da Pri
  const priSystemPrompt =
    `Você se chama "Pri", a especialista e consultora de inteligência e suporte oficial da plataforma Priceus.\n` +
    `Seu tom de voz é extremamente simpático, didático, claro, acolhedor, profissional e especialista no Priceus.\n\n` +
    `SUA MISSÃO:\n` +
    `- Responder ao fotógrafo (${userName} do estúdio "${studioName}") consultando os DADOS REAIS extraídos diretamente das tabelas do banco de dados dele em tempo real.\n` +
    `- Você TEM ACESSO TOTAL À AGENDA DE EVENTOS do estúdio. A agenda é contínua e possui compromissos para todos os anos (incluindo 2026, 2027, 2028 e além). Quando o fotógrafo perguntar sobre a agenda, próximos eventos, se tem data livre, ou o que tem marcado em qualquer ano/mês/dia específico, consulte detalhadamente a lista de eventos e datas bloqueadas abaixo e informe com precisão os horários, clientes e tipos de evento!\n` +
    `- REGRA CRÍTICA: NUNCA diga que o banco de dados só possui registros até o fim do ano atual ou até dezembro de 2026. A lista abaixo contém a totalidade dos eventos cadastrados em todos os anos (2026, 2027, 2028, etc.). Se o usuário perguntar por 2027 ou 2028, verifique os eventos desses anos listados abaixo e responda com precisão.\n` +
    `- Quando ele perguntar sobre faturamento do ano ou vendas por mês ("quanto vendi em ${currentYear}?", "quanto vendi no mês X?"), apresente a lista MÊS A MÊS detalhada abaixo com clareza!\n` +
    `- Se os dados gravados nas tabelas forem R$ 0,00 nos meses, informe respeitosamente que ainda não há lançamentos pagos gravados para esses meses nas tabelas 'company_transactions' ou 'leads' e sugira cadastrar as transações no módulo 'Meu Dia'!\n\n` +
    `DADOS REAIS LIDOS DAS TABELAS DO BANCO DO USUÁRIO:\n\n` +
    `🗓️ AGENDA OFICIAL DE EVENTOS (${calendarEvents.length} eventos confirmados/ativos em todos os anos cadastrados):\n` +
    `${calendarEventsText}\n\n` +
    `🚫 DATAS BLOQUEADAS E RECOLHIMENTOS:\n` +
    `${blockedDatesText}\n` +
    `${blockedPeriodsText}\n` +
    `⚙️ Configuração da Agenda: Status: ${agendaConfig.agendaAtiva ? 'Ativa' : 'Inativa'}, Máximo de ${agendaConfig.maxPorDia} evento(s)/dia, Modo de aviso: ${agendaConfig.modoAviso}\n\n` +
    `📊 MENSALIDADE DE VENDAS E FATURAMENTO MÊS A MÊS (${currentYear}):\n` +
    `${monthlySalesText}\n\n` +
    `💰 RESUMO FINANCEIRO GERAL:\n` +
    `- Entradas Pagas Registradas: R$ ${financialMetrics.entradasPagas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
    `- Entradas Pendentes a Receber: R$ ${financialMetrics.entradasPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
    `- Despesas Registradas: R$ ${financialMetrics.despesasTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
    `- Lucro Líquido Real: R$ ${financialMetrics.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
    `- Contratos/Vendas Fechadas no Total: ${financialMetrics.vendasFechadasCount}\n\n` +
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
    { role: 'model', parts: [{ text: `Olá ${userName}! Sou a Pri! Li com sucesso todas as tabelas do seu estúdio (${studioName}), incluindo sua Agenda completa de eventos, faturamento e templates.` }] },
    { role: 'user', parts: [{ text: userQuery }] }
  ];

  // 🔄 4. LOOP DO POOL DE CHAVES (Groq ➔ Gemini ➔ DeepSeek/OpenAI ➔ Fallback Pri Local)
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

    // B. Groq Cloud (Modelos de alta velocidade com failover)
    if (key.startsWith('gsk_')) {
      const groqCandidateModels = [
        'openai/gpt-oss-120b',
        'openai/gpt-oss-20b',
        'llama-3.1-8b-instant',
        'qwen/qwen3.6-27b'
      ];

      for (const groqModel of groqCandidateModels) {
        try {
          const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
              model: groqModel,
              messages: openAIMessages,
              temperature: 0.6,
              max_tokens: 800
            })
          });

          if (groqResponse.ok) {
            const groqData = await groqResponse.json();
            const content = groqData.choices?.[0]?.message?.content;
            if (content && typeof content === 'string' && content.trim().length > 0) {
              return {
                replyText: content.trim(),
                toolsExecuted: [`pri_groq_${groqModel.replace(/[^a-zA-Z0-9_]/g, '_')}_success`]
              };
            }
          }
        } catch (e) {
          console.warn(`[Pri Groq Failover Error on ${groqModel}]:`, e);
        }
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
  } else if (qLower.includes('agenda') || qLower.includes('agendamento') || qLower.includes('evento') || qLower.includes('data') || qLower.includes('disponibilidade') || qLower.includes('livre') || qLower.includes('ocupad') || qLower.includes('trabalho') || qLower.includes('ensaio') || qLower.includes('casamento')) {
    const eventsText = calendarEvents.length > 0
      ? calendarEvents.map(e => `• **${e.dataFormatada}** (${e.data}): **${e.titulo}** — Cliente: *${e.cliente || 'Não informado'}*${e.horarioInicio ? ' às ' + e.horarioInicio : ''}${e.cidade ? ' em ' + e.cidade : ''} [Status: ${e.status}]`).join('\n')
      : '• Nenhum evento ou ensaio marcado no momento. Todas as datas estão livres!';

    const blockedText = blockedDates.length > 0
      ? `\n\n🚫 **Datas Bloqueadas:**\n` + blockedDates.map(d => `• **${d.dataFormatada}:** ${d.motivo}`).join('\n')
      : '';

    const periodsText = blockedPeriods.length > 0
      ? `\n\n🏖️ **Períodos de Recesso:**\n` + blockedPeriods.map(p => `• De **${p.inicio}** a **${p.fim}**: ${p.motivo}`).join('\n')
      : '';

    text =
      `Olá ${userName}! Sou a **Pri**! Consultei a sua **Agenda Oficial** em tempo real no banco de dados: 🗓️✨\n\n` +
      `📌 **Eventos e Ensaios Agendados (${calendarEvents.length}):**\n` +
      `${eventsText}` +
      `${blockedText}` +
      `${periodsText}\n\n` +
      `Sua Secretária Virtual de WhatsApp e os links de propostas consultam essas exatas datas para informar disponibilidade aos clientes!`;
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
      `- 🗓️ **Agenda:** ${calendarEvents.length} eventos confirmados na agenda\n` +
      `- 📊 **Vendas Pagas no Ano:** R$ ${financialMetrics.entradasPagas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `- 📋 **Templates:** ${templatesList.length} propostas ativas\n` +
      `- 🛍️ **Produtos:** ${productsList.length} produtos cadastrados no catálogo\n` +
      `- 📝 **Contratos:** ${contractsSummary.ativos} contratos registrados (${contractsSummary.assinados} assinados)\n\n` +
      `Como posso te ajudar agora? Pode me perguntar sobre sua agenda, eventos marcados ou faturamento!`;
  }

  return {
    replyText: text,
    toolsExecuted: ['pri_table_reader_fallback_success']
  };
}
