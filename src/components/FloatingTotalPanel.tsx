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
}

export function FloatingTotalPanel({
  calculateTotal,
  selectedProdutos,
  ocultarValoresIntermediarios,
  firstProductRef,
  totalSectionRef,
  tema,
  temaNome = 'padrao',
}: FloatingTotalPanelProps) {
  const total = calculateTotal();
  const totalItems = useMemo(() => {
    return Object.values(selectedProdutos).reduce((sum, qty) => sum + qty, 0);
  }, [selectedProdutos]);

  const [hasPassedFirstProduct, setHasPassedFirstProduct] = useState(false);

  // Observa O PRIMEIRO produto. Margin negativa indica que ele deve subir 30% na tela
  // antes de ser considerado "intersectado" / passado.
  const isFirstProductOnScreen = useIntersectionObserver(firstProductRef, { rootMargin: '-30% 0px 0px 0px' });
  const isTotalSectionOnScreen = useIntersectionObserver(totalSectionRef, { threshold: 0 });

  useEffect(() => {
    if (isFirstProductOnScreen) {
      setHasPassedFirstProduct(true);
    }
  }, [isFirstProductOnScreen]);

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

  return (
    <div className={`fixed bottom-5 right-5 sm:left-5 sm:right-auto z-40 transition-opacity duration-300 ${shouldShow ? 'opacity-100' : 'opacity-0'}`}>
      <a
        href="#total-section"
        className={`
          flex flex-col items-center justify-center
          ${bgClass} ${hoverClass}
          text-white
          shadow-lg hover:shadow-xl
          transition-all duration-300
          transform hover:scale-105
          focus:outline-none focus:ring-4 focus:ring-opacity-50
          ${isPillShape 
            ? 'px-6 py-3 rounded-2xl sm:px-8 sm:py-4 gap-1 w-auto min-w-[120px]' 
            : 'w-20 h-20 sm:w-24 sm:h-24 rounded-full'}
        `}
        aria-label={`Ver total do orçamento: ${formatCurrency(total)}`}
      >
        <ShoppingCart className={isPillShape ? "w-5 h-5 sm:w-6 sm:h-6 mb-1" : "w-5 h-5 sm:w-6 sm:h-6"} />
        <span className={`${isPillShape ? 'text-xs sm:text-sm' : 'text-[9px] sm:text-[10px]'} font-medium opacity-80 leading-none tracking-tight`}>
          a partir de:
        </span>
        <span className={`font-bold leading-tight ${isPillShape ? 'text-sm sm:text-lg' : 'text-xs sm:text-sm'}`}>
          {formatCurrency(total)}
        </span>
      </a>
    </div>
  );
}
