// /Users/danielazevedo/Desktop/Priceus20/src/lib/browserDetection.ts

/**
 * Detecta se o navegador é um "in-app browser" (como Instagram, Facebook).
 */
export const isInAppBrowser = (): boolean => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  // Palavras-chave comuns para navegadores de aplicativos, incluindo Instagram
  const inAppKeywords = [
    'FBAN', // Facebook App
    'FBAV', // Facebook App Version
    'Instagram', // Instagram App
    'Pinterest', // Pinterest App
    'Twitter', // Twitter App
    'WebView', // WebView genérico
    'CriOS', // Chrome no iOS (pode ser in-app)
    'GSA', // Google Search App
  ];

  return inAppKeywords.some(keyword => userAgent.includes(keyword));
};

/**
 * Detecta o nome do navegador atual.
 */
export const detectBrowser = (): string => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("SamsungBrowser")) return "Samsung Browser";
  if (userAgent.includes("Opera") || userAgent.includes("OPR")) return "Opera";
  if (userAgent.includes("Trident")) return "Internet Explorer";
  if (userAgent.includes("Edge")) return "Edge";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Safari")) return "Safari";
  return "Unknown";
};

/**
 * Obtém a origem do tráfego (referrer).
 */
export const getReferrer = (): string => {
  return document.referrer || 'direct';
};

/**
 * Registra informações do navegador no console.
 */
export const logBrowserInfo = (): void => {
  console.log(`[Browser Info] User Agent: ${navigator.userAgent}`);
  console.log(`[Browser Info] Detected Browser: ${detectBrowser()}`);
  console.log(`[Browser Info] Is In-App Browser: ${isInAppBrowser()}`);
  console.log(`[Browser Info] Referrer: ${getReferrer()}`);
};
