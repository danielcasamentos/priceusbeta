import { useMemo, useState, useEffect } from 'react';
import { formatCurrency } from '../lib/utils';
import { ShoppingCart } from 'lucide-react';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

interface FloatingTotalPanelProps {
  calculateTotal: () => number;
  selectedProdutos: Record<string, number>;
  produtos: any[]; // Apenas para contagem, não precisa de tipo complexo
  ocultarValoresIntermediarios: boolean;
  produtosSectionRef: React.RefObject<HTMLElement>;
  totalSectionRef: React.RefObject<HTMLElement>;
  tema?: any;
}

export function FloatingTotalPanel({
  calculateTotal,
  selectedProdutos,
  ocultarValoresIntermediarios,
  produtosSectionRef,
  totalSectionRef,
  tema,
}: FloatingTotalPanelProps) {
  const total = calculateTotal();
  const totalItems = useMemo(() => {
    return Object.values(selectedProdutos).reduce((sum, qty) => sum + qty, 0);
  }, [selectedProdutos]);

  // Estado para "lembrar" que o usuário já rolou até a seção de produtos.
  const [hasEnteredProductsSection, setHasEnteredProductsSection] = useState(false);

  // Observa a seção de produtos. Quando ela entra na tela, ativa o estado `hasEnteredProductsSection`.
  const isProdutosSectionOnScreen = useIntersectionObserver(produtosSectionRef, { threshold: 0 });
  // Observa a seção de total no final da página.
  const isTotalSectionOnScreen = useIntersectionObserver(totalSectionRef, { threshold: 0 });

  useEffect(() => {
    if (isProdutosSectionOnScreen) {
      setHasEnteredProductsSection(true);
    }
  }, [isProdutosSectionOnScreen]);

  // A condição para mostrar o painel é:
  // 1. O usuário JÁ ENTROU na seção de produtos.
  // 2. A seção de total final AINDA NÃO está na tela.
  const shouldShow = hasEnteredProductsSection && !isTotalSectionOnScreen && totalItems > 0;

  // Estado para controlar a montagem/desmontagem com animação
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (shouldShow) {
      setIsMounted(true);
    } else {
      // Espera a animação de fade-out (300ms) antes de desmontar
      timeoutId = setTimeout(() => setIsMounted(false), 300);
    }
    return () => clearTimeout(timeoutId);
  }, [shouldShow]);

  if (!isMounted) {
    return null;
  }

  return (
    // Aplica classes de transição e controla a opacidade com base na condição 'shouldShow'.
    <div className={`fixed bottom-5 left-5 z-40 transition-opacity duration-300 ${shouldShow ? 'opacity-100' : 'opacity-0'}`}
    >
      <a
        href="#total-section"
        className={`
          w-20 h-20 sm:w-24 sm:h-24
          flex flex-col items-center justify-center
          bg-blue-600 hover:bg-blue-700
          text-white
          rounded-full
          shadow-lg hover:shadow-xl
          transition-all duration-300
          transform hover:scale-105
          focus:outline-none focus:ring-4 focus:ring-opacity-50 ring-blue-300
        `}
        aria-label={`Ver total do orçamento: ${formatCurrency(total)}`}
      >
        <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
        <span className="text-[9px] sm:text-[10px] font-medium opacity-80 leading-none mt-1 tracking-tight">
          a partir de:
        </span>
        <span className="font-bold text-xs sm:text-sm leading-tight">
          {formatCurrency(total)}
        </span>
      </a>
    </div>
  );
}
