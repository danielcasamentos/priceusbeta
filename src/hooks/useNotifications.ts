import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, Notification } from '../lib/supabase';
import { useTrialStatus } from '../hooks/useTrialStatus';
import { User } from '@supabase/supabase-js';

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
 * @param user - O objeto de usuário autenticado do Supabase.
 */
export function useNotifications(user: User | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const trialStatus = useTrialStatus(user);
  const userId = user?.id;

  const loadNotifications = useCallback(async (silent: boolean = false) => {
    if (!userId) return;
    if (!silent) setLoading(true);
    try {
      // Buscar notificações - tenta usar is_read, se não existir usa read
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Normalizar os dados: garantir que is_read e link existam
      const normalizedNotifications = (data || []).map(n => ({
        ...n,
        // Se is_read não existir, usa read (compatibilidade com banco antigo)
        is_read: n.is_read ?? n.read ?? false,
        // Garantir que link exista
        link: n.link || null,
        // Garantir que related_id exista
        related_id: n.related_id || null,
        // Se title não existir, usa message como título
        title: n.title || n.message || '',
      }));
      
      setNotifications(normalizedNotifications);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    loadNotifications();

    // 🔄 Reload ao retornar para a aba (captura eventos perdidos enquanto tab estava em segundo plano)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔔 Tab voltou ao foco — recarregando notificações silenciosamente...');
        loadNotifications(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Auto-refresh silencioso a cada 30 segundos (reduzido de 60s)
    const refreshInterval = setInterval(() => {
      loadNotifications(true);
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(refreshInterval);
    };
  }, [userId, loadNotifications]);

  // Canal Realtime isolado — só recria quando userId muda
  useEffect(() => {
    if (!userId) return;

    // Função para tocar o som de notificação
    const playNotificationSound = () => {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(error => {
        console.log('Tentativa de tocar som de notificação bloqueada pelo navegador:', error.message);
      });
    };

    console.log('📡 Conectando ao canal Realtime de notificações...');
    const channel = supabase
      .channel(`notifications-for-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        console.log('🔔 [Realtime] Nova notificação recebida via WebSocket:', payload.new);
        const newNotif = payload.new as any;
        const normalized: Notification = {
          ...newNotif,
          is_read: newNotif.is_read ?? newNotif.read ?? false,
          link: newNotif.link || null,
          related_id: newNotif.related_id || null,
          title: newNotif.title || newNotif.message || '',
        };
        setNotifications(prev => {
          // Evitar duplicatas no estado local caso já exista
          if (prev.find(n => n.id === normalized.id)) return prev;
          return [normalized, ...prev];
        });
        playNotificationSound();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        const newNotif = payload.new as any;
        const normalized: Notification = {
          ...newNotif,
          is_read: newNotif.is_read ?? newNotif.read ?? false,
          link: newNotif.link || null,
          related_id: newNotif.related_id || null,
          title: newNotif.title || newNotif.message || '',
        };
        setNotifications(prev => prev.map(n => n.id === payload.old.id ? normalized : n));
      })
      .subscribe((status) => {
        console.log('📡 [Realtime] Status do canal de notificações:', status);
        // Quando a conexão for estabelecida, recarregar para pegar eventos perdidos durante a conexão
        if (status === 'SUBSCRIBED') {
          loadNotifications(true);
        }
      });

    return () => {
      console.log('📡 [Realtime] Desconectando canal de notificações...');
      supabase.removeChannel(channel);
    };
  }, [userId]); // ✅ Só userId — sem loadNotifications para evitar recriação do canal em re-renders

  const notificationsWithTrial = useMemo(() => {
    const allNotifications = [...notifications];

    if (trialStatus.status === 'trial' && !trialStatus.isExpired && trialStatus.daysRemaining !== null && trialStatus.daysRemaining <= 3) {
      const trialNotification: Notification = {
        id: 'trial-reminder',
        user_id: userId!,
        type: 'trial', // Corrigido para corresponder ao tipo definido no banco de dados
        title: 'Aviso Importante',
        message: `Seu período de teste termina em ${trialStatus.daysRemaining} dia(s)! Assine para não perder acesso.`,
        link: '/pricing',
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        related_id: undefined,
      };
      allNotifications.unshift(trialNotification);
    }

    return allNotifications;
  }, [notifications, trialStatus, userId]);

  const unreadCount = useMemo(() => notificationsWithTrial.filter(n => !n.is_read).length, [notificationsWithTrial]);

  const markAsRead = useCallback(async (id: string) => {
    if (id === 'trial-reminder' || !userId) return;
    try {
      // Tenta atualizar is_read, se não funcionar tenta read (compatibilidade)
      const { error: errorIsRead } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      
      if (errorIsRead) {
        // Se is_read não existir, tenta usar read
        console.log('is_read não encontrado, tentando usar read...');
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', id);
      }
      // A UI será atualizada pelo listener do Supabase
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  }, [userId]);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    try {
      // Tenta atualizar is_read, se não funcionar tenta read (compatibilidade)
      const { error: errorIsRead } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      
      if (errorIsRead) {
        // Se is_read não existir, tenta usar read
        console.log('is_read não encontrado, tentando usar read...');
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', userId)
          .eq('read', false);
      }
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