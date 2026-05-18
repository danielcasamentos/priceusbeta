import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook que dispara uma notificação diária de resumo "Meu Dia"
 * Roda uma vez por sessão/dia — verifica se já existe notificação do dia antes de criar.
 */
export function useMeuDiaNotification(userId: string) {
  const fired = useRef(false);

  useEffect(() => {
    if (!userId || fired.current) return;
    fired.current = true;

    const sendDailyNotification = async () => {
      const today = new Date().toISOString().split('T')[0];
      const todayStart = `${today}T00:00:00`;
      const todayEnd = `${today}T23:59:59`;

      // Verifica se já enviamos notificação do Meu Dia hoje
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'meu_dia_resumo')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)
        .limit(1);

      if (existing && existing.length > 0) return; // Já enviou hoje

      // Busca dados do dia
      const [evRes, trRes] = await Promise.all([
        supabase.from('eventos_agenda').select('id').eq('user_id', userId).eq('data_evento', today).neq('status', 'cancelado'),
        supabase.from('company_transactions').select('id, valor, status').eq('user_id', userId).eq('data', today).eq('tipo', 'receita'),
      ]);

      const eventos = evRes.data?.length || 0;
      const receitasPendentes = trRes.data?.filter(t => t.status === 'pendente').reduce((s: number, t: any) => s + (t.valor || 0), 0) || 0;
      const fmtCur = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

      // Só envia se tiver algo relevante
      if (eventos === 0 && receitasPendentes === 0) return;

      const parts: string[] = [];
      if (eventos > 0) parts.push(`📅 ${eventos} evento${eventos > 1 ? 's' : ''} hoje`);
      if (receitasPendentes > 0) parts.push(`💰 ${fmtCur(receitasPendentes)} a receber`);

      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'meu_dia_resumo',
        title: '☀️ Resumo do seu dia',
        message: parts.join(' • '),
        link: '/dashboard/meu-dia',
        related_id: null,
      });
    };

    // Aguarda 3 segundos após o mount para não bloquear o carregamento inicial
    const timer = setTimeout(sendDailyNotification, 3000);
    return () => clearTimeout(timer);
  }, [userId]);
}
