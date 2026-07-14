/**
 * 🖼️ COMPONENTE DE IMAGEM COM FALLBACK
 *
 * Componente robusto para carregamento de imagens com:
 * - Retry automático em caso de falha
 * - Placeholder enquanto carrega
 * - Fallback para erro
 * - Lazy loading
 * - Cache busting
 */

import { useState, useEffect } from 'react';
import { ImageIcon, AlertCircle, CheckCircle, Copy } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  onError?: () => void;
  retries?: number;
  retryDelay?: number;
}

export function ImageWithFallback({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  onError,
  retries = 3,
  retryDelay = 1000,
}: ImageWithFallbackProps) {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  useEffect(() => {
    // Reset quando src mudar
    console.log(`🖼️ [ImageWithFallback] Nova imagem recebida. URL: ${src}`);
    setImageSrc(src);
    setLoading(true);
    setError(false);
    setRetryCount(0);
  }, [src]);

  const handleError = () => {
    console.error(`❌ [ImageWithFallback] Erro ao carregar imagem (tentativa ${retryCount + 1}/${retries + 1}). URL: ${imageSrc}`);
    if (retryCount < retries) {
      // Tentar novamente com cache-busting
      setTimeout(() => {
        const cacheBust = `${Date.now()}-retry${retryCount + 1}`;
        const newSrc = src.includes('?')
          ? `${src}&cb=${cacheBust}`
          : `${src}?cb=${cacheBust}`;

        console.log(`🔄 [ImageWithFallback] Tentando novamente em ${retryDelay}ms com nova URL: ${newSrc}`);
        setImageSrc(newSrc);
        setRetryCount(prev => prev + 1);
      }, retryDelay);
    } else {
      console.error(`🚨 [ImageWithFallback] Todas as ${retries} tentativas falharam. Exibindo fallback.`);
      // Após todas as tentativas, mostrar fallback
      setError(true);
      setLoading(false);
      onError?.();
    }
  };

  const handleLoad = () => {
    console.log(`✅ [ImageWithFallback] Imagem carregada com sucesso! URL: ${imageSrc}`);
    setLoading(false);
    setError(false);
  };

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-100 text-gray-400 ${fallbackClassName}`}>
        <AlertCircle className="w-12 h-12 mb-2" />
        <p className="text-sm text-center px-4">
          Imagem indisponível
          <br />
          <span className="text-xs">Faça upload de uma nova imagem</span>
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <ImageIcon className="w-10 h-10 text-gray-300 animate-pulse" />
        </div>
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
}

export { CheckCircle, Copy };
