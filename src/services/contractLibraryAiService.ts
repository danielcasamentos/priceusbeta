import { callGroqJson } from './geminiProductOptimizerService';

export interface ContractLibraryTemplate {
  id: string;
  name: string;
  category: string;
  summary: string;
  legalHighlights: string[];
  content_text: string;
}

const COMMON_HEADER = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS — {{NOME_EMPRESA}}

CONTRATANTE: {{NOME_COMPLETO_CLIENTE}}, inscrito(a) no CPF nº {{CPF_CLIENTE}}, RG {{RG_CLIENTE}}, residente em {{ENDERECO_COMPLETO_CLIENTE}}, CEP {{CEP_CLIENTE}}, telefone {{TELEFONE_CLIENTE}}, e-mail {{EMAIL_CLIENTE}}.
CONTRATADO(A): {{NOME_EMPRESA}}, CPF/CNPJ {{DOCUMENTO_EMPRESA}}, com sede em {{ENDERECO_EMPRESA}}, telefone {{TELEFONE_EMPRESA}}, e-mail {{EMAIL_EMPRESA}}.

As partes acima qualificadas celebram o presente instrumento, regido pelo Código Civil Brasileiro, pelo Código de Defesa do Consumidor e pela LGPD (Lei nº 13.709/2018), mediante as cláusulas seguintes:`;

const COMMON_FOOTER = `CLÁUSULA DE OBSERVAÇÕES E CONDIÇÕES ESPECÍFICAS:
{{OBSERVACOES_CLIENTE}}

CLÁUSULA DE FORO:
Fica eleito o foro da comarca da sede do(a) CONTRATADO(A) ({{CIDADE_EMPRESA}}/{{ESTADO_EMPRESA}}) para dirimir quaisquer controvérsias oriundas deste contrato, com renúncia a qualquer outro, por mais privilegiado que seja.

E, por estarem justas e contratadas, as partes assinam o presente instrumento eletronicamente, com plena validade jurídica.

{{CIDADE_EMPRESA}}, {{DATA_ATUAL}}.`;

function buildFallbackLibrary(niche: string): ContractLibraryTemplate[] {
  const cleanNiche = niche.trim() || 'Eventos e Serviços Profissionais';
  const specs: Array<{
    name: string;
    category: string;
    summary: string;
    focus: string;
    highlights: string[];
  }> = [
    {
      name: `Contrato Completo — ${cleanNiche}`,
      category: 'Principal',
      summary: 'Cobertura integral com delimitação de horários, horas extras, multa rescisória e força maior.',
      focus: `prestação completa de serviços de ${cleanNiche}, conforme itens e valores contratados: {{LISTA_PRODUTOS}}`,
      highlights: ['Horas extras limitadas', 'Multa rescisória escalonada', 'Força maior e substituição técnica'],
    },
    {
      name: `Contrato Pacote Essencial — ${cleanNiche}`,
      category: 'Principal',
      summary: 'Versão objetiva para pacotes enxutos com proteção contra atrasos e cancelamento.',
      focus: `execução do pacote essencial de ${cleanNiche}, estritamente nos limites descritos na proposta aprovada ({{LISTA_PRODUTOS}})`,
      highlights: ['Escopo fechado', 'Tolerância de atraso', 'Prazo de entrega definido'],
    },
    {
      name: `Contrato de Evento Social / Casamento — ${cleanNiche}`,
      category: 'Eventos Sociais',
      summary: 'Cláusulas específicas para cerimônias, recepções, equipe de apoio e alimentação.',
      focus: `atendimento em evento social/casamento na área de ${cleanNiche}, incluindo deslocamento para {{CIDADE_EVENTO}}`,
      highlights: ['Logística e alimentação', 'Proteção de equipamentos', 'Direito de imagem e LGPD'],
    },
    {
      name: `Contrato Corporativo / Empresarial — ${cleanNiche}`,
      category: 'Corporativo',
      summary: 'Adequado para empresas, nota fiscal, confidencialidade e prazos rígidos.',
      focus: `prestação de serviços corporativos de ${cleanNiche} para evento empresarial`,
      highlights: ['Confidencialidade (NDA)', 'Inadimplência e juros', 'Responsabilidade civil limitada'],
    },
    {
      name: `Contrato de Ensaio / Sessão Avulsa — ${cleanNiche}`,
      category: 'Sessões',
      summary: 'Ideal para sessões externas/estúdio com reagendamento climático e seleção de extras.',
      focus: `realização de sessão/serviço avulso de ${cleanNiche}`,
      highlights: ['Reagendamento climático', 'Atraso do cliente', 'Cobrança de extras'],
    },
    {
      name: `Contrato de Prestação Recorrente / Mensal — ${cleanNiche}`,
      category: 'Recorrente',
      summary: 'Para atendimentos contínuos com aviso prévio de 30 dias e reajuste.',
      focus: `serviços contínuos de ${cleanNiche} com entregas periódicas`,
      highlights: ['Aviso prévio 30 dias', 'Inadimplência suspende entrega', 'Escopo mensal delimitado'],
    },
    {
      name: `Termo Aditivo de Alteração de Data / Horário`,
      category: 'Aditivo',
      summary: 'Formaliza remarcação mantendo validade das cláusulas originais e eventual taxa.',
      focus: `alteração consensual de data, local ou horários originalmente pactuados para ${cleanNiche}`,
      highlights: ['Mantém contrato original', 'Disponibilidade de agenda', 'Atualização de deslocamento'],
    },
    {
      name: `Termo Aditivo de Inclusão de Serviços Extras`,
      category: 'Aditivo',
      summary: 'Registra upgrades, horas adicionais ou novos produtos contratados após fechamento.',
      focus: `inclusão de itens adicionais ao contrato principal de ${cleanNiche} ({{LISTA_PRODUTOS}})`,
      highlights: ['Adição segura de valor', 'Prazo de pagamento extra', 'Sem novação'],
    },
    {
      name: `Termo de Autorização de Uso de Imagem & LGPD — ${cleanNiche}`,
      category: 'Jurídico / LGPD',
      summary: 'Autoriza ou restringe portfólio e redes sociais em conformidade com a LGPD.',
      focus: `disciplinamento de direitos autorais, portfólio e tratamento de dados pessoais referentes a ${cleanNiche}`,
      highlights: ['Conformidade LGPD', 'Direitos autorais preservados', 'Opção de revogação futura'],
    },
    {
      name: `Distrato / Cancelamento Consensual — ${cleanNiche}`,
      category: 'Rescisão',
      summary: 'Encerra o vínculo contratual com quitação recíproca e retenção proporcional.',
      focus: `rescisão amigável da contratação de ${cleanNiche} e quitação das obrigações`,
      highlights: ['Quitação plena', 'Retenção proporcional', 'Liberação de agenda'],
    },
  ];

  return specs.map((s, idx) => ({
    id: `fallback-contract-${idx + 1}`,
    name: s.name,
    category: s.category,
    summary: s.summary,
    legalHighlights: s.highlights,
    content_text: `${COMMON_HEADER}

