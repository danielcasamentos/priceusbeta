import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const BANNER_STORAGE_KEY = 'priceus_blackfriday_banner_closed_2025';

export function BlackFridayBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Define a data final da promoção
    const expiryDate = new Date('2025-12-01T00:00:00'); // O banner some no dia 30/11/2025 às 23:59:59
    const now = new Date();

    // 2. Verifica se a promoção já expirou
    if (now >= expiryDate) {
      setIsVisible(false);
      return;
    }

    // 3. Verifica se o usuário já fechou o banner
    const hasBeenClosed = localStorage.getItem(BANNER_STORAGE_KEY);

    if (!hasBeenClosed) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    // Salva a preferência do usuário para não mostrar o banner novamente
    localStorage.setItem(BANNER_STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  const handleBannerClick = () => {
    // Redireciona para a página de assinatura/planos
    window.location.href = '/planos';
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative group cursor-pointer" onClick={handleBannerClick}>
        {/* Imagem do Banner */}
        <img
          src="/BLACKFRIDAY_DO_PRICEUS.png"
          alt="Promoção Black Friday Priceus"
          className="rounded-lg shadow-2xl transition-transform transform hover:scale-105"
          style={{ maxWidth: '320px', height: 'auto' }}
        />

        {/* Botão de Fechar (X) */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // Impede que o clique no 'X' acione o link do banner
            handleClose();
          }}
          className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1.5 shadow-lg transition-transform transform hover:scale-110 hover:bg-black"
          aria-label="Fechar banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
