import { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, RefreshCw } from 'lucide-react';
import { GalleryPhoto } from '../../types/gallery';

interface SmartGalleryImageProps {
  photo?: GalleryPhoto;
  src?: string;
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  objectFit?: 'cover' | 'contain';
}

export function SmartGalleryImage({
  photo,
  src,
  alt = 'Foto',
  className = 'w-full h-full object-cover',
  loading = 'lazy',
  objectFit = 'cover',
}: SmartGalleryImageProps) {
  // Construir lista de URLs candidatas em ordem de prioridade
  const getCandidateUrls = (): string[] => {
    const urls: string[] = [];
    
    if (photo) {
      if (photo.supabase_thumb_path) {
        urls.push(photo.supabase_thumb_path);
      }
      if (photo.supabase_web_path && !urls.includes(photo.supabase_web_path)) {
        urls.push(photo.supabase_web_path);
      }
      if (photo.google_drive_file_id && photo.google_drive_file_id !== 'LOCAL_ONLY') {
        const driveUrl = `https://drive.google.com/uc?export=view&id=${photo.google_drive_file_id}`;
        if (!urls.includes(driveUrl)) {
          urls.push(driveUrl);
        }
      }
    }
    
    if (src && !urls.includes(src)) {
      urls.push(src);
    }
    
    return urls;
  };

  const candidates = getCandidateUrls();
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>(candidates[0] || '');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Recalcular quando photo ou src mudarem
  useEffect(() => {
    const newCandidates = getCandidateUrls();
    setCandidateIndex(0);
    setRetryCount(0);
    setIsLoading(true);
    setIsError(false);
    setCurrentSrc(newCandidates[0] || '');

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [photo?.id, photo?.supabase_thumb_path, photo?.supabase_web_path, src]);

  const handleError = () => {
    const nextIndex = candidateIndex + 1;

    // Se ainda houver URLs candidatas no lote (ex: tentar web_path se thumb falhar)
    if (nextIndex < candidates.length) {
      setCandidateIndex(nextIndex);
      setCurrentSrc(candidates[nextIndex]);
      setIsLoading(true);
      return;
    }

    // Se todas as URLs do lote falharam (imagem ainda processando na nuvem), retenta com cache buster
    if (retryCount < 5) {
      const delayMs = Math.min((retryCount + 1) * 2000, 8000); // 2s, 4s, 6s, 8s, 8s
      setIsLoading(true);
      
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        setCandidateIndex(0);
        const firstUrl = candidates[0];
        if (firstUrl) {
          const cacheBuster = firstUrl.includes('?') ? `&_t=${Date.now()}` : `?_t=${Date.now()}`;
          setCurrentSrc(firstUrl + cacheBuster);
        }
      }, delayMs);
      return;
    }

    // Excedeu retentativas
    setIsLoading(false);
    setIsError(true);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setIsError(false);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center">
      {/* Skeleton / Placeholder de carregamento */}
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-slate-900/90 flex flex-col items-center justify-center p-2 text-slate-500 animate-pulse">
          <RefreshCw className="w-5 h-5 animate-spin text-slate-400 mb-1" />
          <span className="text-[10px] font-medium text-slate-400">Processando foto...</span>
        </div>
      )}

      {/* Placeholder de Erro definitivo (sem ícone quebrado do navegador) */}
      {isError && !isLoading && (
        <div className="absolute inset-0 z-10 bg-slate-950 flex flex-col items-center justify-center p-3 text-center text-slate-500 border border-slate-800">
          <ImageIcon className="w-6 h-6 text-slate-600 mb-1" />
          <span className="text-[10px] text-slate-400 font-semibold">Processando imagem</span>
          <span className="text-[9px] text-slate-600">Aguardando sync</span>
        </div>
      )}

      {/* Imagem Real */}
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          loading={loading}
          onLoad={handleLoad}
          onError={handleError}
          className={`${className} transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ objectFit }}
        />
      )}
    </div>
  );
}
