import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, Loader2, AlertCircle, MessageSquare, FileSignature, Calendar, DollarSign, TrendingUp, Users, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNotifications } from '../hooks/useNotifications';
import type { Notification } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface NotificationCenterProps {
  userId: string;
  onNavigate: (page: string) => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'new_lead':
      return <Users className="w-4 h-4 text-green-600" />;
    case 'lead_converted':
      return <Check className="w-4 h-4 text-green-600" />;
    case 'lead_abandoned':
      return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    case 'lead_followup_reminder':
      return <MessageSquare className="w-4 h-4 text-orange-600" />;
    case 'contract_signed':
      return <FileSignature className="w-4 h-4 text-purple-600" />;
    case 'contract_generated':
      return <FileSignature className="w-4 h-4 text-indigo-600" />;
    case 'contract_expiring':
    case 'contract_expired':
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    case 'event_reminder':
    case 'new_event':
      return <Calendar className="w-4 h-4 text-green-600" />;
    case 'cash_management_reminder':
      return <DollarSign className="w-4 h-4 text-teal-600" />;
    case 'new_transaction':
      return <TrendingUp className="w-4 h-4 text-lime-600" />;
    case 'new_review':
      return <Star className="w-4 h-4 text-yellow-600" />;
    case 'plan_limit_reached':
    case 'plan_limit_approaching':
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    case 'trial': // Corrigido para 'trial' conforme o CHECK da tabela
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    default:
      return <Bell className="w-4 h-4 text-gray-600" />;
  }
};

export default function NotificationCenter({ userId, onNavigate }: NotificationCenterProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const { user } = useAuth();

  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications(user);

  const handleNotificationClick = (notification: Notification) => {
    // Trial notifications → redirect direto
    if (notification.id === 'trial-reminder' || notification.type === 'trial') {
      window.location.href = '/pricing';
      setShowDropdown(false);
      return;
    }

    // Marca como lida (otimistic)
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    setShowDropdown(false);

    if (notification.link) {
      console.log('[NotificationCenter] Navegando para:', notification.link);
      
      try {
        const url = new URL(notification.link, window.location.origin);
        const pathname = url.pathname; // ex: /dashboard/leads ou /dashboard
        let targetPage: string | null = null;

        // Formato novo: /dashboard/leads, /dashboard/contratos, etc.
        if (pathname.startsWith('/dashboard/')) {
          const segments = pathname.replace('/dashboard/', '').split('/');
          targetPage = segments[0] || null;
        }
        
        // Formato antigo: /dashboard?page=leads ou /dashboard?page=contratos&id=XXX
        if (!targetPage && (pathname === '/dashboard' || pathname === '/dashboard/')) {
          targetPage = url.searchParams.get('page');
        }

        console.log('[NotificationCenter] Página extraída:', targetPage);

        if (targetPage) {
          onNavigate(targetPage);
        } else if (pathname.startsWith('/dashboard')) {
          // Dashboard sem página → fallback para leads
          onNavigate('leads');
        } else {
          // Links externos ou outras rotas (ex: /pricing, /contrato/...)
          window.location.href = notification.link;
        }
      } catch (e) {
        // Link inválido — fallback
        console.warn('[NotificationCenter] Link inválido, navegando para leads:', notification.link);
        onNavigate('leads');
      }
    }
  };



  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        bellRef.current && !bellRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Adiciona uma verificação para garantir que o userId não seja undefined
  if (!userId) {
    return null; // Não renderiza nada se não houver ID de usuário
  }

  return (
    <div className="relative">
      <button
        ref={bellRef}
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notificações"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50"
        >
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Notificações</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-green-600 hover:text-green-800 text-sm font-medium"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Carregando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Nenhuma notificação
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex items-start gap-3 p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    notification.is_read ? 'opacity-70' : 'bg-blue-50/50'
                  }`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${notification.is_read ? 'text-gray-700' : 'font-medium text-gray-900'}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                      className="flex-shrink-0 p-1 rounded-full hover:bg-gray-200 text-gray-500"
                      title="Marcar como lida"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
