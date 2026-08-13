import { supabase } from '../lib/supabase';
import { Gallery, GalleryPhoto, GalleryFormData, FileUploadProgress, GalleryVisitor, GalleryOrder } from '../types/gallery';
import { processImageForGallery, convertWebpToLowResJpeg } from './galleryImageProcessor';
import { getStorageAdapter } from './storage/storageAdapterFactory';
import { NotificationService } from './notificationService';
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

    const basePayload: any = {
      user_id: userId,
      client_id: formData.client_id || null,
      title: formData.title,
      slug,
      event_date: formData.event_date || null,
      password_hash: passwordHash,
      is_public_portfolio: formData.is_public_portfolio ?? true,
      allow_low_res_download: formData.allow_low_res_download ?? true,
      allow_high_res_download: formData.allow_high_res_download ?? true,
      watermark_enabled: formData.watermark_enabled ?? true,
      watermark_text: formData.watermark_text || 'PriceU$',
      price_per_extra_photo: formData.price_per_extra_photo || 0,
      package_photo_limit: formData.package_photo_limit || 0,
      progressive_discounts: formData.progressive_discounts || [],
      status: formData.status || 'active',
    };

    // Tenta primeiro com as colunas estendidas
    const extendedPayload = {
      ...basePayload,
      require_lead_capture: formData.require_lead_capture ?? true,
      enable_social_promo: formData.enable_social_promo ?? false,
      photographer_instagram: formData.photographer_instagram || null,
    };

    let { data, error } = await supabase
      .from('galleries')
      .insert(extendedPayload)
      .select()
      .single();

    // Se o banco retornar erro de coluna não encontrada (PGRST204 ou 42703), tenta com basePayload
    if (error && (error.code === 'PGRST204' || error.message?.includes('column') || error.code === '42703')) {
      console.warn('[GalleryService] Colunas avançadas não encontradas no schema do Supabase, tentando inserção base:', error.message);
      const retry = await supabase
        .from('galleries')
        .insert(basePayload)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    const createdGallery = data || {
      id: `gal_${Date.now()}`,
      ...basePayload,
      created_at: new Date().toISOString(),
    };

    // Salvar cache local para suporte offline/fallback
    try {
      const existing = localStorage.getItem('priceus_local_galleries');
      const list = existing ? JSON.parse(existing) : [];
      list.unshift(createdGallery);
      localStorage.setItem('priceus_local_galleries', JSON.stringify(list.slice(0, 50)));
    } catch (e) {
      console.warn('Erro ao salvar cache de galeria local:', e);
    }

    return createdGallery;
  }

  /**
   * Atualiza as configurações de uma galeria
   */
  static async updateGallery(galleryId: string, formData: Partial<GalleryFormData>): Promise<Gallery> {
    const basePayload: any = {
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
      basePayload.slug = formData.slug;
    }

    if (formData.remove_password) {
      basePayload.password_hash = null;
    } else if (formData.password && formData.password.trim().length > 0) {
      basePayload.password_hash = await this.hashPassword(formData.password);
    }

    const extendedPayload = {
      ...basePayload,
      package_photo_limit: formData.package_photo_limit ?? 0,
      progressive_discounts: formData.progressive_discounts || [],
      require_lead_capture: formData.require_lead_capture,
      enable_social_promo: formData.enable_social_promo,
      photographer_instagram: formData.photographer_instagram || null,
    };

    let { data, error } = await supabase
      .from('galleries')
      .update(extendedPayload)
      .eq('id', galleryId)
      .select()
      .single();

    if (error && (error.code === 'PGRST204' || error.message?.includes('column') || error.code === '42703')) {
      console.warn('[GalleryService] Colunas avançadas não encontradas no schema do Supabase em update, tentando atualização base:', error.message);
      const retry = await supabase
        .from('galleries')
        .update(basePayload)
        .eq('id', galleryId)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    return data;
  }

  /**
   * Calcula o preço exato das fotos extras com descontos progressivos
   */
  static calculateExtraPhotosPrice(gallery: Gallery, totalSelected: number): {
    extraCount: number;
    unitPrice: number;
    totalPrice: number;
    discountApplied: boolean;
  } {
    const limit = gallery.package_photo_limit || 0;
    if (limit <= 0 || totalSelected <= limit) {
      return { extraCount: 0, unitPrice: 0, totalPrice: 0, discountApplied: false };
    }

    const extraCount = totalSelected - limit;
    let unitPrice = gallery.price_per_extra_photo || 0;
    let discountApplied = false;

    // Verificar faixas de desconto progressivo
    if (gallery.progressive_discounts && gallery.progressive_discounts.length > 0) {
      const matchingTier = gallery.progressive_discounts.find(
        (t) => extraCount >= t.min_photos && extraCount <= t.max_photos
      );
      if (matchingTier) {
        unitPrice = matchingTier.price_per_photo;
        discountApplied = true;
      }
    }

    return {
      extraCount,
      unitPrice,
      totalPrice: extraCount * unitPrice,
      discountApplied,
    };
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
   * Exclui múltiplas galerias em lote
   */
  static async deleteMultipleGalleries(galleryIds: string[]): Promise<void> {
    if (!galleryIds || galleryIds.length === 0) return;
    const { error } = await supabase.from('galleries').delete().in('id', galleryIds);
    if (error) throw error;
  }

  /**
   * Busca uma galeria pública e suas fotos por Slug com Fallback para localStorage
   */
  static async getPublicGalleryBySlug(slug: string): Promise<{
    gallery: Gallery;
    photos: GalleryPhoto[];
    photographer: { nome_profissional?: string; profile_image_url?: string; slug?: string };
  } | null> {
    try {
      const { data: gallery, error } = await supabase
        .from('galleries')
        .select('*')
        .eq('slug', slug)
        .single();

      if (!error && gallery) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nome_profissional, profile_image_url, slug_usuario')
          .eq('id', gallery.user_id)
          .single();

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
    } catch (e) {
      console.warn('[GalleryService] Supabase indisponível ou tabela inexistente, tentando fallback local:', e);
    }

    // Fallback para LocalStorage
    try {
      const savedLocal = localStorage.getItem('priceus_local_galleries');
      if (savedLocal) {
        const localGalleries: any[] = JSON.parse(savedLocal);
        const match = localGalleries.find((g) => g.slug === slug);
        if (match) {
          return {
            gallery: match,
            photos: match.photos || [],
            photographer: {
              nome_profissional: 'Estúdio PriceU$',
              profile_image_url: undefined,
              slug: 'estudio',
            },
          };
        }
      }
    } catch (err) {
      console.error('Erro ao ler fallback local de galerias:', err);
    }

    return null;
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
    resolutionMode: 'high' | 'low' | 'both' = 'high',
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
        const webUrl = photo.supabase_web_path || photo.supabase_thumb_path;

        if (resolutionMode === 'both' || resolutionMode === 'high') {
          if (photo.google_drive_file_id) {
            const downloadUrl = await adapter.getDownloadUrl(photo.google_drive_file_id);
            const response = await fetch(downloadUrl);
            if (response.ok) {
              const highResBlob = await response.blob();
              const folderPrefix = resolutionMode === 'both' ? 'Alta_Resolucao/' : '';
              zip.file(`${folderPrefix}${baseName}_HD.jpg`, highResBlob);
            }
          }
        }

        if (resolutionMode === 'both' || resolutionMode === 'low') {
          if (webUrl) {
            const lowResBlob = await convertWebpToLowResJpeg(webUrl, 1920, 0.88);
            const folderPrefix = resolutionMode === 'both' ? 'Baixa_Resolucao/' : '';
            zip.file(`${folderPrefix}${baseName}_Web.jpg`, lowResBlob);
          }
        }
      } catch (err) {
        console.warn(`Aviso: Falha ao processar foto ${photo.file_name} para o ZIP:`, err);
      }

      if (onProgress) {
        onProgress(Math.round(((i + 1) / total) * 100));
      }
    }

    return await zip.generateAsync({ type: 'blob' });
  }

  /**
   * Transfere todas as fotos salvas no Supabase Storage de uma galeria para o Google Drive
   * e exclui os arquivos pesados do Supabase Storage para liberar espaço imediatamente.
   */
  static async offloadGalleryPhotosToDrive(
    gallery: Gallery,
    googleAccessToken: string,
    onProgress?: (current: number, total: number, fileName: string) => void
  ): Promise<{ transferredCount: number; freedBytes: number }> {
    const adapter = getStorageAdapter(googleAccessToken);
    if (adapter.providerName !== 'google_drive') {
      throw new Error('Google Drive não está conectado nesta conta.');
    }

    // 1. Garantir pasta da galeria no Google Drive (/PriceUS_Galerias/[Nome Galeria])
    let folderId = gallery.google_drive_folder_id;
    if (!folderId) {
      folderId = await adapter.ensureGalleryFolder(gallery.title, gallery.google_drive_folder_id);
      if (folderId) {
        await supabase.from('galleries').update({ google_drive_folder_id: folderId }).eq('id', gallery.id);
      }
    }

    // 2. Buscar fotos da galeria
    const { data: photos, error } = await supabase
      .from('gallery_photos')
      .select('*')
      .eq('gallery_id', gallery.id);

    if (error || !photos || photos.length === 0) return { transferredCount: 0, freedBytes: 0 };

    // Filtrar fotos que estão armazenadas no Supabase Storage
    const photosToMigrate = photos.filter((p) => {
      const isSupabase = p.supabase_web_path?.includes('supabase.co/storage') || p.supabase_thumb_path?.includes('supabase.co/storage');
      return !p.google_drive_file_id || isSupabase;
    });

    let transferredCount = 0;
    let freedBytes = 0;

    for (let i = 0; i < photosToMigrate.length; i++) {
      const photo = photosToMigrate[i];
      if (onProgress) onProgress(i + 1, photosToMigrate.length, photo.file_name || `foto_${i + 1}.jpg`);

      try {
        const fileUrl = photo.supabase_web_path || photo.supabase_thumb_path;
        if (!fileUrl) continue;

        // Baixar blob da foto do Supabase Storage
        const resp = await fetch(fileUrl);
        if (!resp.ok) continue;
        const blob = await resp.blob();
        const fileObj = new File([blob], photo.file_name || `foto_${i + 1}.jpg`, { type: blob.type || 'image/jpeg' });

        // Fazer upload para o Google Drive
        const originalResult = await adapter.uploadOriginal(fileObj, folderId || gallery.id);
        const driveWebUrl = `https://lh3.googleusercontent.com/d/${originalResult.fileId}=w1600`;
        const driveThumbUrl = `https://lh3.googleusercontent.com/d/${originalResult.fileId}=w600`;

        // Atualizar banco de dados com a URL do CDN do Google e o ID do arquivo original
        await supabase
          .from('gallery_photos')
          .update({
            google_drive_file_id: originalResult.fileId,
            supabase_web_path: driveWebUrl,
            supabase_thumb_path: driveThumbUrl,
          })
          .eq('id', photo.id);

        // Deletar o arquivo do Supabase Storage bucket para liberar espaço
        if (fileUrl.includes('/storage/v1/object/public/gallery-assets/')) {
          const storageRelativePath = fileUrl.split('/storage/v1/object/public/gallery-assets/')[1];
          if (storageRelativePath) {
            await supabase.storage.from('gallery-assets').remove([storageRelativePath]);
          }
        }

        transferredCount++;
        freedBytes += blob.size;
      } catch (err) {
        console.error(`Erro ao transferir foto ${photo.file_name} para o Google Drive:`, err);
      }
    }

    return { transferredCount, freedBytes };
  }

  /**
   * Auto-detecta fotos que estão no Supabase Storage (por falha temporária no plugin)
   * e as transfere automaticamente para o Google Drive em background, liberando o armazenamento.
   */
  static async autoSyncPendingPhotosToDrive(userId: string, googleAccessToken: string): Promise<number> {
    try {
      if (!userId || !googleAccessToken) return 0;

      // Buscar galerias do usuário
      const { data: userGalleries } = await supabase
        .from('galleries')
        .select('*')
        .eq('user_id', userId);

      if (!userGalleries || userGalleries.length === 0) return 0;

      const galleryIds = userGalleries.map((g) => g.id);

      // Buscar fotos da galeria armazenadas no Supabase Storage
      const { data: pendingPhotos } = await supabase
        .from('gallery_photos')
        .select('id, gallery_id, supabase_web_path, supabase_thumb_path, google_drive_file_id')
        .in('gallery_id', galleryIds);

      if (!pendingPhotos) return 0;

      const photosToOffload = pendingPhotos.filter((p) => {
        const isSupabase = p.supabase_web_path?.includes('supabase.co/storage') || p.supabase_thumb_path?.includes('supabase.co/storage');
        return isSupabase || !p.google_drive_file_id || p.google_drive_file_id === 'LOCAL_ONLY';
      });

      if (photosToOffload.length === 0) return 0;

      console.log(`[Auto-Sync] 🚀 Encontradas ${photosToOffload.length} fotos no Supabase Storage. Transferindo automaticamente para Google Drive...`);

      let totalTransferred = 0;
      for (const gallery of userGalleries) {
        const hasPhotos = photosToOffload.some((p) => p.gallery_id === gallery.id);
        if (hasPhotos) {
          const res = await this.offloadGalleryPhotosToDrive(gallery, googleAccessToken);
          totalTransferred += res.transferredCount;
        }
      }

      return totalTransferred;
    } catch (err) {
      console.warn('[Auto-Sync] Erro ao sincronizar fotos no background:', err);
      return 0;
    }
  }

  /**
   * Registra ou atualiza o acesso de um visitante na galeria e cria/associa um Lead automaticamente no PriceU$
   */
  static async registerVisitor(
    galleryId: string,
    name: string,
    email?: string | null,
    whatsapp?: string | null
  ): Promise<GalleryVisitor | null> {
    try {
      if (!name || !name.trim()) return null;
      const cleanName = name.trim();
      const cleanEmail = email?.trim() || null;
      const cleanPhone = whatsapp?.trim() || null;

      // 1. Buscar se já existe visitante com este email ou whatsapp nesta galeria
      let query = supabase
        .from('gallery_visitors')
        .select('*')
        .eq('gallery_id', galleryId);

      if (cleanEmail && cleanPhone) {
        query = query.or(`email.eq.${cleanEmail},whatsapp.eq.${cleanPhone}`);
      } else if (cleanEmail) {
        query = query.eq('email', cleanEmail);
      } else if (cleanPhone) {
        query = query.eq('whatsapp', cleanPhone);
      } else {
        query = query.eq('name', cleanName);
      }

      const { data: existing } = await query.maybeSingle();

      let visitorRecord: GalleryVisitor | null = null;

      if (existing) {
        // Atualiza acesso recente
        const { data: updated } = await supabase
          .from('gallery_visitors')
          .update({
            name: cleanName,
            email: cleanEmail || existing.email,
            whatsapp: cleanPhone || existing.whatsapp,
            last_accessed_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();
        visitorRecord = updated || existing;
      } else {
        // Insere novo visitante
        const newVisitorData = {
          gallery_id: galleryId,
          name: cleanName,
          email: cleanEmail,
          whatsapp: cleanPhone,
          accessed_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
          downloads_count: 0,
        };

        const { data: inserted, error: insErr } = await supabase
          .from('gallery_visitors')
          .insert(newVisitorData)
          .select()
          .single();

        if (insErr) {
          console.warn('[GalleryService] AVISO ao inserir visitante com .select():', insErr.message);
          // Fallback sem .select() caso RLS limite a leitura imediata
          await supabase.from('gallery_visitors').insert(newVisitorData);
        }
        visitorRecord = inserted;
      }

      // 2. AUTO-CRIAR/ATUALIZAR LEAD NO PRICEUS CRM
      try {
        const { data: gal } = await supabase
          .from('galleries')
          .select('id, user_id, title')
          .eq('id', galleryId)
          .single();

        if (gal && gal.user_id && (cleanEmail || cleanPhone)) {
          let leadQuery = supabase
            .from('leads')
            .select('id')
            .eq('user_id', gal.user_id);

          if (cleanEmail && cleanPhone) {
            leadQuery = leadQuery.or(`email.eq.${cleanEmail},telefone.eq.${cleanPhone}`);
          } else if (cleanEmail) {
            leadQuery = leadQuery.eq('email', cleanEmail);
          } else {
            leadQuery = leadQuery.eq('telefone', cleanPhone);
          }

          const { data: existingLead } = await leadQuery.maybeSingle();

          let leadId = existingLead?.id;

          if (!leadId) {
            const { data: newLead } = await supabase
              .from('leads')
              .insert({
                user_id: gal.user_id,
                nome: cleanName,
                email: cleanEmail || undefined,
                telefone: cleanPhone || undefined,
                origem: `Galeria: ${gal.title}`,
                status: 'novo',
                notas: `Contato capturado via acesso à Galeria Online "${gal.title}".`,
              })
              .select('id')
              .single();

            leadId = newLead?.id;
          }

          if (leadId && visitorRecord?.id) {
            await supabase
              .from('gallery_visitors')
              .update({ lead_id: leadId })
              .eq('id', visitorRecord.id);
          }
        }
      } catch (leadErr) {
        console.warn('Aviso: erro ao vincular Lead do PriceU$:', leadErr);
      }

      return visitorRecord;
    } catch (err) {
      console.error('Erro em registerVisitor:', err);
      return null;
    }
  }

  /**
   * Incrementar a quantidade de fotos baixadas por um visitante
   */
  static async incrementVisitorDownloads(visitorId: string, count: number = 1): Promise<void> {
    try {
      const { data: visitor } = await supabase
        .from('gallery_visitors')
        .select('downloads_count')
        .eq('id', visitorId)
        .single();

      const current = visitor?.downloads_count || 0;
      await supabase
        .from('gallery_visitors')
        .update({
          downloads_count: current + count,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', visitorId);
    } catch (err) {
      console.warn('Erro ao atualizar downloads do visitante:', err);
    }
  }

  /**
   * Buscar todos os visitantes de uma galeria com estatísticas
   */
  static async getGalleryVisitors(galleryId: string): Promise<GalleryVisitor[]> {
    const { data, error } = await supabase
      .from('gallery_visitors')
      .select('*')
      .eq('gallery_id', galleryId)
      .order('accessed_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar visitantes:', error);
      return [];
    }
    return data || [];
  }

  /**
   * Buscar todos os pedidos de fotos de uma galeria
   */
  static async getGalleryOrders(galleryId: string): Promise<GalleryOrder[]> {
    try {
      const { data, error } = await supabase
        .from('gallery_orders')
        .select('*')
        .eq('gallery_id', galleryId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[GalleryService] Tabela gallery_orders não instalada ou indisponível:', error.message);
        return [];
      }
      return data || [];
    } catch (e: any) {
      console.warn('[GalleryService] Erro ao buscar pedidos (tabela gallery_orders pode não existir ainda):', e?.message || e);
      return [];
    }
  }

  /**
   * Registrar pedido de compra de fotos extras
   */
  static async recordGalleryOrder(orderData: {
    gallery_id: string;
    visitor_id?: string | null;
    buyer_name: string;
    buyer_email?: string | null;
    buyer_whatsapp?: string | null;
    photo_count: number;
    total_price: number;
    payment_method?: string;
  }): Promise<GalleryOrder | null> {
    try {
      const { data, error } = await supabase
        .from('gallery_orders')
        .insert({
          gallery_id: orderData.gallery_id,
          visitor_id: orderData.visitor_id || null,
          buyer_name: orderData.buyer_name,
          buyer_email: orderData.buyer_email || null,
          buyer_whatsapp: orderData.buyer_whatsapp || null,
          photo_count: orderData.photo_count,
          total_price: orderData.total_price,
          payment_status: 'paid',
          payment_method: orderData.payment_method || 'pix',
        })
        .select()
        .single();

      if (error) {
        console.warn('[GalleryService] Erro ao registrar pedido:', error.message);
        return null;
      }

      // Auto-registrar no Caixa Financeiro (company_transactions) como receita de venda extra
      try {
        const gallery = await this.getGalleryById(orderData.gallery_id);
        if (gallery && gallery.user_id) {
          const today = new Date().toISOString().split('T')[0];
          await supabase.from('company_transactions').insert({
            user_id: gallery.user_id,
            tipo: 'receita',
            origem: 'galeria',
            descricao: `Venda de ${orderData.photo_count} foto(s) extra(s) - Galeria: ${gallery.title}`,
            valor: orderData.total_price,
            data: today,
            status: 'pago',
            forma_pagamento: orderData.payment_method || 'pix',
            cliente_nome: orderData.buyer_name,
            cliente_telefone: orderData.buyer_whatsapp || null,
          });
          console.log('✅ Receita da venda de fotos extras registrada no Caixa Financeiro (company_transactions)');
        }
      } catch (finErr) {
        console.warn('Aviso: Falha ao inserir receita no caixa financeiro:', finErr);
      }

      return data;
    } catch (e: any) {
      console.warn('[GalleryService] Erro ao registrar pedido em gallery_orders:', e?.message || e);
      return null;
    }
  }

  /**
   * Buscar todos os visitantes de TODAS as galerias do fotógrafo (para autocomplete no Lead manual)
   */
  static async getAllGalleryVisitorsForUser(userId: string): Promise<GalleryVisitor[]> {
    try {
      const { data: userGalleries } = await supabase
        .from('galleries')
        .select('id, title')
        .eq('user_id', userId);

      if (!userGalleries || userGalleries.length === 0) return [];

      const galleryMap = new Map(userGalleries.map((g) => [g.id, g.title]));
      const galleryIds = Array.from(galleryMap.keys());

      const { data: visitors } = await supabase
        .from('gallery_visitors')
        .select('*')
        .in('gallery_id', galleryIds)
        .order('accessed_at', { ascending: false });

      if (!visitors) return [];

      return visitors.map((v) => ({
        ...v,
        gallery_title: galleryMap.get(v.gallery_id) || 'Galeria sem título',
      }));
    } catch (err) {
      console.error('Erro ao buscar visitantes para sugestão de leads:', err);
      return [];
    }
  }
}
