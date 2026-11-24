import { useState, useEffect, RefObject } from 'react';

/**
 * Hook para controlar a visibilidade de um elemento com base na posição de rolagem.
 * @param triggerRef - Ref para o elemento que, ao se tornar visível, esconde o alvo.
 * @returns `true` se o elemento alvo deve ser visível, `false` caso contrário.
 */
export function useScrollVisibility(triggerRef: RefObject<HTMLElement>): boolean {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Se o elemento gatilho (ex: rodapé) estiver visível na tela,
        // escondemos o elemento alvo (ex: banner flutuante).
        // Caso contrário, o exibimos.
        setIsVisible(!entry.isIntersecting);
      },
      {
        root: null, // Observa em relação ao viewport
        rootMargin: '0px',
        threshold: 0.1, // Considera visível se 10% do gatilho estiver na tela
      }
    );

    const currentTrigger = triggerRef.current;
    if (currentTrigger) {
      observer.observe(currentTrigger);
    }

    return () => observer.disconnect();
  }, [triggerRef]);

  return isVisible;
}
