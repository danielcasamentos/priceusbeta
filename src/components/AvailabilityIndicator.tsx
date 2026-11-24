import { CheckCircle, AlertTriangle, AlertCircle, Lock, Loader2, RefreshCw, MessageCircle } from 'lucide-react';
import { AvailabilityResult } from '../services/availabilityService';

interface AvailabilityIndicatorProps {
  availability: AvailabilityResult | null;
  isChecking: boolean;
  onRefresh?: () => void;
  onContactPhotographer?: () => void;
  photographerName?: string;
  showRefreshButton?: boolean;
  className?: string;
}

/**
 * Componente visual melhorado para exibir status de disponibilidade
 * com animações suaves e feedback claro para o usuário
 */
export function AvailabilityIndicator({
  availability,
  isChecking,
  onRefresh,
  onContactPhotographer,
  photographerName,
  showRefreshButton = true,
  className = '',
}: AvailabilityIndicatorProps) {
  // Estado de loading
  if (isChecking) {
    return (
      <div className={`mt-3 flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl animate-pulse ${className}`}>
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-900">Verificando disponibilidade...</p>
          <p className="text-xs text-blue-700 mt-1">
            Consultando agenda em tempo real
          </p>
        </div>
      </div>
    );
  }

  // Sem dados ainda
  if (!availability) {
    return null;
  }

  // Renderizar baseado no status
  switch (availability.status) {
    case 'disponivel':
      return (
        <div className={`mt-3 ${className}`}>
          <div className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-300 rounded-xl shadow-sm">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-900">
                {availability.mensagem || 'Data disponível!'}
              </p>
              <p className="text-xs text-green-700 mt-1">
                Podemos reservar este horário para você
              </p>
            </div>
            {showRefreshButton && onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                title="Atualizar disponibilidade"
              >
                <RefreshCw className="w-4 h-4 text-green-700" />
              </button>
            )}
          </div>
        </div>
      );

    case 'parcial':
      return (
        <div className={`mt-3 ${className}`}>
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl shadow-sm">
            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-900">
                {availability.mensagem}
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Ainda temos disponibilidade para esta data
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 bg-yellow-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-yellow-600 h-full transition-all duration-500"
                    style={{
                      width: `${(availability.eventos_atual / availability.eventos_max) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-yellow-800">
                  {availability.eventos_atual}/{availability.eventos_max}
                </span>
              </div>
            </div>
            {showRefreshButton && onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="p-2 hover:bg-yellow-100 rounded-lg transition-colors"
                title="Atualizar disponibilidade"
              >
                <RefreshCw className="w-4 h-4 text-yellow-700" />
              </button>
            )}
          </div>
        </div>
      );

    case 'ocupada':
      return (
        <div className={`mt-3 ${className}`}>
          <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900">Data ocupada</p>
                <p className="text-xs text-red-700 mt-1">
                  {availability.mensagem}
                </p>
              </div>
              {showRefreshButton && onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                  title="Atualizar disponibilidade"
                >
                  <RefreshCw className="w-4 h-4 text-red-700" />
                </button>
              )}
            </div>

            {availability.modo_aviso !== 'informativo' && onContactPhotographer && (
              <div className="pt-3 border-t border-red-200 space-y-2">
                <p className="text-xs text-red-700 font-medium">
                  💡 Sugestão: Escolha outra data ou entre em contato
                </p>
                <button
                  type="button"
                  onClick={onContactPhotographer}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors text-sm font-medium shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  Conversar com {photographerName || 'o profissional'}
                </button>
              </div>
            )}
          </div>
        </div>
      );

    case 'bloqueada':
      return (
        <div className={`mt-3 ${className}`}>
          <div className="p-4 bg-gray-50 border-2 border-gray-300 rounded-xl shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <Lock className="w-6 h-6 text-gray-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Data bloqueada</p>
                <p className="text-xs text-gray-700 mt-1">
                  {availability.mensagem}
                </p>
              </div>
              {showRefreshButton && onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Atualizar disponibilidade"
                >
                  <RefreshCw className="w-4 h-4 text-gray-700" />
                </button>
              )}
            </div>

            {onContactPhotographer && (
              <div className="pt-3 border-t border-gray-200 space-y-2">
                <p className="text-xs text-gray-700">
                  Por favor, escolha outra data ou entre em contato.
                </p>
                <button
                  type="button"
                  onClick={onContactPhotographer}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors text-sm font-medium shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  Conversar com {photographerName || 'o profissional'}
                </button>
              </div>
            )}
          </div>
        </div>
      );

    // 'inativa' handled in default below

    default:
      // handles 'inativa' and any unknown status
      return null;
  }
}
