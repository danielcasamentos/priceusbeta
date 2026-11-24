import { useEffect } from 'react';


/**
 * Hook para inicializar o Tawk.to e esconder o widget.
 * O chat será aberto manualmente através de um clique no menu.
 */
export function useTawkTo() {
  useEffect(() => {
    // No ambiente desktop nativo (Electron / file://), o Tawk.to não deve ser carregado
    // pois o Electron bloqueia cookies de terceiros em file:// resultando em HTTP 403.
    const isElectronEnv = typeof window !== 'undefined' && (
      window.location.protocol === 'file:' ||
      window.navigator.userAgent.toLowerCase().includes('electron')
    );
    if (isElectronEnv) return;

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