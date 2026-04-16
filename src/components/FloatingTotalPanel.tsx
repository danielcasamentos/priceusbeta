import { useMemo, useState, useEffect } from 'react';
import { formatCurrency } from '../lib/utils';
import { ShoppingCart } from 'lucide-react';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

interface FloatingTotalPanelProps {
  calculateTotal: () => number;
  selectedProdutos: Record<string, number>;
  produtos: any[]; 
  ocultarValoresIntermediarios: boolean;
  firstProductRef: React.RefObject<HTMLElement>;
  totalSectionRef: React.RefObject<HTMLElement>;
  tema?: any;
  temaNome?: string;
  breakdown?: any; // Recebido para exibição detalhada
}

export function FloatingTotalPanel({
  calculateTotal,
  selectedProdutos,
  ocultarValoresIntermediarios,
  firstProductRef,
  totalSectionRef,
  tema,
  temaNome = 'padrao',
  breakdown,
}: FloatingTotalPanelProps) {
  const total = calculateTotal();
  const totalItems = useMemo(() => {
    return Object.values(selectedProdutos).reduce((sum, qty) => sum + qty, 0);
  }, [selectedProdutos]);

  const [hasPassedFirstProduct, setHasPassedFirstProduct] = useState(false);

  // Monitoramento de rolagem explícito para ultrapassar último pixel
  useEffect(() => {
    const handleScroll = () => {
      if (firstProductRef.current) {
        const rect = firstProductRef.current.getBoundingClientRect();
        // Dispara quando o botão do elemento for negativo (cruzou o topo da tela por completo)
        // Isso previne que ele mostre caso a tela seja grande e o produto já apareça
        if (rect.bottom < 50) {
          setHasPassedFirstProduct(true);
        } else if (rect.bottom > window.innerHeight) {
           // Reseta se o usuário voltar muito pro topo
           setHasPassedFirstProduct(false);
        }
      }
    };
    
    // Adiciona listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // checa estado inicial
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [firstProductRef]);

  const isTotalSectionOnScreen = useIntersectionObserver(totalSectionRef, { threshold: 0 });

  // Mostrar se já passamos do primeiro produto e não estamos no fim da página
  const shouldShow = hasPassedFirstProduct && !isTotalSectionOnScreen && totalItems > 0;

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (shouldShow) {
      setIsMounted(true);
    } else {
      timeoutId = setTimeout(() => setIsMounted(false), 300);
    }
    return () => clearTimeout(timeoutId);
  }, [shouldShow]);

  if (!isMounted) {
    return null;
  }

  // Lógica de Design baseado no Tema
  const isPillShape = ['classico', 'revista', 'documento'].includes(temaNome);
  
  // Extrai a classe de BG da cor secundária do tema (se existir) ou usa uma fallback
  const bgClass = tema?.cores?.secundaria || 'bg-blue-600';
  const hoverClass = bgClass.replace('500', '600').replace('600', '700');

  // Ajuste do nível de contraste da fonte
  const isLightBg = bgClass.includes('50 ') || bgClass.includes('100') || bgClass.includes('200') || bgClass.includes('300');
  const textColor = isLightBg ? 'text-gray-900 drop-shadow-sm' : 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]';
  const mutedTextColor = isLightBg ? 'text-gray-700' : 'text-gray-100 opacity-90';

  return (
    <div className={`fixed bottom-5 right-5 sm:left-5 sm:right-auto z-40 transition-opacity duration-300 ${shouldShow ? 'opacity-100' : 'opacity-0'}`}>
      <a
        href="#total-section"
        className={`
          flex flex-col items-center justify-center
          ${bgClass} ${hoverClass}
          ${textColor}
          shadow-lg hover:shadow-xl
          transition-all duration-300
          transform hover:scale-105
          focus:outline-none focus:ring-4 focus:ring-opacity-50
          border border-black/5
          ${isPillShape 
            ? 'px-6 py-3 rounded-2xl sm:px-8 sm:py-4 gap-1 w-auto min-w-[120px]' 
            : 'w-24 h-24 sm:w-28 sm:h-28 rounded-full'}
        `}
        aria-label={`Ver total do orçamento: ${formatCurrency(total)}`}
      >
        <ShoppingCart className={isPillShape ? "w-5 h-5 sm:w-6 sm:h-6 mb-1" : "w-6 h-6 sm:w-7 sm:h-7"} />
        <span className={`${isPillShape ? 'text-xs sm:text-xs' : 'text-[10px] sm:text-[11px]'} font-medium ${mutedTextColor} leading-none mt-1 text-center max-w-[150px]`}>
          {!ocultarValoresIntermediarios && breakdown && (breakdown.taxaDeslocamento > 0 || breakdown.ajusteSazonal > 0) ? (
            <span className="block mb-0.5">
              +{formatCurrency(breakdown.taxaDeslocamento + breakdown.ajusteSazonal)} extra
            </span>
          ) : (
            <span>a partir de:</span>
          )}
        </span>
        <span className={`font-bold leading-tight ${isPillShape ? 'text-sm sm:text-lg' : 'text-sm sm:text-base mt-0.5'}`}>
          {formatCurrency(total)}
        </span>
      </a>
    </div>
  );
}
