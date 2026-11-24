import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, Notification } from '../lib/supabase';
import { useTrialStatus } from '../hooks/useTrialStatus';

/**
 * Hook customizado para gerenciar notificações.
 *
 * Encapsula a lógica de:
 * - Carregar notificações iniciais.
 * - Inscrever-se para atualizações em tempo real (novas e atualizadas).
 * - Adicionar notificações virtuais (como lembretes de trial).
 * - Marcar notificações como lidas (individualmente ou todas).
 * - Calcular a contagem de não lidas.
 *
 * @param userId - O ID do usuário para o qual as notificações devem ser buscadas.
 */
export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const trialStatus = useTrialStatus(userId);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    loadNotifications();

    const channel = supabase
      .channel(`notifications-for-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        setNotifications(prev => prev.map(n => n.id === payload.old.id ? { ...(payload.new as Notification) } : n));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadNotifications]);

  const notificationsWithTrial = useMemo(() => {
    const allNotifications = [...notifications];

    if (trialStatus.status === 'trial' && !trialStatus.isExpired && trialStatus.daysRemaining !== null && trialStatus.daysRemaining <= 3) {
      const trialNotification: Notification = {
        id: 'trial-reminder',
        user_id: userId!,
        type: 'trial',
        title: 'Aviso de Trial',
        message: `Seu período de teste termina em ${trialStatus.daysRemaining} dia(s)! Assine para não perder acesso.`,
        link: '/pricing',
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        related_id: undefined,
      };
      allNotifications.unshift(trialNotification);
    }

    return allNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Garante que as notificações estejam ordenadas por data de criação
  }, [notifications, trialStatus, userId]); // Adicionado notifications como dependência

  const unreadCount = useMemo(() => notificationsWithTrial.filter(n => !n.is_read).length, [notificationsWithTrial]);

  const markAsRead = useCallback(async (id: string) => {
    if (id === 'trial-reminder' || !userId) return;
    try { // Corrigido de is_read para read
      await supabase.from('notifications').update({ read: true }).eq('id', id);
      // A UI será atualizada pelo listener do Supabase
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  }, [userId]);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    try {
      await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false); // Corrigido de is_read para read
      // A UI será atualizada pelo listener do Supabase
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  }, [userId]);

  return {
    notifications: notificationsWithTrial,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  };
}