/**
 * Sistema de Debug para Contratos - Logs de Formatação CSS e Layout
 */

export interface CSSDebugInfo {
  containerWidth: number;
  containerHeight: number;
  fontSize: number;
  lineHeight: number;
  wordWrap: string;
  whiteSpace: string;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  computedWidth: number;
  computedHeight: number;
  textLength: number;
  wordCount: number;
  lineCount: number;
  timestamp: string;
}

export class ContractDebugLogger {
  private static instance: ContractDebugLogger;
  private logs: CSSDebugInfo[] = [];
  private maxLogs = 50;

  private constructor() {}

  static getInstance(): ContractDebugLogger {
    if (!ContractDebugLogger.instance) {
      ContractDebugLogger.instance = new ContractDebugLogger();
    }
    return ContractDebugLogger.instance;
  }

  /**
   * Captura informações de debug do CSS de um elemento
   */
  captureCSSDebug(element: HTMLElement, context: string = 'unknown'): CSSDebugInfo {
    const computedStyle = window.getComputedStyle(element);

    const debugInfo: CSSDebugInfo = {
      containerWidth: element.offsetWidth,
      containerHeight: element.offsetHeight,
      fontSize: parseFloat(computedStyle.fontSize),
      lineHeight: parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.2,
      wordWrap: computedStyle.wordWrap || computedStyle.overflowWrap,
      whiteSpace: computedStyle.whiteSpace,
      marginLeft: parseFloat(computedStyle.marginLeft),
      marginRight: parseFloat(computedStyle.marginRight),
      marginTop: parseFloat(computedStyle.marginTop),
      marginBottom: parseFloat(computedStyle.marginBottom),
      paddingLeft: parseFloat(computedStyle.paddingLeft),
      paddingRight: parseFloat(computedStyle.paddingRight),
      paddingTop: parseFloat(computedStyle.paddingTop),
      paddingBottom: parseFloat(computedStyle.paddingBottom),
      computedWidth: element.getBoundingClientRect().width,
      computedHeight: element.getBoundingClientRect().height,
      textLength: element.textContent?.length || 0,
      wordCount: element.textContent?.split(/\s+/).length || 0,
      lineCount: this.estimateLineCount(element),
      timestamp: new Date().toISOString(),
    };

    this.logs.push(debugInfo);

    // Mantém apenas os logs mais recentes
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    console.log(`[CONTRACT DEBUG - ${context}] CSS Info:`, debugInfo);

    return debugInfo;
  }

  /**
   * Estima o número de linhas baseado na altura e line-height
   */
  private estimateLineCount(element: HTMLElement): number {
    const computedStyle = window.getComputedStyle(element);
    const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.2;
    const height = element.offsetHeight;

    if (lineHeight > 0 && height > 0) {
      return Math.round(height / lineHeight);
    }

    return 1;
  }

  /**
   * Log de problemas de formatação detectados
   */
  logFormattingIssue(issue: string, details: any, context: string = 'unknown') {
    console.warn(`[CONTRACT FORMATTING ISSUE - ${context}] ${issue}:`, details);
  }

  /**
   * Valida se o layout está adequado para A4
   */
  validateA4Layout(debugInfo: CSSDebugInfo): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    const A4_WIDTH_MM = 210;
    const PIXELS_PER_MM = 3.78; // Aproximadamente 96 DPI / 25.4

    const expectedWidthPx = A4_WIDTH_MM * PIXELS_PER_MM;


    // Verifica largura
    if (Math.abs(debugInfo.containerWidth - expectedWidthPx) > 50) {
      issues.push(`Largura do container (${debugInfo.containerWidth}px) não corresponde à largura A4 (${expectedWidthPx}px)`);
    }

    // Verifica quebras de linha suspeitas
    if (debugInfo.lineCount > 0 && debugInfo.wordCount > 0) {
      const avgWordsPerLine = debugInfo.wordCount / debugInfo.lineCount;
      if (avgWordsPerLine < 2) {
        issues.push(`Quebra de linha suspeita: média de ${avgWordsPerLine.toFixed(1)} palavras por linha`);
      }
    }

    // Verifica margens
    const totalHorizontalMargin = debugInfo.marginLeft + debugInfo.marginRight + debugInfo.paddingLeft + debugInfo.paddingRight;
    if (totalHorizontalMargin < 20) {
      issues.push(`Margens horizontais muito pequenas: ${totalHorizontalMargin}px`);
    }

    // Verifica word-wrap
    if (debugInfo.wordWrap !== 'break-word' && debugInfo.whiteSpace !== 'normal') {
      issues.push(`Configuração de quebra de palavra pode causar problemas: wordWrap=${debugInfo.wordWrap}, whiteSpace=${debugInfo.whiteSpace}`);
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Exporta logs para análise
   */
  exportLogs(): CSSDebugInfo[] {
    return [...this.logs];
  }

  /**
   * Limpa logs
   */
  clearLogs() {
    this.logs = [];
  }
}

// Instância global
export const contractDebugLogger = ContractDebugLogger.getInstance();

/**
 * Hook para debug de CSS em componentes React
 */
export function useContractCSSDebug() {
  const captureDebug = (element: HTMLElement | null, context: string = 'component') => {
    if (element) {
      return contractDebugLogger.captureCSSDebug(element, context);
    }
    return null;
  };

  const logIssue = (issue: string, details: any, context: string = 'component') => {
    contractDebugLogger.logFormattingIssue(issue, details, context);
  };

  const validateLayout = (debugInfo: CSSDebugInfo) => {
    return contractDebugLogger.validateA4Layout(debugInfo);
  };

  return {
    captureDebug,
    logIssue,
    validateLayout,
    exportLogs: contractDebugLogger.exportLogs.bind(contractDebugLogger),
    clearLogs: contractDebugLogger.clearLogs.bind(contractDebugLogger),
  };
}