CLÁUSULA 1ª — DO OBJETO E DELIMITAÇÃO
O presente contrato tem por objeto a ${s.focus}.
Datas, locais e horários contratados:
{{DATAS_HORARIOS_EVENTO}}
Local: {{LOCAL_EVENTO}} — {{CIDADE_EVENTO}}.
Parágrafo único: Serviços não descritos expressamente ou horas excedentes ao horário contratado ({{HORARIO_INICIO}} às {{HORARIO_FIM}}) serão cobrados à parte mediante aprovação prévia e disponibilidade da equipe.

CLÁUSULA 2ª — DO VALOR E CONDIÇÕES DE PAGAMENTO
Pela execução do objeto, o(a) CONTRATANTE pagará ao(à) CONTRATADO(A) o valor total de {{VALOR_TOTAL}}, na forma: {{FORMA_PAGAMENTO}}.
Parágrafo 1º: O atraso no pagamento de qualquer parcela implicará multa moratória de 2% (dois por cento), juros de 1% ao mês pro rata die e correção monetária pelo IPCA, ficando o(a) CONTRATADO(A) desobrigado(a) de realizar entregas finais até a regularização.
Parágrafo 2º: O sinal/entrada destina-se à reserva exclusiva da data na agenda, sendo retido em caso de desistência imotivada nos termos da Cláusula 3ª.

CLÁUSULA 3ª — CANCELAMENTO, REMARCAÇÃO E MULTA RESCISÓRIA
Em caso de cancelamento por iniciativa do(a) CONTRATANTE:
a) Com mais de 60 dias de antecedência: retenção de 20% do valor total (ou do sinal pago) a título de reserva de agenda e custos administrativos;
b) Entre 30 e 59 dias: retenção de 40% do valor total;
c) Com menos de 30 dias da data do evento: retenção de 60% do valor total, além de despesas já comprovadamente realizadas.
Parágrafo único: Pedidos de remarcação dependem da disponibilidade de agenda do(a) CONTRATADO(A) e podem sofrer atualização de valores se transferidos para outro exercício ou outra cidade.

CLÁUSULA 4ª — FORÇA MAIOR, CASO FORTUITO E SUBSTITUIÇÃO TÉCNICA
Na hipótese de doença súbita, acidente, calamidade ou caso fortuito que impeça o comparecimento pessoal do profissional titular, o(a) CONTRATADO(A) poderá designar profissional substituto de equivalente qualificação técnica, mantendo integralmente o padrão de entrega, sem que isso configure inadimplemento. Em caso de impossibilidade absoluta por força maior, a responsabilidade limita-se à restituição integral dos valores pagos pelo(a) CONTRATANTE.

CLÁUSULA 5ª — LOGÍSTICA, SEGURANÇA E RESPONSABILIDADES DO CONTRATANTE
O(A) CONTRATANTE compromete-se a garantir acesso seguro ao local, condições adequadas de trabalho para equipe e equipamentos, bem como alimentação básica da equipe quando a duração superar 5 (cinco) horas contínuas. Danos causados aos equipamentos por convidados ou terceiros no local serão de responsabilidade do(a) CONTRATANTE.

