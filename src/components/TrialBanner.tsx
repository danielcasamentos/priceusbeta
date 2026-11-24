import { AlertCircle, Clock, CreditCard, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface TrialBannerProps {
  daysRemaining: number;
  isExpired: boolean;
}

export function TrialBanner({ daysRemaining, isExpired }: TrialBannerProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed && !isExpired) return null;

  if (isExpired) {
    return (
      <div className="bg-red-600 text-white px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Seu período de teste expirou</p>
              <p className="text-sm text-red-100">
                Assine agora para continuar usando todos os recursos do Price Us
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/pricing')}
            className="bg-white text-red-600 px-6 py-2 rounded-lg font-semibold hover:bg-red-50 transition flex items-center gap-2"
          >
            <CreditCard size={18} />
            Ver Planos
          </button>
        </div>
      </div>
    );
  }

  const getColorClasses = () => {
    if (daysRemaining <= 3) {
      return {
        bg: 'bg-orange-600',
        text: 'text-orange-100',
        button: 'bg-white text-orange-600 hover:bg-orange-50',
      };
    }
    if (daysRemaining <= 7) {
      return {
        bg: 'bg-yellow-600',
        text: 'text-yellow-100',
        button: 'bg-white text-yellow-600 hover:bg-yellow-50',
      };
    }
    return {
      bg: 'bg-blue-600',
      text: 'text-blue-100',
      button: 'bg-white text-blue-600 hover:bg-blue-50',
    };
  };

  const colors = getColorClasses();

  return (
    <div className={`${colors.bg} text-white px-4 py-3 shadow-lg relative`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">
              {daysRemaining === 0
                ? 'Último dia do seu período de teste!'
                : daysRemaining === 1
                ? 'Resta 1 dia do seu período de teste'
                : `Restam ${daysRemaining} dias do seu período de teste`}
            </p>
            <p className={`text-sm ${colors.text}`}>
              Assine para continuar aproveitando todos os recursos após o trial
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/pricing')}
            className={`${colors.button} px-6 py-2 rounded-lg font-semibold transition flex items-center gap-2`}
          >
            <CreditCard size={18} />
            Assinar Agora
          </button>
          {daysRemaining > 3 && (
            <button
              onClick={() => setDismissed(true)}
              className="text-white hover:bg-white/10 p-2 rounded-lg transition"
              aria-label="Dispensar"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
