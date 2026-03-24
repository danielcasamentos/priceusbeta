import { X, Calendar, Upload, History, CheckCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CalendarUpgradeModalProps {
  onClose: () => void;
  currentLimit: number;
  currentUsed: number;
}

export function CalendarUpgradeModal({ onClose, currentLimit, currentUsed }: CalendarUpgradeModalProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    navigate('/pricing');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Upgrade para Premium</h3>
              <p className="text-sm text-gray-600">Desbloqueie todo o potencial da agenda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-green-900 mb-1">Plano Atual: Gratuito</p>
              <p className="text-2xl font-bold text-green-900">
                {currentUsed} / {currentLimit} eventos
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-green-900 mb-1">Com Premium</p>
              <p className="text-2xl font-bold text-green-900">
                Ilimitado
              </p>
            </div>
          </div>
          <div className="h-2 bg-green-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 transition-all"
              style={{ width: `${(currentUsed / currentLimit) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">
            Recursos Premium para sua Agenda:
          </h4>

          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h5 className="font-medium text-gray-900 mb-1">Eventos Ilimitados</h5>
                <p className="text-sm text-gray-600">
                  Adicione quantos eventos quiser, sem restrições. Gerencie toda sua agenda sem preocupações.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-white border border-green-200 rounded-lg shadow-sm">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Upload className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-medium text-gray-900">Importação de Calendário</h5>
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                    Exclusivo Premium
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Importe eventos de arquivos CSV e ICS (iCalendar) com sistema inteligente de merge.
                </p>
                <ul className="text-xs text-gray-500 space-y-1 ml-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    Detecção automática de duplicatas
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    Três estratégias de importação
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    Suporte a múltiplos formatos
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <History className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h5 className="font-medium text-gray-900 mb-1">Histórico e Rollback</h5>
                <p className="text-sm text-gray-600">
                  Visualize todas as importações anteriores e desfaça qualquer importação com um clique.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h5 className="font-medium text-gray-900 mb-1">Sincronização Inteligente</h5>
                <p className="text-sm text-gray-600">
                  Sistema inteligente que evita duplicatas e mantém seus dados sempre organizados e atualizados.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">Plano Gratuito (Trial 30 dias)</p>
              <p className="text-2xl font-bold text-gray-900">Até 20 eventos manuais</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Plano Premium</p>
              <p className="text-2xl font-bold text-green-600">Eventos Ilimitados</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleUpgrade}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all font-semibold shadow-md"
            >
              <Sparkles className="w-5 h-5" />
              Fazer Upgrade Agora
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Agora Não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
