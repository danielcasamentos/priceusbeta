import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCache = async () => {
    try {
      if (typeof localStorage !== 'undefined') {
        const keys = Object.keys(localStorage);
        for (const k of keys) {
          if (k.startsWith('priceus_culling_projects') || k.startsWith('priceus_wa_')) {
            localStorage.removeItem(k);
          }
        }
      }
      if (typeof indexedDB !== 'undefined') {
        indexedDB.deleteDatabase('PriceUS_Culling_SSD_Store');
      }
    } catch (e) {
      console.warn('Erro ao limpar cache:', e);
    }
    window.location.hash = '';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Ops! Ocorreu um erro inesperado na interface</h2>
              <p className="text-sm text-slate-400">
                O aplicativo encontrou um problema ao renderizar este componente. Você pode recarregar a tela ou copiar o log abaixo.
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 rounded-2xl bg-slate-955 border border-slate-800/80 font-mono text-xs text-rose-300 max-h-48 overflow-y-auto space-y-1">
                <div className="font-bold text-rose-400">{this.state.error.message}</div>
                {this.state.error.stack && (
                  <pre className="text-[10px] text-slate-500 whitespace-pre-wrap">{this.state.error.stack}</pre>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="flex-1 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Recarregar Aplicativo</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleCopyDetails}
                  className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
                >
                  {this.state.copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{this.state.copied ? 'Copiado!' : 'Copiar Log'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={this.handleClearCache}
                className="w-full py-3 rounded-2xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>🧹 Limpar Cache do Aplicativo & Iniciar Sessão Limpa</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
