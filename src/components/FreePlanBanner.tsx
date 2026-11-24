import { Crown, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function FreePlanBanner() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // Verificar se foi fechado recentemente (últimas 24h)
  useEffect(() => {
    const dismissedAt = localStorage.getItem('freePlanBannerDismissed');
    if (dismissedAt) {
      const dismissedTime = new Date(dismissedAt).getTime();
      const now = new Date().getTime();
      const hoursPassed = (now - dismissedTime) / (1000 * 60 * 60);
      
      if (hoursPassed < 24) {
        setDismissed(true);
      } else {
        localStorage.removeItem('freePlanBannerDismissed');
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('freePlanBannerDismissed', new Date().toISOString());
  };

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-4 py-2.5 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Crown className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-blue-900 font-medium">
            Conta Gratuita
          </span>
          <span className="hidden sm:inline text-blue-700">
            • Faça upgrade para recursos ilimitados
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/pricing')}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Ver Planos
          </button>
          <button
            onClick={handleDismiss}
            className="text-blue-600 hover:bg-blue-200 p-1.5 rounded-md transition-colors"
            aria-label="Fechar banner"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
