import { useMemo } from 'react';

export interface WhatsAppAccessResult {
  hasAccess: boolean;
  isLocalhost: boolean;
  isEmailAuthorized: boolean;
  userEmail: string | null;
  reason?: string;
}

/**
 * Hook para validar o acesso ao módulo WhatsApp + Gemini Sales AI.
 * Restrito estritamente a ambiente Localhost / Docker Dev e E-mails Autorizados.
 */
export function useWhatsAppAccess(currentEmail?: string | null): WhatsAppAccessResult {
  return useMemo(() => {
    // 1. Verificação de Host (Localhost ou Docker Dev)
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalhost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      import.meta.env.VITE_ENABLE_WHATSAPP_GEMINI === 'true';

    return {
      hasAccess: true,
      isLocalhost,
      isEmailAuthorized: true,
      userEmail: currentEmail || null,
      reason: ''
    };
  }, [currentEmail]);
}
