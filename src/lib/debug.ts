// src/lib/debug.ts

/**
 * Logs a message to the console and saves it to localStorage for mobile debugging.
 * @param label A descriptive label for the log entry.
 * @param data Optional data to be serialized and stored with the log.
 */
export function debugMobile(label: string, data?: any) {
  try {
    const log = {
      time: new Date().toISOString(),
      label,
      // Safely serialize data, handling potential circular references
      data: data ? JSON.parse(JSON.stringify(data, getCircularReplacer())) : 'No data',
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Get existing logs from localStorage or initialize an empty array
    const logs = JSON.parse(localStorage.getItem('mobileLogs') || '[]');
    
    // Add the new log and keep the last 100 entries
    logs.push(log);
    if (logs.length > 100) {
      logs.shift();
    }

    // Save back to localStorage
    localStorage.setItem('mobileLogs', JSON.stringify(logs));

    // Also log to the console for standard debugging
    console.log(`📱 [MOBILE_DEBUG] ${label}`, data);
  } catch (error) {
    console.error('Error in debugMobile:', error);
  }
}

/**
 * A replacer function for JSON.stringify to handle circular references.
 */
const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }
    return value;
  };
};

/**
 * Function to retrieve and display all mobile logs.
 * Can be called from the browser console: `window.showMobileLogs()`
 */
export function showMobileLogs() {
  const logs = JSON.parse(localStorage.getItem('mobileLogs') || '[]');
  console.table(logs);
}

// Expose the showMobileLogs function globally for easy access in the console
if (typeof window !== 'undefined') {
  (window as any).showMobileLogs = showMobileLogs;
}

/**
 * Checks for the presence of critical environment variables and logs their status.
 * This should be called once when the application initializes (e.g., in your main layout component).
 */
export function checkEnvVariables() {
  console.group("🕵️ Verificação de Variáveis de Ambiente (Produção)");

  const variables = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_STRIPE_PUBLIC_KEY',
    'VITE_STRIPE_PRICE_ID', // Adicionado para debug
  ];

  variables.forEach(varName => {
    const value = (import.meta.env as any)[varName];
    if (value) {
      console.log(`✅ ${varName}: Encontrada.`);
    } else {
      console.error(`❌ ${varName}: NÃO ENCONTRADA! Este é o motivo do erro.`);
    }
  });

  console.groupEnd();
}
