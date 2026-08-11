/**
 * Platform Adapter Engine - PriceU$ (Web & Desktop Native)
 * Abstração de funcionalidades entre Navegador Web e App Nativo Desktop (Tauri / Electron)
 */

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  category: 'CULLING' | 'SUPABASE' | 'STORAGE' | 'SYSTEM' | 'AI';
  message: string;
  details?: any; // Exibido apenas para e-mails de desenvolvedor autorizados
}

// E-mails autorizados para visualizar o Log de Desenvolvedor Completo (com tokens e payloads)
const AUTHORIZED_DEV_EMAILS = [
  'odanielfotografo@icloud.com',
  'admin@priceus.com.br',
  'dev@priceus.com.br',
];

// ⚠️ TEMPORÁRIO — desativar após diagnóstico (mudar para false)
const DEBUG_ALL_USERS = true;

class PlatformAdapterService {
  private logListeners: ((logs: SystemLogEntry[]) => void)[] = [];
  private logsBuffer: SystemLogEntry[] = [];
  private readonly maxLogs = 300;

  constructor() {
    this.addLog('info', 'SYSTEM', 'Platform Adapter inicializado com sucesso.');
  }

  /**
   * Identifica se a aplicação está rodando dentro do App Nativo Desktop (Tauri / Electron)
   */
  public isNativeDesktop(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).__TAURI__ || !!(window as any).electron;
  }

  /**
   * Verifica se o e-mail logado possui privilégios de Desenvolvedor Completo.
   * DEBUG_ALL_USERS = true → todos os usuários têm acesso completo (temporário).
   */
  public isDevAuthorized(userEmail?: string | null): boolean {
    if (DEBUG_ALL_USERS) return true; // ⚠️ TEMPORÁRIO
    if (!userEmail) return false;
    return AUTHORIZED_DEV_EMAILS.includes(userEmail.trim().toLowerCase());
  }

  /**
   * Abre uma URL no navegador padrão do sistema operacional (macOS / Windows)
   * sem abrir iFrames ou janelas in-app restritivas
   */
  public async openExternalUrl(url: string): Promise<void> {
    this.addLog('info', 'SYSTEM', `Abrindo URL externa no navegador padrão: ${url}`);
    
    if (this.isNativeDesktop()) {
      try {
        const tauriShell = (window as any).__TAURI__?.shell;
        if (tauriShell?.open) {
          await tauriShell.open(url);
          return;
        }
      } catch (err) {
        console.warn('[PlatformAdapter] Erro ao abrir via Tauri shell, usando fallback:', err);
      }
    }

    // Fallback padrão da Web (Abre em nova aba no navegador padrão)
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /**
   * Registra um evento de log no sistema
   */
  public addLog(
    level: 'info' | 'warn' | 'error' | 'success',
    category: 'CULLING' | 'SUPABASE' | 'STORAGE' | 'SYSTEM' | 'AI',
    message: string,
    details?: any
  ): void {
    const entry: SystemLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
      level,
      category,
      message,
      details,
    };

    this.logsBuffer.unshift(entry);
    if (this.logsBuffer.length > this.maxLogs) {
      this.logsBuffer = this.logsBuffer.slice(0, this.maxLogs);
    }

    this.notifyListeners();
  }

  /**
   * Retorna os logs acumulados
   */
  public getLogs(): SystemLogEntry[] {
    return [...this.logsBuffer];
  }

  /**
   * Inscreve um ouvinte para receber novos logs em tempo real
   */
  public subscribeLogs(listener: (logs: SystemLogEntry[]) => void): () => void {
    this.logListeners.push(listener);
    listener([...this.logsBuffer]);

    return () => {
      this.logListeners = this.logListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Limpa o buffer de logs
   */
  public clearLogs(): void {
    this.logsBuffer = [];
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.logListeners.forEach((listener) => listener([...this.logsBuffer]));
  }
}

export const platformAdapter = new PlatformAdapterService();
