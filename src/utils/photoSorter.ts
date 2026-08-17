import { GalleryPhoto } from '../types/gallery';

export type PhotoSortMode = 'capture_asc' | 'capture_desc' | 'name_asc' | 'name_desc' | 'order_asc';

/**
 * Ordena fotos com alta precisão usando hora de captura EXIF, timestamp ISO ou ordenação natural por nome de arquivo
 */
export function sortGalleryPhotos(photos: GalleryPhoto[], sortMode: PhotoSortMode): GalleryPhoto[] {
  if (!photos || photos.length <= 1) return photos;

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

  return [...photos].sort((a, b) => {
    if (sortMode === 'capture_asc') {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeA && timeB && timeA !== timeB) {
        return timeA - timeB;
      }
      return collator.compare(a.file_name || '', b.file_name || '');
    }

    if (sortMode === 'capture_desc') {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeA && timeB && timeA !== timeB) {
        return timeB - timeA;
      }
      return collator.compare(b.file_name || '', a.file_name || '');
    }

    if (sortMode === 'name_asc') {
      return collator.compare(a.file_name || '', b.file_name || '');
    }

    if (sortMode === 'name_desc') {
      return collator.compare(b.file_name || '', a.file_name || '');
    }

    // Default: ordem manual / display_order
    return (a.display_order ?? 0) - (b.display_order ?? 0);
  });
}
