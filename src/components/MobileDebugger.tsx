import { useState, useEffect } from 'react';
import { X, Copy, Trash2, RefreshCw, Bug, CheckCircle, AlertCircle } from 'lucide-react';
import { detectBrowser } from '../lib/browserDetection';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  data?: any;
}

/**
 * Console de debug móvel que pode ser ativado com 3 toques rápidos
 * Exibe informações sobre o navegador, conexão e logs da aplicação
 */
export function MobileDebugger() {
  const [isVisible, setIsVisible] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [_tapCount, setTapCount] = useState(0);
  const [browserInfo, setBrowserInfo] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    // Detectar browser info
    const info = detectBrowser();
    setBrowserInfo(info);

    // Interceptar console.log, console.error, etc.
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      originalLog(...args);
      addLog('info', args.join(' '), args);
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      addLog('error', args.join(' '), args);
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      addLog('warn', args.join(' '), args);
    };

    // Log inicial
    addLog('success', '🚀 Mobile Debugger ativado', { browserInfo: info });

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // Sistema de 3 toques para ativar
  useEffect(() => {
    let tapTimeout: NodeJS.Timeout;

    const handleTap = () => {
      setTapCount((prev) => {
        const newCount = prev + 1;

        if (newCount === 3) {
          setIsVisible((v) => !v);
          return 0;
        }

        return newCount;
      });

      clearTimeout(tapTimeout);
      tapTimeout = setTimeout(() => {
        setTapCount(0);
      }, 1000);
    };

    // Área de toque no canto superior direito
    const debugArea = document.createElement('div');
    debugArea.style.position = 'fixed';
    debugArea.style.top = '0';
    debugArea.style.right = '0';
    debugArea.style.width = '60px';
    debugArea.style.height = '60px';
    debugArea.style.zIndex = '9998';
    debugArea.addEventListener('click', handleTap);
    document.body.appendChild(debugArea);

    return () => {
      clearTimeout(tapTimeout);
      document.body.removeChild(debugArea);
    };
  }, []);

  const addLog = (level: LogEntry['level'], message: string, data?: any) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };

    setLogs((prev) => [...prev.slice(-99), entry]); // Manter últimos 100 logs
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('info', 'Logs limpos');
  };

  const copyLogsToClipboard = async () => {
    const logsText = logs
      .map((log) => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');

    const fullReport = `
=== MOBILE DEBUG REPORT ===

INFORMAÇÕES DO NAVEGADOR:
${JSON.stringify(browserInfo, null, 2)}

CONEXÃO:
Online: ${navigator.onLine}
User Agent: ${navigator.userAgent}

TELA:
Largura: ${window.innerWidth}px
Altura: ${window.innerHeight}px
DPR: ${window.devicePixelRatio}

LOGS:
${logsText}

=== FIM DO RELATÓRIO ===
    `;

    try {
      await navigator.clipboard.writeText(fullReport);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      // Fallback para navegadores que não suportam clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = fullReport;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const forceReload = () => {
    if (confirm('Recarregar página e limpar cache?')) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warn':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Bug className="w-4 h-4 text-blue-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'warn':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-900';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed top-4 right-4 z-[9999] bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-50 pointer-events-none">
        👆 3 toques no canto
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-80 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Mobile Debugger</h2>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Browser Info */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Informações do Navegador</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-600">Browser:</span>{' '}
              <span className="font-medium">{browserInfo?.browser}</span>
            </div>
            <div>
              <span className="text-gray-600">OS:</span>{' '}
              <span className="font-medium">{browserInfo?.os}</span>
            </div>
            <div>
              <span className="text-gray-600">Mobile:</span>{' '}
              <span className="font-medium">{browserInfo?.isMobile ? 'Sim' : 'Não'}</span>
            </div>
            <div>
              <span className="text-gray-600">In-App:</span>{' '}
              <span className="font-medium">{browserInfo?.isInAppBrowser ? 'Sim' : 'Não'}</span>
            </div>
            <div>
              <span className="text-gray-600">Tela:</span>{' '}
              <span className="font-medium">
                {window.innerWidth}x{window.innerHeight}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Online:</span>{' '}
              <span className="font-medium">{navigator.onLine ? '✅ Sim' : '❌ Não'}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 p-4 border-b border-gray-200">
          <button
            onClick={copyLogsToClipboard}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Copy className="w-4 h-4" />
            {copySuccess ? 'Copiado!' : 'Copiar Logs'}
          </button>
          <button
            onClick={clearLogs}
            className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Limpar
          </button>
          <button
            onClick={forceReload}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Recarregar
          </button>
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              Nenhum log ainda. Os logs aparecerão aqui conforme você usa o app.
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${getLevelColor(log.level)} text-xs`}
              >
                <div className="flex items-start gap-2">
                  {getLevelIcon(log.level)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                      </span>
                      <span className="font-semibold uppercase text-[10px]">
                        {log.level}
                      </span>
                    </div>
                    <p className="break-words">{log.message}</p>
                    {log.data && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                          Ver detalhes
                        </summary>
                        <pre className="mt-2 p-2 bg-white rounded text-[10px] overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600 text-center">
            💡 Dica: Copie os logs e envie para o suporte se precisar de ajuda
          </p>
        </div>
      </div>
    </div>
  );
}
