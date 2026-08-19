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
  // Construir lista de URLs candidatas estáveis
  const candidateUrls = useMemo(() => {
    const urls: string[] = [];

    const addUrl = (u?: string | null) => {
      if (u && !urls.includes(u)) urls.push(u);
    };

    // Extrair file ID do Google Drive de várias fontes possíveis
    let driveId: string | null = null;
    if (photo?.google_drive_file_id && photo.google_drive_file_id !== 'LOCAL_ONLY') {
      driveId = photo.google_drive_file_id;
    }
    if (!driveId && photo?.supabase_web_path?.includes('googleusercontent.com/d/')) {
      driveId = photo.supabase_web_path.split('/d/')[1]?.split('=')[0]?.split('?')[0] || null;
    }
    if (!driveId && photo?.supabase_thumb_path?.includes('googleusercontent.com/d/')) {
      driveId = photo.supabase_thumb_path.split('/d/')[1]?.split('=')[0]?.split('?')[0] || null;
    }
    if (!driveId && src?.includes('googleusercontent.com/d/')) {
      driveId = src.split('/d/')[1]?.split('=')[0]?.split('?')[0] || null;
    }
    if (!driveId && (src?.includes('drive.google.com') || photo?.supabase_web_path?.includes('drive.google.com'))) {
      const match = (src || photo?.supabase_web_path || '').match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match) driveId = match[1];
    }

    if (driveId) {
      const driveThumb800 = `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`;
      const driveThumb1600 = `https://drive.google.com/thumbnail?id=${driveId}&sz=w1600`;
      const driveThumb1200 = `https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`;
      const driveCdnThumb = `https://lh3.googleusercontent.com/d/${driveId}=w800`;
      const driveCdnThumb600 = `https://lh3.googleusercontent.com/d/${driveId}=w600`;
      const driveCdnWeb = `https://lh3.googleusercontent.com/d/${driveId}=w1600`;
      const driveCdnWeb1200 = `https://lh3.googleusercontent.com/d/${driveId}=w1200`;
      const driveUcView = `https://drive.google.com/uc?export=view&id=${driveId}`;
      const driveDocsView = `https://docs.google.com/uc?id=${driveId}`;

      if (preferThumbnail) {
        addUrl(driveThumb800);
        addUrl(driveCdnThumb);
        addUrl(driveCdnThumb600);
        addUrl(driveThumb1200);
        addUrl(driveCdnWeb1200);
        addUrl(driveCdnWeb);
        addUrl(driveUcView);
        addUrl(driveDocsView);
      } else {
        addUrl(driveCdnWeb);
        addUrl(driveThumb1600);
        addUrl(driveCdnWeb1200);
        addUrl(driveThumb1200);
        addUrl(driveThumb800);
        addUrl(driveCdnThumb);
        addUrl(driveUcView);
        addUrl(driveDocsView);
      }
    }

    if (src) addUrl(src);
    if (photo?.supabase_thumb_path) addUrl(photo.supabase_thumb_path);
    if (photo?.supabase_web_path) addUrl(photo.supabase_web_path);

    return urls;
  }, [photo?.id, photo?.supabase_thumb_path, photo?.supabase_web_path, photo?.google_drive_file_id, src, preferThumbnail]);

  const photoKey = `${photo?.id || ''}_${photo?.google_drive_file_id || ''}_${src || ''}_${preferThumbnail}`;

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentUrl = candidateUrls[currentIndex] || '';
  const isCached = currentUrl ? loadedImagesCache.has(currentUrl) : false;

  const [isLoaded, setIsLoaded] = useState(isCached);
  const [isError, setIsError] = useState(false);

  // Resetar estado de forma estável quando a foto mudar
  React.useEffect(() => {
    setCurrentIndex(0);
    setIsError(false);
    const initialUrl = candidateUrls[0] || '';
    setIsLoaded(initialUrl ? loadedImagesCache.has(initialUrl) : false);
  }, [photoKey]);

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
      {/* Skeleton suave enquanto carrega */}
      {!isLoaded && !isError && (
        <div className="absolute inset-0 z-10 bg-slate-900/60 flex items-center justify-center pointer-events-none">
          <div className="w-4 h-4 rounded-full border-2 border-slate-700 border-t-slate-400 animate-spin" />
        </div>
      )}

      {/* Placeholder apenas se todas as URLs falharem */}
      {isError && (
        <div className="absolute inset-0 z-10 bg-slate-950 flex flex-col items-center justify-center p-2 text-center text-slate-500 border border-slate-800">
          <ImageIcon className="w-5 h-5 text-slate-700 mb-1" />
          <span className="text-[9px] text-slate-500">Imagem indisponível</span>
        </div>
      )}

      {/* Imagem Nativa com Decodificação Assíncrona e No-Referrer */}
      {currentUrl && !isError && (
        <img
          src={currentUrl}
          alt={alt}
          loading={loading}
          decoding="async"
          referrerPolicy="no-referrer"
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
