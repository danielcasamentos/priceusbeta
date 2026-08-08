import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import { initGlobalLogger } from './lib/logger';

// Inicializar interceptador de logs de segurança globalmente
initGlobalLogger();

// No Electron desktop (protocolo file: ou UserAgent Electron), desativa ServiceWorkers do PWA
// para evitar que o Workbox tente pre-cachear URLs via HTTP gerando 'Failed to fetch'
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && (window.location.protocol === 'file:' || navigator.userAgent.toLowerCase().includes('electron'))) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HelmetProvider>
  </StrictMode>
);
