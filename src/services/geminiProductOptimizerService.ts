export interface ProductOptimizationSuggestion {
  id: number;
  badge: string;
  badgeColor: string;
  title: string;
  strategy: string;
  whyItConverts: string;
  text: string;
}

export interface ProductOptimizationResponse {
  analysis: string;
  suggestions: ProductOptimizationSuggestion[];
}

function extractJsonFromResponse(raw: string): any {
  if (!raw) return null;

  // 1. Tentar parse direto
  try {
    return JSON.parse(raw);
  } catch (e) {}

  // 2. Extrair de bloco markdown ```json ... ```
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch (e) {}
  }

  // 3. Extrair entre chaves { ... }
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(raw.substring(firstBrace, lastBrace + 1));
    } catch (e) {}
  }

  return null;
}

/**
 * Serviço de Inteligência Artificial para Otimização de Descrições de Produtos e Serviços via Groq.
 */
export async function optimizeProductDescription(
  productName: string,
  currentDescription: string,
  price?: number,
  unit?: string,
  customInstruction?: string
): Promise<ProductOptimizationResponse> {
  const cleanName = productName?.trim() || 'Serviço Profissional';
  const cleanDesc = currentDescription?.trim() || '';
  const priceStr = price && price > 0 ? `R$ ${price.toLocaleString('pt-BR')}` : '';

  const savedKey1 = typeof window !== 'undefined' ? localStorage.getItem('priceus_ai_api_key_primary') || localStorage.getItem('priceus_ai_api_key') || localStorage.getItem('priceus_groq_api_key') : null;
  const savedKey2 = typeof window !== 'undefined' ? localStorage.getItem('priceus_ai_api_key_secondary') : null;
  const savedKey3 = typeof window !== 'undefined' ? localStorage.getItem('priceus_ai_api_key_tertiary') : null;

  // Pool de chaves Groq
  const groqKeys = [
    import.meta.env.VITE_GROQ_API_KEY,
    savedKey1,
    savedKey2,
    savedKey3,
  ].filter((k): k is string => !!k && k.trim().length > 5 && !k.includes('SUA_CHAVE'));

  const systemPrompt = `Você é um especialista em neuromarketing, copywriting e estruturação de propostas comerciais de alto padrão para fotógrafos e profissionais de eventos.

REGRA DE OURO (FIDELIDADE ABSOLUTA AO TEXTO DO USUÁRIO):
1. Você DEVE ler com atenção o "TEXTO BASE DO USUÁRIO" e REESCREVER ESTE MESMO CONTEÚDO com melhorias de redação, clareza e alto poder de persuasão.
2. PRESERVE todos os fatos, etapas, números e detalhes citados no texto base (ex: número de fotógrafos, cerimônia, cortejo, retratos de recém-casados, formato da galeria, prazos).
3. Organize o texto utilizando a formatação visual do sistema PriceU$:
   - Use '#' para títulos principais de seção em caixa alta (ex: # COBERTURA DA CERIMÔNIA, # O DIA DO CASAMENTO, # EQUIPE E ENTREGA)
   - Use '✓ ' no início dos itens inclusos para listas com visto verde
   - Use '**texto**' para negrito em números e garantias importantes
   - Use '---' para separar seções
   - Use '💡 ' para destacar um bônus ou diferencial
   - Emojis elegantes com moderação (📸, ✨, 💍, 👰, ⏰, 📦, 🎁)

GERE 3 ABORDAGENS REESCREVENDO O CONTEÚDO ORIGINAL DO USUÁRIO:
1. "Alto Valor & Sofisticação" (Reescreve o texto base elevando o vocabulário, estruturando em seções com #, destacando a exclusividade e a equipe).
2. "Emocional & Experiência" (Reescreve o texto base conectando as etapas citadas à memória afetiva e ao sentimento do momento).
3. "Direto ao Ponto & Clareza" (Reescreve o texto base de forma ultra-limpa e concisa com checklist direto dos itens inclusos).

RESPONDA EXCLUSIVAMENTE UM OBJETO JSON no seguinte formato:
{
  "analysis": "Diagnóstico rápido em 1 frase de como o texto base foi reorganizado.",
  "suggestions": [
    {
      "id": 1,
      "badge": "Alto Valor & Luxo",
      "badgeColor": "indigo",
      "title": "Estrutura Premium & Percepção de Valor",
      "strategy": "Organiza todos os itens do seu texto com vocabulário sofisticado e seções de alto impacto.",
      "whyItConverts": "Valoriza cada detalhe já oferecido por você, transmitindo padrão de excelência.",
      "text": "..."
    },
    {
      "id": 2,
      "badge": "Emocional & Afetivo",
      "badgeColor": "rose",
      "title": "Estrutura Narrativa & Experiência",
      "strategy": "Conecta os pontos da sua descrição ao sentimento e à história do grande dia.",
      "whyItConverts": "Desperta a memória afetiva nos noivos/clientes valorizando cada momento descrito.",
      "text": "..."
    },
    {
      "id": 3,
      "badge": "Clareza & Conversão",
      "badgeColor": "emerald",
      "title": "Estrutura Direta & Checklist",
      "strategy": "Organização 100% transparente e objetiva dos seus itens para leitura rápida.",
      "whyItConverts": "Facilita a decisão rápida do cliente deixando tudo cristalino e de fácil aprovação.",
      "text": "..."
    }
  ]
}`;

  const userPrompt = `DADOS DO PRODUTO:
- Nome do Produto: "${cleanName}"
- Preço: "${priceStr || 'A combinar'}"
- TEXTO BASE DO USUÁRIO PARA REESCREVER:
"""
${cleanDesc || cleanName}
"""
${customInstruction ? `- Instrução Adicional: "${customInstruction}"` : ''}

Responda em JSON válido com as 3 sugestões reescrevendo o texto acima com fidelidade total aos itens.`;

  // 1. Tentar via GROQ com os modelos ativos da plataforma
  const groqModels = [
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.6-27b',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant'
  ];

  for (const key of groqKeys) {
    for (const model of groqModels) {
      try {
        console.log(`[Groq Optimizer] Chamando modelo ${model}...`);
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.6
          })
        });

        if (groqResponse.ok) {
          const groqData = await groqResponse.json();
          const content = groqData.choices?.[0]?.message?.content;
          if (content) {
            const parsed = extractJsonFromResponse(content) as ProductOptimizationResponse;
            if (parsed && parsed.suggestions && parsed.suggestions.length > 0) {
              console.log('[Groq Optimizer] ✅ Resposta gerada com sucesso via Groq:', model);
              return parsed;
            }
          }
        } else {
          const errText = await groqResponse.text();
          console.warn(`[Groq Optimizer] Tentativa no modelo (${model}) retornou status ${groqResponse.status}:`, errText);
        }
      } catch (err) {
        console.warn(`[Groq Optimizer] Falha de rede no modelo (${model}):`, err);
      }
    }
  }

  // 2. Fallback Inteligente baseado em parsing real do texto do usuário
  return generateSmartLocalFallback(cleanName, cleanDesc, priceStr);
}

