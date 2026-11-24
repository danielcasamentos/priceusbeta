import { useMemo } from 'react';
import { WorkflowStep, SlaResult, WorkflowProgress } from '../types/workflow';
import { supabase } from '../lib/supabase';
import { Lead } from '../lib/supabase';

// ==========================================================
// PriceUs — Hook de SLA do Workflow
// Calcula status de prazo por etapa e progresso geral.
// Também dispara notificações para etapas atrasadas/urgentes.
// ==========================================================

const DIAS_ATENCAO = 5; // Threshold de "vence em breve"

/**
 * Calcula o SLA de uma única etapa com base no deadline e status.
 * Retorna objeto com status, dias restantes e classes de cor.
 */
export function calcularSlaEtapa(step: WorkflowStep): SlaResult {
  // Etapa concluída — não precisa de alerta
  if (step.status === 'concluido') {
    return {
      status: 'concluido',
      diasRestantes: null,
      label: 'Concluída',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    };
  }

  // Etapa pausada — suprime alerta visual
  if (step.status === 'aguardando_cliente') {
    return {
      status: 'pausado',
      diasRestantes: null,
      label: 'Aguardando cliente',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    };
  }

  // Sem deadline definido
  if (!step.deadline) {
    return {
      status: 'em_dia',
      diasRestantes: null,
      label: 'Sem prazo',
      color: 'text-gray-500 dark:text-gray-400',
      bgColor: 'bg-gray-100 dark:bg-[#0a1628]/50',
    };
  }

  // Calcular dias restantes
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const deadline = new Date(step.deadline + 'T00:00:00');
  const diffMs = deadline.getTime() - hoje.getTime();
  const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) {
    const diasAtraso = Math.abs(diasRestantes);
    return {
      status: 'atrasado',
      diasRestantes,
      label: `Atrasada ${diasAtraso}d`,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    };
  }

  if (diasRestantes <= DIAS_ATENCAO) {
    return {
      status: 'atencao',
      diasRestantes,
      label: `Vence em ${diasRestantes}d`,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    };
  }

  return {
    status: 'em_dia',
    diasRestantes,
    label: `${diasRestantes}d restantes`,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  };
}

/**
 * Hook que recebe um array de etapas e retorna:
 * - slaMap: mapa de stepId → SlaResult
 * - progress: progresso geral do workflow
 */
export function useWorkflowSla(workflow: WorkflowStep[]): {
  slaMap: Record<string, SlaResult>;
  progress: WorkflowProgress;
} {
  return useMemo(() => {
    const slaMap: Record<string, SlaResult> = {};
    const pendentes: WorkflowStep[] = [];

    workflow.forEach((step) => {
      slaMap[step.id] = calcularSlaEtapa(step);
      if (step.status !== 'concluido') {
        pendentes.push(step);
      }
    });

    // Encontrar próxima etapa crítica (mais urgente entre as pendentes)
    let proxEtapaCritica: WorkflowStep | null = null;
    let proxSla: SlaResult | null = null;
    let menorDias: number = Infinity;

    for (const step of pendentes) {
      const sla = slaMap[step.id];
      const dias = sla.diasRestantes ?? Infinity;
      if (dias < menorDias) {
        menorDias = dias;
        proxEtapaCritica = step;
        proxSla = sla;
      }
    }

    // Se nenhuma tem deadline, pegar a primeira pendente
    if (!proxEtapaCritica && pendentes.length > 0) {
      proxEtapaCritica = pendentes[0];
      proxSla = slaMap[pendentes[0].id];
    }

    const concluidas = workflow.filter((s) => s.status === 'concluido').length;
    const total = workflow.length;
    const percentual = total > 0 ? Math.round((concluidas / total) * 100) : 0;

    return {
      slaMap,
      progress: {
        total,
        concluidas,
        percentual,
        proxEtapaCritica,
        proxSla,
        todasConcluidas: total > 0 && concluidas === total,
      },
    };
  }, [workflow]);
}

// ==========================================================
// Notificações de Workflow (chamada assíncrona, não é hook)
// Verifica etapas atrasadas/urgentes e cria notificações
// na tabela notifications do Supabase (sem duplicar).
// ==========================================================

const NOTIF_COOLDOWN_HOURS = 24; // Não re-notifica dentro de 24h pelo mesmo step+tipo

export async function checkAndCreateWorkflowNotifications(
  leads: Lead[],
  userId: string
): Promise<void> {
  try {
    const leadsEmProducao = leads.filter(
      (l) => l.status === 'convertido' && Array.isArray(l.workflow) && l.workflow.length > 0
    );

    if (leadsEmProducao.length === 0) return;

    // Buscar notificações de workflow recentes para não duplicar
    const cooldownDate = new Date();
    cooldownDate.setHours(cooldownDate.getHours() - NOTIF_COOLDOWN_HOURS);

    const { data: existentes } = await supabase
      .from('notifications')
      .select('related_id, type, created_at')
      .eq('user_id', userId)
      .like('type', 'workflow_sla_%')
      .gte('created_at', cooldownDate.toISOString());

    // Mapa de notificações recentes: "stepId|type" → true
    const existentesMap = new Set(
      (existentes || []).map((n: any) => `${n.related_id}|${n.type}`)
    );

    const notificacoesParaInserir: any[] = [];

    for (const lead of leadsEmProducao) {
      const workflow: WorkflowStep[] = lead.workflow as WorkflowStep[];

      for (const step of workflow) {
        const sla = calcularSlaEtapa(step);
        let type: string | null = null;
        let emoji = '';
        let msg = '';

        if (sla.status === 'atrasado') {
          type = 'workflow_sla_atrasado';
          emoji = '🔴';
          msg = `${emoji} Etapa "${step.label}" de ${lead.nome_cliente || 'Cliente'} está atrasada!`;
        } else if (sla.status === 'atencao') {
          type = 'workflow_sla_atencao';
          emoji = '🟠';
          msg = `${emoji} Etapa "${step.label}" de ${lead.nome_cliente || 'Cliente'} vence em ${sla.diasRestantes} dia(s).`;
        }

        if (!type) continue;

        const key = `${step.id}|${type}`;
        if (existentesMap.has(key)) continue; // Já notificado recentemente

        notificacoesParaInserir.push({
          user_id: userId,
          type,
          title: type === 'workflow_sla_atrasado' ? 'Etapa atrasada!' : 'Prazo se aproximando',
          message: msg,
          related_id: step.id,
          link: '/dashboard/leads',
          read: false,
        });
      }
    }

    if (notificacoesParaInserir.length > 0) {
      await supabase.from('notifications').insert(notificacoesParaInserir);
    }
  } catch (err) {
    // Notificações são non-critical — falha silenciosa
    console.warn('[WorkflowSLA] Falha ao criar notificações:', err);
  }
}

/**
 * Cria uma notificação de lead movido para Finalizado.
 */
export async function notifyLeadFinalizado(
  lead: Lead,
  userId: string
): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'workflow_finalizado',
      title: 'Projeto finalizado! 🎉',
      message: `✅ O projeto de ${lead.nome_cliente || 'Cliente'} foi concluído. Que tal solicitar uma avaliação?`,
      related_id: lead.id,
      link: '/dashboard/leads',
      read: false,
    });
  } catch (err) {
    console.warn('[WorkflowSLA] Falha ao notificar finalização:', err);
  }
}
