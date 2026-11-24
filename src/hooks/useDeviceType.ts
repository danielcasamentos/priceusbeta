import { useState, useEffect } from 'react';

/**
 * Hook para detectar o tipo de dispositivo do usuário.
 * Considera tanto o userAgent quanto a largura da tela.
 */
export function useDeviceType() {
  const [deviceType, setDeviceType] = useState(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    return {
      isMobile,
      isTablet,
      isDesktop: !isMobile && !isTablet,
      screenWidth: width,
    };
  });

  useEffect(() => {
    let timeoutId: any = null;

    const detectDevice = () => {
      const width = window.innerWidth;
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

      const isMobileByUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isTabletByUA = /iPad|Android/i.test(userAgent) && !/Mobile/i.test(userAgent);

      const isMobileByWidth = width < 768;
      const isTabletByWidth = width >= 768 && width < 1024;

      const isMobile = isMobileByUA || isMobileByWidth;
      const isTablet = isTabletByUA || isTabletByWidth;
      const isDesktop = !isMobile && !isTablet;

      setDeviceType((prev) => {
        if (
          prev.isMobile === isMobile &&
          prev.isTablet === isTablet &&
          prev.isDesktop === isDesktop &&
          Math.abs(prev.screenWidth - width) < 20
        ) {
          return prev; // Evita re-render se o breakpoint não mudou
        }
        return {
          isMobile,
          isTablet,
          isDesktop,
          screenWidth: width,
        };
      });
    };

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(detectDevice, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return deviceType;
}
