import { supabase } from './supabase';
import { PRIVILEGED_EMAILS } from '../config/privilegedUsers';

let currentEmail: string | null = null;

if (typeof window !== 'undefined') {
  // Listen for auth changes to dynamically update whitelisting cache
  supabase.auth.onAuthStateChange((_event, session) => {
    currentEmail = session?.user?.email || null;
  });
  // Fetch initial session
  supabase.auth.getSession().then(({ data }) => {
    currentEmail = data.session?.user?.email || null;
  }).catch(() => {});
}

function shouldShowLogs(): boolean {
  // 1. Em desenvolvimento (localhost), sempre exibe
  if (import.meta.env.DEV) {
    return true;
  }
  // 2. Em produção, exibe apenas se o email estiver na lista de privilegiados
  if (currentEmail && PRIVILEGED_EMAILS.includes(currentEmail.toLowerCase() as any)) {
    return true;
  }
  return false;
}

function obfuscate(data: any): any {
  if (data === undefined || data === null) return data;
  try {
    const str = typeof data === 'object' ? JSON.stringify(data) : String(data);
    // Base64 obfuscation wrapper
    const encoded = btoa(encodeURIComponent(str));
    return `[PriceUs-Criptografado: ${encoded.substring(0, 24)}...]`;
  } catch (e) {
    return '[Payload Oculto]';
  }
}

// Salva referências originais do console para evitar loops de recursão
const originalLog = console.log;
const originalInfo = console.info;
const originalWarn = console.warn;
const originalError = console.error;

let isInitialized = false;

/**
  * Intercepta globalmente os consoles padrão do navegador para aplicar regras de segurança de e-mail e ambiente.
  */
export function initGlobalLogger() {
  if (isInitialized) return;
  isInitialized = true;

  console.log = (message?: any, ...optionalParams: any[]) => {
    if (shouldShowLogs()) {
      originalLog(message, ...optionalParams);
    }
  };

  console.info = (message?: any, ...optionalParams: any[]) => {
    if (shouldShowLogs()) {
      originalInfo(message, ...optionalParams);
    }
  };

  console.warn = (message?: any, ...optionalParams: any[]) => {
    if (shouldShowLogs()) {
      originalWarn(message, ...optionalParams);
    } else {
      originalWarn(message, ...optionalParams.map(obfuscate));
    }
  };

  console.error = (message?: any, ...optionalParams: any[]) => {
    if (shouldShowLogs()) {
      originalError(message, ...optionalParams);
    } else {
      originalError(message, ...optionalParams.map(obfuscate));
    }
  };
}

export const logger = {
  log(message: string, ...args: any[]) {
    if (shouldShowLogs()) {
      originalLog(`🛡️ [PriceUs-Log] ${message}`, ...args);
    }
  },

  info(message: string, ...args: any[]) {
    if (shouldShowLogs()) {
      originalInfo(`ℹ️ [PriceUs-Info] ${message}`, ...args);
    }
  },

  warn(message: string, ...args: any[]) {
    if (shouldShowLogs()) {
      originalWarn(`⚠️ [PriceUs-Warn] ${message}`, ...args);
    } else {
      originalWarn(`⚠️ [PriceUs-Warn] ${message}`, ...args.map(obfuscate));
    }
  },

  error(message: string, ...args: any[]) {
    if (shouldShowLogs()) {
      originalError(`❌ [PriceUs-Error] ${message}`, ...args);
    } else {
      originalError(`❌ [PriceUs-Error] ${message}`, ...args.map(obfuscate));
    }
  }
};

