import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook que dispara UMA notificação de saudação no primeiro acesso do dia.
 *
 * Comportamento:
 * - Roda uma vez por dia por usuário (controla via localStorage `meu_dia_notif_date_<userId>`).
 * - Busca: tarefas atrasadas + com prazo hoje, pagamentos do dia, follow-ups do dia.
 * - Emite UMA ÚNICA notificação de resumo tipo "Bom dia, você tem X tarefas..."
 * - Se não houver nada relevante, NÃO emite nenhuma notificação (para não poluir).
 * - Aponta para `/dashboard/meu-dia`.
 */
export function useMeuDiaNotification(userId: string) {
  const fired = useRef(false);

  useEffect(() => {
    if (!userId || fired.current) return;
    fired.current = true;

    const sendDailyGreeting = async () => {
      const today = new Date().toISOString().split('T')[0];
      const storageKey = `meu_dia_notif_date_${userId}`;

      // ── Verificar se já disparou hoje (localStorage) ──────────────────────────
      const lastFired = localStorage.getItem(storageKey);
      if (lastFired === today) return;

      // ── Saudação baseada no horário ───────────────────────────────────────────
      const hour = new Date().getHours();
      const saudacao =
        hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';



      // ── Buscar dados do perfil (nome do usuário) ──────────────────────────────
      const profileRes = await supabase
        .from('profiles')
        .select('nome_profissional')
        .eq('id', userId)
        .maybeSingle();

      const nomeUsuario =
        profileRes.data?.nome_profissional?.split(' ')[0] || '';

      // ── Buscar leads convertidos com workflow ─────────────────────────────────
      const [leadsRes, evRes, trRes, followupRes] = await Promise.all([
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
          .select('id, valor, status, data')
          .eq('user_id', userId)
          .lte('data', today)
          .eq('tipo', 'receita'),
        supabase
          .from('leads')
          .select('id')
          .eq('user_id', userId)
          .eq('data_followup', today)
          .neq('status', 'convertido')
          .neq('status', 'perdido'),
      ]);

      // ── Contar tarefas atrasadas + com prazo hoje ─────────────────────────────
      let tarefasHoje = 0;
      let tarefasAtrasadas = 0;

      for (const lead of leadsRes.data || []) {
        const wf = Array.isArray(lead.workflow) ? lead.workflow : [];
        for (const step of wf) {
          if (step.status === 'concluido') continue;
          const prazo: string | null = step.deadline || step.prazo || null;
          if (!prazo) continue;

          if (prazo < today) {
            tarefasAtrasadas++;
          } else if (prazo === today) {
            tarefasHoje++;
          }
        }
      }

      const totalTarefas = tarefasHoje + tarefasAtrasadas;

      // ── Contar pagamentos do dia e vencidos ───────────────────────────────────
      const pagamentosHoje =
        trRes.data?.filter((t) => t.status === 'pendente' && t.data === today).length || 0;
      const pagamentosVencidos =
        trRes.data?.filter((t) => t.status === 'pendente' && t.data < today).length || 0;

      // ── Contar follow-ups ─────────────────────────────────────────────────────
      const followupsHoje = followupRes.data?.length || 0;

      // ── Contar eventos ────────────────────────────────────────────────────────
      const eventosHoje = evRes.data?.length || 0;

      // ── Se não há nada relevante, não enviar notificação ──────────────────────
      const temAlgo =
        totalTarefas > 0 || pagamentosHoje > 0 || pagamentosVencidos > 0 || followupsHoje > 0 || eventosHoje > 0;

      if (!temAlgo) {
        // Marca como disparado mesmo assim para não tentar novamente hoje
        localStorage.setItem(storageKey, today);
        return;
      }

      // ── Montar mensagem de resumo ─────────────────────────────────────────────
      const partes: string[] = [];

      if (totalTarefas > 0) {
        const atrasadasSuffix =
          tarefasAtrasadas > 0
            ? ` (${tarefasAtrasadas} atrasada${tarefasAtrasadas > 1 ? 's' : ''})`
            : '';
        partes.push(
          `${totalTarefas} tarefa${totalTarefas > 1 ? 's' : ''}${atrasadasSuffix}`
        );
      }

      if (pagamentosVencidos > 0) {
        partes.push(
          `${pagamentosVencidos} pagamento${pagamentosVencidos > 1 ? 's' : ''} vencido${pagamentosVencidos > 1 ? 's' : ''}`
        );
      }

      if (pagamentosHoje > 0) {
        partes.push(
          `${pagamentosHoje} pagamento${pagamentosHoje > 1 ? 's' : ''} para receber hoje`
        );
      }

      if (followupsHoje > 0) {
        partes.push(
          `${followupsHoje} follow-up${followupsHoje > 1 ? 's' : ''} para realizar`
        );
      }

      if (eventosHoje > 0) {
        partes.push(
          `${eventosHoje} evento${eventosHoje > 1 ? 's' : ''} na agenda`
        );
      }

      const saudacaoComNome = nomeUsuario
        ? `${saudacao}, ${nomeUsuario}!`
        : `${saudacao}!`;

      const listaFormatada = partes
        .map((p, i) => {
          if (i === 0) return p.charAt(0).toUpperCase() + p.slice(1);
          return p;
        })
        .join(', ');

      const mensagem = `${saudacaoComNome} Você tem ${listaFormatada} para hoje. Toque para ver o Meu Dia.`;

      // ── Inserir UMA notificação de resumo ─────────────────────────────────────
      await supabase.from('notifications').insert([
        {
          user_id: userId,
          type: 'meu_dia_resumo',
          title: `${saudacao}! ☀️ Seu dia te espera`,
          message: mensagem,
          link: '/dashboard/meu-dia',
          related_id: null,
          is_read: false,
        },
      ]);

      // ── Marcar como disparado hoje ────────────────────────────────────────────
      localStorage.setItem(storageKey, today);
    };

    // Aguarda 4 segundos para não bloquear o carregamento inicial
    const timer = setTimeout(sendDailyGreeting, 4000);
    return () => clearTimeout(timer);
  }, [userId]);
}
