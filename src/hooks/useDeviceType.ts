import { useState, useEffect } from 'react';

/**
 * Hook para detectar o tipo de dispositivo do usuário.
 * Considera tanto o userAgent quanto a largura da tela.
 */
export function useDeviceType() {
  const [deviceType, setDeviceType] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1200,
  });

  useEffect(() => {
    // Função para detectar tipo de dispositivo
    const detectDevice = () => {
      const width = window.innerWidth;
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

      // Detectar mobile pelo userAgent
      const isMobileByUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      
      // Detectar tablet pelo userAgent
      const isTabletByUA = /iPad|Android/i.test(userAgent) && !/Mobile/i.test(userAgent);

      // Usar largura da tela como fallback
      const isMobileByWidth = width < 768;
      const isTabletByWidth = width >= 768 && width < 1024;

      // Considera mobile se for por UA ou por largura
      const isMobile = isMobileByUA || isMobileByWidth;
      const isTablet = isTabletByUA || isTabletByWidth;
      const isDesktop = !isMobile && !isTablet;

      const newDeviceType = {
        isMobile,
        isTablet,
        isDesktop,
        screenWidth: width,
      };

      console.log('[useDeviceType] Dispositivo detectado:', {
        ...newDeviceType,
        userAgent: userAgent.substring(0, 50) + '...',
      });

      setDeviceType(newDeviceType);
    };

    // Detectar imediatamente
    detectDevice();

    // Adicionar listener para redimensionamento
    window.addEventListener('resize', detectDevice);

    // Cleanup
    return () => {
      window.removeEventListener('resize', detectDevice);
      console.log('[useDeviceType] Cleanup: listener removido');
    };
  }, []);

  return deviceType;
}