CLÁUSULA 6ª — PRAZOS DE ENTREGA, DIREITOS AUTORAIS E LGPD
Os entregáveis contratados serão disponibilizados no prazo acordado após a realização do evento e quitação integral. Os direitos autorais patrimoniais e morais pertencem ao(à) CONTRATADO(A) (Lei nº 9.610/98), vedada a alteração comercial ou revenda a terceiros sem autorização. Os dados pessoais das partes serão tratados exclusivamente para execução deste contrato, em conformidade com a LGPD (Lei nº 13.709/2018).

${COMMON_FOOTER}`,
  }));
}

export async function generateContractLibraryByNiche(
  niche: string
): Promise<{ source: 'ai' | 'fallback'; contracts: ContractLibraryTemplate[] }> {
  const cleanNiche = niche.trim() || 'Eventos e Serviços Profissionais';

  const systemPrompt = `Você é um advogado especialista em Direito Contratual Brasileiro (Código Civil, CDC e LGPD) para prestadores de serviços e profissionais de eventos.

Gere uma BIBLIOTECA COM EXATAMENTE 10 MODELOS DE CONTRATO EDITÁVEIS para o ramo de negócio informado, com PROTEÇÃO JURÍDICA FORTE para o prestador de serviços (equilibrada e válida no Brasil).

Cada contrato DEVE:
1. Usar as variáveis dinâmicas do PriceU$:
   {{NOME_EMPRESA}}, {{DOCUMENTO_EMPRESA}}, {{ENDERECO_EMPRESA}}, {{TELEFONE_EMPRESA}}, {{EMAIL_EMPRESA}}, {{CIDADE_EMPRESA}}, {{ESTADO_EMPRESA}},
   {{NOME_COMPLETO_CLIENTE}}, {{CPF_CLIENTE}}, {{RG_CLIENTE}}, {{ENDERECO_COMPLETO_CLIENTE}}, {{CEP_CLIENTE}}, {{TELEFONE_CLIENTE}}, {{EMAIL_CLIENTE}},
   {{DATAS_HORARIOS_EVENTO}}, {{HORARIO_INICIO}}, {{HORARIO_FIM}}, {{LOCAL_EVENTO}}, {{CIDADE_EVENTO}},
   {{LISTA_PRODUTOS}}, {{VALOR_TOTAL}}, {{FORMA_PAGAMENTO}}, {{OBSERVACOES_CLIENTE}}, {{DATA_ATUAL}}.
2. Conter cláusulas jurídicas robustas e práticas (mínimo 6 cláusulas numeradas):
   - Objeto delimitado + horas extras
   - Valor, forma de pagamento e juros/multa por inadimplência + suspensão de entrega
   - Cancelamento/remarcação com retenção proporcional escalonada pelo prazo
   - Caso fortuito/força maior e substituição técnica equivalente
   - Responsabilidade por local, acesso, segurança de equipamentos e alimentação (quando aplicável)
   - Direitos autorais/imagem/LGPD, observações ({{OBSERVACOES_CLIENTE}}) e Foro de eleição.
3. Variar entre os 10 cenários mais úteis do ramo (ex.: Contrato Completo, Pacote Essencial, Evento Social/Casamento, Corporativo, Sessão/Serviço Avulso, Recorrente, Aditivo de Data/Horário, Aditivo de Serviços Extras, Termo de Imagem & LGPD, Distrato Consensual).

RESPONDA EXCLUSIVAMENTE EM JSON:
{
  "contracts": [
    {
      "name": "Nome do modelo",
      "category": "Categoria curta",
      "summary": "Resumo em 1 frase",
      "legalHighlights": ["Proteção 1", "Proteção 2", "Proteção 3"],
      "content_text": "Texto completo do contrato com as cláusulas e {{VARIAVEIS}}"
    }
  ]
}`;

  const userPrompt = `RAMO DE NEGÓCIO DO USUÁRIO: "${cleanNiche}"
Gere os 10 modelos de contrato juridicamente robustos e editáveis para este ramo.`;

  const parsed = await callGroqJson<{ contracts?: any[] }>(
    systemPrompt,
    userPrompt,
    0.45,
    4000
  );

  if (parsed?.contracts && Array.isArray(parsed.contracts) && parsed.contracts.length >= 5) {
    const normalized: ContractLibraryTemplate[] = parsed.contracts.slice(0, 10).map((c, idx) => ({
      id: `ai-contract-${Date.now()}-${idx}`,
      name: String(c.name || `Modelo ${idx + 1} — ${cleanNiche}`),
      category: String(c.category || 'Modelo IA'),
      summary: String(c.summary || 'Contrato com proteção jurídica para o prestador.'),
      legalHighlights: Array.isArray(c.legalHighlights)
        ? c.legalHighlights.map(String).slice(0, 4)
        : ['Proteção jurídica', 'Cláusulas editáveis'],
      content_text: String(c.content_text || ''),
    })).filter((c) => c.content_text.trim().length > 100);

    if (normalized.length > 0) {
      return { source: 'ai', contracts: normalized };
    }
  }

  return {
    source: 'fallback',
    contracts: buildFallbackLibrary(cleanNiche),
  };
}

