// ==========================================================
// PriceUs — Tipos do Sistema de Workflow de Leads
// ==========================================================

/**
 * Status possíveis de uma etapa do workflow.
 * - pendente: ainda não iniciada
 * - concluido: etapa marcada como feita
 * - aguardando_cliente: pausa visual — não gera alerta de SLA
 */
export type WorkflowStepStatus = 'pendente' | 'concluido' | 'aguardando_cliente';

/**
 * Status de SLA calculado para exibição de badge colorido.
 * - em_dia: deadline > 5 dias no futuro
 * - atencao: deadline entre 0 e 5 dias (laranja)
 * - atrasado: deadline no passado (vermelho)
 * - pausado: etapa em aguardando_cliente (azul)
 * - concluido: etapa já finalizada (verde)
 */
export type SlaStatus = 'em_dia' | 'atencao' | 'atrasado' | 'pausado' | 'concluido';

/**
 * Uma etapa do workflow de um lead específico.
 */
export interface WorkflowStep {
  /** UUID gerado no frontend para identificação única */
  id: string;
  /** Nome da etapa (editável inline) */
  label: string;
  /** Descrição/instrução do que fazer (editável inline) */
  description: string;
  /** Data limite no formato YYYY-MM-DD */
  deadline: string;
  /** Status atual da etapa */
  status: WorkflowStepStatus;
  /** Timestamp ISO registrado quando a etapa foi concluída, usado para estatísticas de produtividade */
  completedAt?: string;
  /** Duração em minutos da tarefa */
  duracao_minutos?: number | null;
  /** Horário de início em formato HH:MM */
  horario_inicio?: string | null;
  /** Local do trabalho: interno (escritório/estúdio) ou externo (evento/sessão) */
  ambiente?: 'interno' | 'externo' | null;
}

/**
 * Resultado do cálculo de SLA de uma etapa.
 */
export interface SlaResult {
  status: SlaStatus;
  diasRestantes: number | null;
  label: string;
  color: string;     // Classe Tailwind de cor de texto
  bgColor: string;   // Classe Tailwind de cor de fundo
}

/**
 * Template de workflow reutilizável salvo pelo profissional.
 * As etapas não têm deadline (será calculado ao aplicar)
 * nem id (será gerado ao instanciar).
 */
export interface WorkflowTemplateStep {
  label: string;
  description: string;
  duracao_minutos?: number | null;
  horario_inicio?: string | null;
  ambiente?: 'interno' | 'externo' | null;
}

export interface WorkflowTemplate {
  id: string;
  user_id: string;
  nome: string;
  etapas: WorkflowTemplateStep[];
  created_at: string;
  updated_at: string;
}

/**
 * Resultado do progresso geral de um workflow.
 */
export interface WorkflowProgress {
  total: number;
  concluidas: number;
  percentual: number;
  proxEtapaCritica: WorkflowStep | null;
  proxSla: SlaResult | null;
  todasConcluidas: boolean;
}
