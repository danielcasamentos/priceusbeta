import { supabase } from '../lib/supabase';
import { Gallery, GalleryPhoto, GalleryFormData, FileUploadProgress } from '../types/gallery';
import { processImageForGallery, convertWebpToLowResJpeg } from './galleryImageProcessor';
import { getStorageAdapter } from './storage/storageAdapterFactory';
import JSZip from 'jszip';

export class GalleryService {
  /**
   * Gera um slug limpo e único a partir de um título
   */
  static generateSlug(title: string): string {
    const clean = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-');
    return `${clean}-${Math.random().toString(36).substring(2, 6)}`;
  }

  /**
   * Criptografa/Gera Hash simples de senha para proteção da galeria
   */
  static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Busca todas as galerias do fotógrafo logado
   */
  static async getUserGalleries(userId: string): Promise<Gallery[]> {
    try {
      const { data: galleries, error } = await supabase
        .from('galleries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[GalleryService] Tabela galleries pode não estar criada ainda no banco:', error);
        return [];
      }
      if (!galleries || galleries.length === 0) return [];

      // Buscar contagem de fotos para cada galeria
      const { data: photoCounts } = await supabase
        .from('gallery_photos')
        .select('gallery_id');

      const countMap: Record<string, number> = {};
      if (photoCounts) {
        photoCounts.forEach((p) => {
          countMap[p.gallery_id] = (countMap[p.gallery_id] || 0) + 1;
        });
      }

      return galleries.map((g) => ({
        ...g,
        photo_count: countMap[g.id] || 0,
      }));
    } catch (err) {
      console.warn('[GalleryService] Erro ao carregar galerias:', err);
      return [];
    }
  }

  /**
   * Cria uma nova galeria
   */
  static async createGallery(userId: string, formData: GalleryFormData): Promise<Gallery> {
    let passwordHash: string | null = null;
    if (formData.password && formData.password.trim().length > 0) {
      passwordHash = await this.hashPassword(formData.password);
    }

    const slug = formData.slug ? formData.slug.trim() : this.generateSlug(formData.title);

    const { data, error } = await supabase
      .from('galleries')
      .insert({
        user_id: userId,
        client_id: formData.client_id || null,
        title: formData.title,
        slug,
        event_date: formData.event_date || null,
        password_hash: passwordHash,
        is_public_portfolio: formData.is_public_portfolio,
        allow_low_res_download: formData.allow_low_res_download,
        allow_high_res_download: formData.allow_high_res_download,
        watermark_enabled: formData.watermark_enabled,
        watermark_text: formData.watermark_text || null,
        price_per_extra_photo: formData.price_per_extra_photo || 0,
        status: formData.status || 'active',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Atualiza as configurações de uma galeria
   */
  static async updateGallery(galleryId: string, formData: Partial<GalleryFormData>): Promise<Gallery> {
    const payload: any = {
      title: formData.title,
      event_date: formData.event_date || null,
      client_id: formData.client_id || null,
      is_public_portfolio: formData.is_public_portfolio,
      allow_low_res_download: formData.allow_low_res_download,
      allow_high_res_download: formData.allow_high_res_download,
      watermark_enabled: formData.watermark_enabled,
      watermark_text: formData.watermark_text || null,
      price_per_extra_photo: formData.price_per_extra_photo || 0,
      status: formData.status,
      updated_at: new Date().toISOString(),
    };

    if (formData.slug) {
      payload.slug = formData.slug;
    }

    if (formData.remove_password) {
      payload.password_hash = null;
    } else if (formData.password && formData.password.trim().length > 0) {
      payload.password_hash = await this.hashPassword(formData.password);
    }

    const { data, error } = await supabase
      .from('galleries')
      .update(payload)
      .eq('id', galleryId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Define a Foto de Capa da galeria
   */
  static async setCoverPhoto(galleryId: string, photoId: string, photoUrl: string): Promise<void> {
    const { error } = await supabase
      .from('galleries')
      .update({
        cover_photo_id: photoId,
        cover_photo_url: photoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', galleryId);

    if (error) throw error;
  }

  /**
   * Exclui uma galeria e todas as suas fotos
   */
  static async deleteGallery(galleryId: string): Promise<void> {
    const { error } = await supabase.from('galleries').delete().eq('id', galleryId);
    if (error) throw error;
  }

  /**
   * Busca uma galeria pública e suas fotos por Slug
   */
  static async getPublicGalleryBySlug(slug: string): Promise<{
    gallery: Gallery;
    photos: GalleryPhoto[];
    photographer: { nome_profissional?: string; profile_image_url?: string; slug?: string };
  } | null> {
    const { data: gallery, error } = await supabase
      .from('galleries')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !gallery) return null;

    // Buscar perfil do fotógrafo para branding do cabeçalho
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome_profissional, profile_image_url, slug_usuario')
      .eq('id', gallery.user_id)
      .single();

    // Buscar fotos da galeria ordenadas por display_order
    const { data: photos } = await supabase
      .from('gallery_photos')
      .select('*')
      .eq('gallery_id', gallery.id)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    return {
      gallery,
      photos: photos || [],
      photographer: {
        nome_profissional: profile?.nome_profissional,
        profile_image_url: profile?.profile_image_url,
        slug: profile?.slug_usuario,
      },
    };
  }

  /**
   * Busca todas as galerias públicas marcadas para o Portfólio de um fotógrafo pelo slugUsuario
   */
  static async getPublicPortfolio(slugUsuario: string): Promise<{
    photographer: { nome_profissional?: string; profile_image_url?: string; bio?: string; slug: string };
    galleries: Gallery[];
  } | null> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, nome_profissional, profile_image_url, apresentacao, slug_usuario')
      .eq('slug_usuario', slugUsuario)
      .single();

    if (!profile) return null;

    const { data: galleries } = await supabase
      .from('galleries')
      .select('*')
      .eq('user_id', profile.id)
      .eq('is_public_portfolio', true)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    return {
      photographer: {
        nome_profissional: profile.nome_profissional,
        profile_image_url: profile.profile_image_url,
        bio: profile.apresentacao,
        slug: profile.slug_usuario,
      },
      galleries: galleries || [],
    };
  }

  /**
   * Valida se a senha informada corresponde ao hash da galeria
   */
  static async verifyGalleryPassword(gallery: Gallery, inputPassword: string): Promise<boolean> {
    if (!gallery.password_hash) return true;
    const inputHash = await this.hashPassword(inputPassword);
    return inputHash === gallery.password_hash;
  }

  /**
   * Executa o pipeline de upload para um lote de arquivos com acompanhamento individual
   */
  static async uploadBatchPhotos(
    gallery: Gallery,
    files: File[],
    googleAccessToken?: string | null,
    onProgressUpdate?: (updates: Record<string, FileUploadProgress>) => void
  ): Promise<GalleryPhoto[]> {
    const adapter = getStorageAdapter(googleAccessToken);
    const progressMap: Record<string, FileUploadProgress> = {};
    const uploadedPhotos: GalleryPhoto[] = [];

    // Garantir pasta no adaptador
    let folderId = gallery.google_drive_folder_id;
    if (!folderId) {
      folderId = await adapter.ensureGalleryFolder(gallery.title, gallery.google_drive_folder_id);
      if (folderId && adapter.providerName === 'google_drive') {
        // Atualizar id da pasta no banco
        await supabase.from('galleries').update({ google_drive_folder_id: folderId }).eq('id', gallery.id);
      }
    }

    const watermarkText = gallery.watermark_enabled ? gallery.watermark_text || 'PriceU$' : null;

    // Processar cada arquivo sequencialmente para garantir rastreabilidade e evitar timeout
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const fileKey = `${file.name}_${index}`;

      progressMap[fileKey] = {
        fileId: fileKey,
        fileName: file.name,
        progress: 10,
        status: 'compressing',
      };
      if (onProgressUpdate) onProgressUpdate({ ...progressMap });

      try {
        // 1. Processamento e Compressão Local (Thumb + Web Display + Marca d'Água)
        const processed = await processImageForGallery(file, watermarkText);

        progressMap[fileKey].progress = 30;
        progressMap[fileKey].status = 'uploading_thumb';
        if (onProgressUpdate) onProgressUpdate({ ...progressMap });

        // 2. Upload Thumb no Supabase Storage
        const fileExt = 'webp';
        const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const thumbPath = `thumbs/${gallery.id}/${cleanName}`;

        const { error: thumbErr } = await supabase.storage
          .from('gallery-assets')
          .upload(thumbPath, processed.thumbBlob, { contentType: 'image/webp', upsert: true });

        if (thumbErr) throw new Error(`Erro no thumbnail: ${thumbErr.message}`);

        progressMap[fileKey].progress = 50;
        progressMap[fileKey].status = 'uploading_web';
        if (onProgressUpdate) onProgressUpdate({ ...progressMap });

        // 3. Upload Web Display no Supabase Storage
        const webPath = `web/${gallery.id}/${cleanName}`;
        const { error: webErr } = await supabase.storage
          .from('gallery-assets')
          .upload(webPath, processed.webBlob, { contentType: 'image/webp', upsert: true });

        if (webErr) throw new Error(`Erro na imagem web: ${webErr.message}`);

        progressMap[fileKey].progress = 70;
        progressMap[fileKey].status = 'uploading_original';
        if (onProgressUpdate) onProgressUpdate({ ...progressMap });

        // 4. Upload da Imagem Original High-Res via StorageAdapter
        const originalResult = await adapter.uploadOriginal(
          file,
          folderId || gallery.id,
          (percent) => {
            progressMap[fileKey].progress = 70 + Math.round(percent * 0.25);
            if (onProgressUpdate) onProgressUpdate({ ...progressMap });
          }
        );

        // 5. Salvar registro na tabela gallery_photos
        const thumbPublicUrl = supabase.storage.from('gallery-assets').getPublicUrl(thumbPath).data.publicUrl;
        const webPublicUrl = supabase.storage.from('gallery-assets').getPublicUrl(webPath).data.publicUrl;

        const { data: photoRecord, error: dbErr } = await supabase
          .from('gallery_photos')
          .insert({
            gallery_id: gallery.id,
            google_drive_file_id: originalResult.fileId,
            supabase_thumb_path: thumbPublicUrl,
            supabase_web_path: webPublicUrl,
            file_name: file.name,
            file_size_bytes: processed.fileSizeBytes,
            width: processed.width,
            height: processed.height,
            display_order: index,
          })
          .select()
          .single();

        if (dbErr) throw dbErr;

        // Se a galeria ainda não possuir foto de capa, define a primeira como capa automaticamente
        if (!gallery.cover_photo_url && index === 0) {
          await this.setCoverPhoto(gallery.id, photoRecord.id, webPublicUrl);
        }

        progressMap[fileKey].progress = 100;
        progressMap[fileKey].status = 'completed';
        progressMap[fileKey].photoRecord = photoRecord;
        uploadedPhotos.push(photoRecord);
      } catch (err: any) {
        console.error(`Erro ao fazer upload da foto ${file.name}:`, err);
        progressMap[fileKey].status = 'error';
        progressMap[fileKey].errorMessage = err.message || 'Falha no upload';
      }

      if (onProgressUpdate) onProgressUpdate({ ...progressMap });
    }

    return uploadedPhotos;
  }

  /**
   * Deleta uma foto individual
   */
  static async deletePhoto(photoId: string): Promise<void> {
    const { error } = await supabase.from('gallery_photos').delete().eq('id', photoId);
    if (error) throw error;
  }

  /**
   * Gera um arquivo ZIP contendo todas ou as fotos selecionadas para download em lote
   * Para baixa resolução, converte on-the-fly para JPEG (.jpg) com no máximo 1920px (96 DPI)
   * Para alta resolução, inclui o arquivo original intacto do upload
   */
  static async generateGalleryZip(
    _galleryTitle: string,
    photos: GalleryPhoto[],
    useHighRes: boolean = false,
    googleAccessToken?: string | null,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    const zip = new JSZip();
    const adapter = getStorageAdapter(googleAccessToken);

    const total = photos.length;
    for (let i = 0; i < total; i++) {
      const photo = photos[i];
      const rawName = photo.file_name || `foto_${i + 1}`;
      const baseName = rawName.replace(/\.(webp|png|jpeg|jpg)$/i, '');

      try {
        let blob: Blob;
        let finalFileName: string;

        if (useHighRes && photo.google_drive_file_id) {
          // Alta Resolução: Usar arquivo original sem modificações
          const downloadUrl = await adapter.getDownloadUrl(photo.google_drive_file_id);
          const response = await fetch(downloadUrl);
          blob = await response.blob();
          finalFileName = photo.file_name || `${baseName}.jpg`;
        } else {
          // Baixa Resolução: Converter WebP para JPEG de 1920px (96 DPI)
          const downloadUrl = photo.supabase_web_path || photo.supabase_thumb_path;
          blob = await convertWebpToLowResJpeg(downloadUrl, 1920, 0.88);
          finalFileName = `${baseName}.jpg`;
        }

        zip.file(finalFileName, blob);
      } catch (err) {
        console.warn(`Aviso: Falha ao processar foto ${photo.file_name} para o ZIP:`, err);
      }

      if (onProgress) {
        onProgress(Math.round(((i + 1) / total) * 100));
      }
    }

    return await zip.generateAsync({ type: 'blob' });
  }
}
