import { useRef, useEffect } from 'react';
import { useContractCSSDebug } from '../lib/contractDebug';
// @ts-ignore - contractCSS module
import { getContractA4CSS } from '../lib/contractCSS';

interface ContractPreviewProps {
  content: string;
  className?: string;
  onDebugInfo?: (debugInfo: any) => void;
}

export function ContractPreview({ content, className = '', onDebugInfo }: ContractPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { captureDebug, validateLayout } = useContractCSSDebug();

  useEffect(() => {
    if (containerRef.current) {
      // Captura informações de debug após renderização
      const debugInfo = captureDebug(containerRef.current, 'ContractPreview');

      // Valida layout A4
      if (debugInfo) {
        const validation = validateLayout(debugInfo);
        if (!validation.isValid) {
          console.warn('[ContractPreview] Layout issues detected:', validation.issues);
        }

        if (onDebugInfo) {
          onDebugInfo({ debugInfo, validation });
        }
      }
    }
  }, [content, captureDebug, validateLayout, onDebugInfo]);

  return (
    <div className={`contract-preview ${className}`}>
      <style dangerouslySetInnerHTML={{ __html: getContractA4CSS() }} />
      <div
        ref={containerRef}
        className="contract-content-a4"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
