import React, { useState, useMemo } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { GalleryPhoto } from '../../types/gallery';

const loadedImagesCache = new Set<string>();

interface SmartGalleryImageProps {
  photo?: GalleryPhoto;
  src?: string;
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  objectFit?: 'cover' | 'contain';
  preferThumbnail?: boolean;
}

export function SmartGalleryImage({
  photo,
  src,
  alt = 'Foto',
  className = 'w-full h-full object-cover',
  loading = 'lazy',
  objectFit = 'cover',
  preferThumbnail = true,
}: SmartGalleryImageProps) {
  // Construir lista estável de URLs candidatas em ordem de velocidade/prioridade
  const candidateUrls = useMemo(() => {
    const urls: string[] = [];

    if (src && !urls.includes(src)) {
      urls.push(src);
    }

    if (photo) {
      // Extrair file ID do Google Drive de várias fontes
      let driveId = photo.google_drive_file_id && photo.google_drive_file_id !== 'LOCAL_ONLY' ? photo.google_drive_file_id : null;
      if (!driveId && photo.supabase_web_path?.includes('googleusercontent.com/d/')) {
        driveId = photo.supabase_web_path.split('/d/')[1]?.split('=')[0]?.split('?')[0] || null;
      }
      if (!driveId && photo.supabase_thumb_path?.includes('googleusercontent.com/d/')) {
        driveId = photo.supabase_thumb_path.split('/d/')[1]?.split('=')[0]?.split('?')[0] || null;
      }

      if (driveId) {
        const driveCdnThumb = `https://lh3.googleusercontent.com/d/${driveId}=w800`;
        const driveThumbnailApi = `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`;
        const driveCdnWeb = `https://lh3.googleusercontent.com/d/${driveId}=w1600`;
        const driveUcView = `https://drive.google.com/uc?export=view&id=${driveId}`;
        const driveDocsView = `https://docs.google.com/uc?id=${driveId}`;

        if (preferThumbnail) {
          if (!urls.includes(driveCdnThumb)) urls.push(driveCdnThumb);
          if (!urls.includes(driveThumbnailApi)) urls.push(driveThumbnailApi);
          if (!urls.includes(driveCdnWeb)) urls.push(driveCdnWeb);
          if (!urls.includes(driveUcView)) urls.push(driveUcView);
          if (!urls.includes(driveDocsView)) urls.push(driveDocsView);
        } else {
          if (!urls.includes(driveCdnWeb)) urls.push(driveCdnWeb);
          if (!urls.includes(driveCdnThumb)) urls.push(driveCdnThumb);
          if (!urls.includes(driveThumbnailApi)) urls.push(driveThumbnailApi);
          if (!urls.includes(driveUcView)) urls.push(driveUcView);
        }
      }

      if (photo.supabase_thumb_path && !urls.includes(photo.supabase_thumb_path)) {
        urls.push(photo.supabase_thumb_path);
      }

      if (photo.supabase_web_path && !urls.includes(photo.supabase_web_path)) {
        urls.push(photo.supabase_web_path);
      }
    }

    return urls;
  }, [photo?.id, photo?.supabase_thumb_path, photo?.supabase_web_path, photo?.google_drive_file_id, src, preferThumbnail]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentUrl = candidateUrls[currentIndex] || '';
  const isCached = currentUrl ? loadedImagesCache.has(currentUrl) : false;

  const [isLoaded, setIsLoaded] = useState(isCached);
  const [isError, setIsError] = useState(false);

  // Resetar estado quando os candidatos da foto mudarem
  React.useEffect(() => {
    setCurrentIndex(0);
    setIsError(false);
    setIsLoaded(currentUrl ? loadedImagesCache.has(currentUrl) : false);
  }, [candidateUrls]);

  const handleError = () => {
    if (currentIndex + 1 < candidateUrls.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsError(true);
    }
  };

  const handleLoad = () => {
    if (currentUrl) loadedImagesCache.add(currentUrl);
    setIsLoaded(true);
    setIsError(false);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center">
      {/* Skeleton suave de baixa prioridade enquanto carrega */}
      {!isLoaded && !isError && (
        <div className="absolute inset-0 z-10 bg-slate-900/60 flex items-center justify-center pointer-events-none">
          <div className="w-4 h-4 rounded-full border-2 border-slate-700 border-t-slate-400 animate-spin" />
        </div>
      )}

      {/* Placeholder em caso de erro definitivo */}
      {isError && (
        <div className="absolute inset-0 z-10 bg-slate-950 flex flex-col items-center justify-center p-2 text-center text-slate-500 border border-slate-800">
          <ImageIcon className="w-5 h-5 text-slate-700 mb-1" />
          <span className="text-[9px] text-slate-500">Imagem indisponível</span>
        </div>
      )}

      {/* Imagem Nativa com Decodificação Assíncrona */}
      {currentUrl && !isError && (
        <img
          src={currentUrl}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`${className} transition-opacity duration-200 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ objectFit }}
        />
      )}
    </div>
  );
}
