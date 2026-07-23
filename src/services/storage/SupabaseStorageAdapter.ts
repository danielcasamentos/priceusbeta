import { StorageAdapter } from './StorageAdapter';
import { supabase } from '../../lib/supabase';

export class SupabaseStorageAdapter implements StorageAdapter {
  providerName: 'supabase' = 'supabase';

  async ensureGalleryFolder(_galleryTitle: string, existingFolderId?: string | null): Promise<string | null> {
    // Supabase storage usa caminhos virtuais, retorna uma chave de identificação baseada no título se necessário
    return existingFolderId || `gallery_${Date.now()}`;
  }

  async uploadOriginal(
    file: File,
    folderId: string,
    onProgress?: (percent: number) => void
  ): Promise<{ fileId: string; downloadUrl?: string }> {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `originals/${folderId}/${cleanFileName}`;

    if (onProgress) onProgress(30);

    const { data, error } = await supabase.storage
      .from('gallery-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      throw new Error(`Supabase Storage Upload Error: ${error.message}`);
    }

    if (onProgress) onProgress(100);

    const { data: publicUrlData } = supabase.storage
      .from('gallery-assets')
      .getPublicUrl(data.path);

    return {
      fileId: data.path,
      downloadUrl: publicUrlData.publicUrl,
    };
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    if (fileId.startsWith('http')) return fileId;
    const { data } = supabase.storage.from('gallery-assets').getPublicUrl(fileId);
    return data.publicUrl;
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage.from('gallery-assets').remove([fileId]);
      return !error;
    } catch {
      return false;
    }
  }
}
