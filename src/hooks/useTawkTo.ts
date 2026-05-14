import { useEffect } from 'react';


/**
 * Hook para inicializar o Tawk.to e esconder o widget.
 * O chat será aberto manualmente através de um clique no menu.
 */
export function useTawkTo() {
  useEffect(() => {
    window.Tawk_API = window.Tawk_API || {};

    window.Tawk_API.onLoad = function() {
      if (window.Tawk_API && typeof window.Tawk_API.hideWidget === 'function') {
        window.Tawk_API.hideWidget();
      }
    };

    if (window.Tawk_API && typeof window.Tawk_API.hideWidget === 'function') {
      window.Tawk_API.hideWidget();
    }

    return () => {
      if (window.Tawk_API && window.Tawk_API.onLoad) delete window.Tawk_API.onLoad;
    };
  }, []);
}