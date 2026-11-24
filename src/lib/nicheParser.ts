// ==========================================================
// PriceUs — Niche and Keyword Parser for Workflows
// ==========================================================

import { WorkflowStep } from '../types/workflow';

/**
 * Normaliza textos removendo acentos, cedilhas, maiúsculas e espaços excedentes.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export interface SuggestedTask {
  label: string;
  description: string;
  duracao_minutos: number;
  ambiente: 'interno' | 'externo';
}

// Configurações de tarefas por palavras-chave (Nicho: Fotografia)
const FOTOGRAFIA_KEYWORDS_MAP: Array<{
  keywords: string[];
  tasks: SuggestedTask[];
}> = [
  {
    keywords: ['casamento', 'wedding', 'festa', 'ceremonia'],
    tasks: [
      {
        label: 'Fotografar: Cobertura de Casamento',
        description: 'Fotografia presencial de toda a cerimônia e festa do casamento.',
        duracao_minutos: 480, // 8h
        ambiente: 'externo',
      },
      {
        label: 'Edição e Tratamento de Fotos',
        description: 'Tratamento de cor, corte e retoque fino das fotos entregues.',
        duracao_minutos: 240, // 4h
        ambiente: 'interno',
      },
      {
        label: 'Entrega da Galeria Online',
        description: 'Enviar link da galeria selecionada e tratada para aprovação do cliente.',
        duracao_minutos: 60, // 1h
        ambiente: 'interno',
      }
    ],
  },
  {
    keywords: ['ensaio', 'pre-wedding', 'sessao', 'gestante', 'corporativo', 'editorial', '15 anos', 'debutante'],
    tasks: [
      {
        label: 'Fotografar: Ensaio Externo/Estúdio',
        description: 'Realização do ensaio fotográfico contratado.',
        duracao_minutos: 120, // 2h
        ambiente: 'externo',
      },
      {
        label: 'Seleção e Tratamento do Ensaio',
        description: 'Curadoria e pós-processamento do ensaio.',
        duracao_minutos: 120, // 2h
        ambiente: 'interno',
      }
    ],
  },
  {
    keywords: ['album', 'fotolivro', 'impressao', 'encadernacao'],
    tasks: [
      {
        label: 'Diagramação do Álbum',
        description: 'Montagem do layout das páginas do álbum de fotos.',
        duracao_minutos: 180, // 3h
        ambiente: 'interno',
      },
      {
        label: 'Envio para Encadernadora',
        description: 'Aprovação de layout e envio do arquivo para impressão do álbum físico.',
        duracao_minutos: 60, // 1h
        ambiente: 'interno',
      }
    ],
  }
];

/**
 * Analisa os produtos contratados no lead/orçamento e sugere as etapas do workflow com durações inteligentes.
 */
export function suggestWorkflowTasksFromProducts(
  produtosSelecionados: Array<{ nome: string; descricao?: string; duracao_minutos?: number | null }>,
  niche: string = 'fotografia'
): WorkflowStep[] {
  const sugestoes: SuggestedTask[] = [];
  const addedLabels = new Set<string>();

  const addTask = (task: SuggestedTask) => {
    if (!addedLabels.has(task.label.toLowerCase())) {
      sugestoes.push(task);
      addedLabels.add(task.label.toLowerCase());
    }
  };

  for (const prod of produtosSelecionados) {
    const nomeNorm = normalizeText(prod.nome);
    const descNorm = normalizeText(prod.descricao || '');
    const dbDuration = prod.duracao_minutos;

    let matchedNiche = false;
    
    if (niche === 'fotografia') {
      for (const mapping of FOTOGRAFIA_KEYWORDS_MAP) {
        const match = mapping.keywords.some(
          (kw) => nomeNorm.includes(kw) || descNorm.includes(kw)
        );

        if (match) {
          matchedNiche = true;
          mapping.tasks.forEach((t) => {
            // Se for trabalho externo e houver duração específica salva no produto, usar ela
            let duration = t.duracao_minutos;
            if (t.ambiente === 'externo' && dbDuration) {
              duration = dbDuration;
            }
            addTask({
              ...t,
              duracao_minutos: duration,
            });
          });
        }
      }
    }

    if (!matchedNiche) {
      // Caso genérico se não bater nenhuma palavra-chave
      addTask({
        label: `Execução: ${prod.nome}`,
        description: prod.descricao || `Serviço contratado: ${prod.nome}`,
        duracao_minutos: dbDuration || 120, // default 2h
        ambiente: 'externo',
      });
      addTask({
        label: `Pós-produção: ${prod.nome}`,
        description: 'Trabalho administrativo ou edição pós-serviço.',
        duracao_minutos: dbDuration ? Math.round(dbDuration * 0.5) : 60, // 50% do tempo de execução
        ambiente: 'interno',
      });
    }
  }

  // Gera instâncias de WorkflowStep prontas para serem salvas
  return sugestoes.map((t) => ({
    id: crypto.randomUUID(),
    label: t.label,
    description: t.description,
    deadline: '',
    status: 'pendente',
    duracao_minutos: t.duracao_minutos,
    ambiente: t.ambiente,
  }));
}
