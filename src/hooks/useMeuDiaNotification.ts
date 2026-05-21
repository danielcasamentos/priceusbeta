import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook que dispara notificações diárias no primeiro acesso do dia.
 *
 * Comportamento:
 * - Roda uma vez por dia por usuário (controla via localStorage `meu_dia_notif_date_<userId>`).
 * - Emite notificações individuais por tarefa atrasada, vencendo hoje e vencendo amanhã.
 * - Mantém a notificação de resumo geral (eventos + receitas pendentes).
 * - Todas as notificações apontam para `/dashboard/meu-dia`.
 */
export function useMeuDiaNotification(userId: string) {
  const fired = useRef(false);

  useEffect(() => {
    if (!userId || fired.current) return;
    fired.current = true;

    const sendDailyNotification = async () => {
      const today = new Date().toISOString().split('T')[0];
      const storageKey = `meu_dia_notif_date_${userId}`;

      // ── Verificar se já disparou hoje (localStorage — evita chamada Supabase desnecessária) ──
      const lastFired = localStorage.getItem(storageKey);
      if (lastFired === today) return;

      // ── Buscar tarefas de workflow urgentes ──────────────────────────────────────
      const pad = (n: number) => String(n).padStart(2, '0');
      const makeDate = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

      const amanhaDate = new Date();
      amanhaDate.setDate(amanhaDate.getDate() + 1);
      const amanha = makeDate(amanhaDate);

      const [leadsRes, evRes, trRes] = await Promise.all([
        supabase
          .from('leads')
          .select('id, nome_cliente, workflow')
          .eq('user_id', userId)
          .eq('status', 'convertido'),
        supabase
          .from('eventos_agenda')
          .select('id')
          .eq('user_id', userId)
          .eq('data_evento', today)
          .neq('status', 'cancelado'),
        supabase
          .from('company_transactions')
          .select('id, valor, status')
          .eq('user_id', userId)
          .eq('data', today)
          .eq('tipo', 'receita'),
      ]);

      const notificacoesParaInserir: Array<{
        user_id: string;
        type: string;
        title: string;
        message: string;
        link: string;
        related_id: string | null;
        read: boolean;
      }> = [];

      // ── Processar etapas urgentes de cada lead ───────────────────────────────────
      for (const lead of leadsRes.data || []) {
        const wf = Array.isArray(lead.workflow) ? lead.workflow : [];
        for (const step of wf) {
          if (step.status === 'concluido') continue;
          const prazo: string | null = step.deadline || step.prazo || null;
          if (!prazo) continue;

          const stepNome: string = step.label || step.nome || step.title || 'Tarefa';

          if (prazo < today) {
            // Atrasada
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const prazoDate = new Date(prazo + 'T00:00:00');
            const diasAtraso = Math.round(
              (hoje.getTime() - prazoDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            notificacoesParaInserir.push({
              user_id: userId,
              type: 'meu_dia_tarefa_atrasada',
              title: '🔴 Tarefa atrasada!',
              message: `"${stepNome}" de ${lead.nome_cliente || 'Cliente'} está atrasada há ${diasAtraso} dia${diasAtraso !== 1 ? 's' : ''}`,
              link: '/dashboard/meu-dia',
              related_id: step.id || null,
              read: false,
            });
          } else if (prazo === today) {
            // Vence hoje
            notificacoesParaInserir.push({
              user_id: userId,
              type: 'meu_dia_tarefa_hoje',
              title: '🟡 Prazo hoje!',
              message: `⚠️ "${stepNome}" de ${lead.nome_cliente || 'Cliente'} vence hoje — não deixe para depois!`,
              link: '/dashboard/meu-dia',
              related_id: step.id || null,
              read: false,
            });
          } else if (prazo === amanha) {
            // Vence amanhã
            notificacoesParaInserir.push({
              user_id: userId,
              type: 'meu_dia_tarefa_amanha',
              title: '🟠 Prazo amanhã',
              message: `"${stepNome}" de ${lead.nome_cliente || 'Cliente'} vence amanhã`,
              link: '/dashboard/meu-dia',
              related_id: step.id || null,
              read: false,
            });
          }
        }
      }

      // ── Notificação de resumo geral (eventos + receitas) ─────────────────────────
      const eventos = evRes.data?.length || 0;
      const receitasPendentes =
        trRes.data
          ?.filter((t) => t.status === 'pendente')
          .reduce((s: number, t: any) => s + (t.valor || 0), 0) || 0;
      const fmtCur = (v: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

      if (eventos > 0 || receitasPendentes > 0) {
        const parts: string[] = [];
        if (eventos > 0) parts.push(`📅 ${eventos} evento${eventos > 1 ? 's' : ''} hoje`);
        if (receitasPendentes > 0) parts.push(`💰 ${fmtCur(receitasPendentes)} a receber`);

        notificacoesParaInserir.push({
          user_id: userId,
          type: 'meu_dia_resumo',
          title: '☀️ Resumo do seu dia',
          message: parts.join(' • '),
          link: '/dashboard/meu-dia',
          related_id: null,
          read: false,
        });
      }

      // ── Inserir todas as notificações de uma vez ─────────────────────────────────
      if (notificacoesParaInserir.length > 0) {
        await supabase.from('notifications').insert(notificacoesParaInserir);
      }

      // ── Marcar como disparado hoje no localStorage ───────────────────────────────
      localStorage.setItem(storageKey, today);
    };

    // Aguarda 3 segundos para não bloquear o carregamento inicial da página
    const timer = setTimeout(sendDailyNotification, 3000);
    return () => clearTimeout(timer);
  }, [userId]);
}
