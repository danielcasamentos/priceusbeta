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

    // 2. Lista de E-mails com Acesso Especial (Inclusão do e-mail principal odanielfotografo@icloud.com)
    const rawAllowed = import.meta.env.VITE_SPECIAL_ACCESS_EMAILS || 'odanielfotografo@icloud.com,daniel@priceus.com.br,admin@priceus.com.br';
    const allowedEmails = rawAllowed
      .split(',')
      .map((e: string) => e.trim().toLowerCase());

    const activeEmail = (currentEmail || '').trim().toLowerCase();
    // Se o e-mail não estiver definido (ex: durante prototipação), permite acesso se for localhost
    const isEmailAuthorized = activeEmail ? allowedEmails.includes(activeEmail) : true;

    // Se estiver em ambiente local e o e-mail (se fornecido) for liberado
    const hasAccess = isLocalhost && isEmailAuthorized;

    let reason = '';
    if (!isLocalhost) {
      reason = 'Disponível apenas em ambiente Localhost / Docker Dev.';
    } else if (!isEmailAuthorized) {
      reason = 'Seu e-mail não possui acesso autorizado a esta funcionalidade de testes.';
    }

    return {
      hasAccess,
      isLocalhost,
      isEmailAuthorized,
      userEmail: currentEmail || null,
      reason
    };
  }, [currentEmail]);
}