/**
 * Reconstrói o texto do usuário com base no conteúdo real se a rede estiver offline.
 */
function generateSmartLocalFallback(
  productName: string,
  currentDesc: string,
  priceStr: string
): ProductOptimizationResponse {
  const rawText = currentDesc.trim();

  if (!rawText) {
    return {
      analysis: `Criamos uma estrutura completa de apresentação para "${productName}".`,
      suggestions: [
        {
          id: 1,
          badge: 'Alto Valor & Luxo',
          badgeColor: 'indigo',
          title: 'Estrutura Premium & Percepção de Valor',
          strategy: 'Organiza o serviço com foco em excelência e acabamento profissional.',
          whyItConverts: 'Elimina dúvidas sobre o valor, transformando o serviço em um investimento seguro.',
          text: `# ${productName.toUpperCase()}\n✓ Cobertura profissional completa com direção especializada\n✓ Equipamentos de última geração e iluminação dedicada\n✓ Todas as fotos tratadas em alta resolução\n✓ Galeria online privada para download e compartilhamento\n---\n💡 Diferencial: Atendimento personalizado e acompanhamento de cada detalhe.`
        },
        {
          id: 2,
          badge: 'Emocional & Afetivo',
          badgeColor: 'rose',
          title: 'Estrutura Narrativa & Experiência',
          strategy: 'Foco no sentimento, conexão afetiva e momentos inesquecíveis.',
          whyItConverts: 'Conecta com o coração do cliente, tornando a contratação uma decisão natural.',
          text: `# ${productName.toUpperCase()}\n✓ Registro sensível e espontâneo dos momentos mais marcantes\n✓ Todas as fotos tratadas com estética refinada e cores vivas\n✓ Galeria online interativa para emocionar amigos e familiares\n---\n💡 Presente especial: Mini-prévias entregues logo após o evento para compartilhar com quem você ama!`
        },
        {
          id: 3,
          badge: 'Clareza & Conversão',
          badgeColor: 'emerald',
          title: 'Estrutura Direta & Checklist',
          strategy: 'Checklist objetivo e direto ao ponto para leitura rápida em celulares.',
          whyItConverts: 'Reduz o tempo de decisão facilitando o "sim" imediato do cliente.',
          text: `# O QUE ESTÁ INCLUSO\n✓ ${productName} com atendimento dedicado\n✓ Seleção e tratamento de fotos em alta resolução\n✓ Entrega digital rápida em galeria exclusiva\n✓ Suporte e acompanhamento do início à entrega final`
        }
      ]
    };
  }

  // Decompor o texto do usuário preservando todos os termos
  const cleanLines = rawText
    .split(/[\n\r]+|---/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const sections: { title: string; items: string[] }[] = [];
  let currentSection = { title: productName.toUpperCase(), items: [] as string[] };

  cleanLines.forEach(line => {
    const matchHeader = line.match(/^([^:]+):\s*(.*)$/);
    if (matchHeader && matchHeader[1].length < 40 && !matchHeader[1].startsWith('✓') && !matchHeader[1].startsWith('#')) {
      if (currentSection.items.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        title: matchHeader[1].replace(/^[#\-\s*]+/, '').trim().toUpperCase(),
        items: []
      };
      if (matchHeader[2] && matchHeader[2].trim()) {
        const subParts = matchHeader[2].split(/\.\s+/).map(p => p.trim()).filter(Boolean);
        currentSection.items.push(...subParts);
      }
    } else {
      const subParts = line.split(/\.\s+/).map(p => p.trim()).filter(Boolean);
      currentSection.items.push(...subParts);
    }
  });

  if (currentSection.items.length > 0) {
    sections.push(currentSection);
  }

  // Variação 1: Alto Valor & Luxo
  const text1 = sections.map(sec => {
    const formattedItems = sec.items.map(item => {
      const bolded = item.replace(/(\b\d+\s*fot[oó]grafos?\s*profissionais?\b|\bcerim[oô]nia\b|\bgaleria\s*online\b|\balta\s*resolu[cç][aã]o\b)/gi, '**$1**');
      return `✓ ${bolded.replace(/^✓\s*/, '')}`;
    }).join('\n');
    return `# ${sec.title}\n${formattedItems}`;
  }).join('\n---\n');

  // Variação 2: Emocional & Afetivo
  const text2 = sections.map(sec => {
    const formattedItems = sec.items.map(item => `✓ ${item.replace(/^✓\s*/, '')}`).join('\n');
    return `# ${sec.title}\n${formattedItems}`;
  }).join('\n---\n') + `\n---\n💡 Pensado com carinho para registrar com perfeição cada momento do seu grande dia.`;

  // Variação 3: Direto ao Ponto & Clareza
  const allItems = sections.flatMap(sec => sec.items);
  const text3 = `# RESUMO DO PACOTE\n` + allItems.map(item => `✓ ${item.replace(/^✓\s*/, '')}`).join('\n');

  return {
    analysis: `Reescrevemos o seu texto original preservando todos os itens, equipe e etapas, com formatação visual de alta conversão.`,
    suggestions: [
      {
        id: 1,
        badge: 'Alto Valor & Luxo',
        badgeColor: 'indigo',
        title: 'Estrutura Premium & Percepção de Valor',
        strategy: 'Organiza exatamente o que você escreveu com títulos destacados e formatação de alto padrão.',
        whyItConverts: 'Valoriza sua equipe, cobertura e entregas com padrão de excelência.',
        text: text1
      },
      {
        id: 2,
        badge: 'Emocional & Afetivo',
        badgeColor: 'rose',
        title: 'Estrutura Narrativa & Experiência',
        strategy: 'Enfatiza a importância de cada momento e entrega descrita no seu texto.',
        whyItConverts: 'Toca na sensibilidade do cliente ao destacar a celebração e memórias afetivas.',
        text: text2
      },
      {
        id: 3,
        badge: 'Clareza & Conversão',
        badgeColor: 'emerald',
        title: 'Estrutura Direta & Checklist',
        strategy: 'Checklist unificado com leitura super rápida para decisões ágeis no celular.',
        whyItConverts: 'Mostra tudo o que está incluso sem rodeios, facilitando o fechamento imediato.',
        text: text3
      }
    ]
  };
}
