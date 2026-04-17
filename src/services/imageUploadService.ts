/**
 * 🖼️ IMAGE UPLOAD SERVICE
 *
 * Serviço robusto e completo para gerenciamento de upload de imagens
 * com validação, compressão, retry logic e monitoramento
 */

import { supabase } from '../lib/supabase';

// ==========================================
// INTERFACES E TIPOS
// ==========================================

export interface UploadOptions {
  maxSizeMB?: number;
  maxWidthPx?: number;
  maxHeightPx?: number;
  quality?: number;
  allowedFormats?: string[];
  generateThumbnail?: boolean;
  folder?: string;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  thumbnailUrl?: string;
  error?: string;
  metadata?: ImageMetadata;
}

export interface ImageMetadata {
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  format: string;
  compressionRatio: number;
}

export interface UploadProgress {
  phase: 'validating' | 'compressing' | 'uploading' | 'complete' | 'error';
  percent: number;
  message: string;
}

// ==========================================
// CONFIGURAÇÕES PADRÃO
// ==========================================

const DEFAULT_OPTIONS: Required<UploadOptions> = {
  maxSizeMB: 1,           // 💡 Limite conservador: 1MB por imagem
  maxWidthPx: 1280,       // 💡 Resolução suficiente para web (antes era 1920)
  maxHeightPx: 1280,
  quality: 0.80,          // 💡 Boa qualidade visual com boa compressão
  allowedFormats: ['image/jpeg', 'image/png'], // 💡 Só JPEG e PNG — força conversão para WebP
  generateThumbnail: false,
  folder: 'uploads',
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ==========================================
// CLASSE PRINCIPAL
// ==========================================

export class ImageUploadService {
  private onProgress?: (progress: UploadProgress) => void;

  constructor(onProgress?: (progress: UploadProgress) => void) {
    this.onProgress = onProgress;
  }

  /**
   * Upload de imagem com todas as validações e otimizações
   */
  async uploadImage(
    file: File,
    userId: string,
    options: Partial<UploadOptions> = {}
  ): Promise<UploadResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    try {
      // FASE 1: VALIDAÇÃO
      this.updateProgress('validating', 10, 'Validando arquivo...');
      const validationError = this.validateFile(file, opts);
      if (validationError) {
        return { success: false, error: validationError };
      }

      // FASE 2: COMPRESSÃO
      this.updateProgress('compressing', 30, 'Otimizando imagem...');
      const { blob, metadata } = await this.compressImage(file, opts);

      // FASE 3: UPLOAD COM RETRY
      this.updateProgress('uploading', 60, 'Enviando para servidor...');
      const uploadResult = await this.uploadWithRetry(
        blob,
        userId,
        file.name,
        opts,
        metadata
      );

      if (!uploadResult.success) {
        return uploadResult;
      }

      // FASE 4: GERAR THUMBNAIL (OPCIONAL)
      let thumbnailUrl: string | undefined;
      if (opts.generateThumbnail) {
        this.updateProgress('uploading', 90, 'Gerando miniatura...');
        const thumbResult = await this.generateThumbnail(blob, userId, file.name, opts);
        thumbnailUrl = thumbResult.url;
      }

      // FASE 5: COMPLETO
      this.updateProgress('complete', 100, 'Upload concluído!');

      return {
        success: true,
        url: uploadResult.url,
        thumbnailUrl,
        metadata,
      };
    } catch (error) {
      console.error('❌ Erro no upload:', error);
      this.updateProgress('error', 0, 'Erro ao fazer upload');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Validação do arquivo
   */
  private validateFile(file: File, opts: Required<UploadOptions>): string | null {
    // Validar formato
    if (!opts.allowedFormats.includes(file.type)) {
      return `Formato não suportado. Envie uma imagem JPEG ou PNG.`;
    }

    // Validar tamanho
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > opts.maxSizeMB) {
      return `Imagem muito grande (${fileSizeMB.toFixed(1)}MB). Limite: ${opts.maxSizeMB}MB. Reduza o tamanho antes de enviar.`;
    }

    // Validar nome do arquivo
    if (!file.name || file.name.length > 255) {
      return 'Nome do arquivo inválido';
    }

    return null;
  }

  /**
   * Compressão de imagem com Canvas API
   */
  private async compressImage(
    file: File,
    opts: Required<UploadOptions>
  ): Promise<{ blob: Blob; metadata: ImageMetadata }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        try {
          // Calcular dimensões mantendo aspect ratio
          let { width, height } = img;
          const aspectRatio = width / height;

          if (width > opts.maxWidthPx) {
            width = opts.maxWidthPx;
            height = width / aspectRatio;
          }

          if (height > opts.maxHeightPx) {
            height = opts.maxHeightPx;
            width = height * aspectRatio;
          }

          // Criar canvas e comprimir
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Não foi possível criar contexto do canvas'));
            return;
          }

          // Desenhar com qualidade máxima
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // 💡 Sempre converte para WebP: menor tamanho, melhor qualidade visual
          // WebP é 25-35% menor que JPEG e 60-80% menor que PNG
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Falha ao comprimir imagem'));
                return;
              }

              const metadata: ImageMetadata = {
                originalSize: file.size,
                compressedSize: blob.size,
                width,
                height,
                format: 'image/webp',
                compressionRatio: ((1 - blob.size / file.size) * 100),
              };

              resolve({ blob, metadata });
            },
            'image/webp',  // 💡 Saída sempre em WebP independente do input
            opts.quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Não foi possível carregar a imagem'));
      };

      reader.onerror = () => {
        reject(new Error('Não foi possível ler o arquivo'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Upload com retry automático em caso de falha
   */
  private async uploadWithRetry(
    blob: Blob,
    userId: string,
    originalName: string,
    opts: Required<UploadOptions>,
    metadata: ImageMetadata,
    attempt = 1
  ): Promise<UploadResult> {
    try {
      // 💡 Extensão sempre .webp (saída convertida)
      const fileExt = 'webp';
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileName = `${opts.folder}/${userId}/${timestamp}-${randomSuffix}.${fileExt}`;

      // Upload para Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, blob, {
          upsert: true,
          contentType: metadata.format,
          cacheControl: '3600',
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública limpa (sem query params)
      const { data: publicUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      // 🔥 CORREÇÃO: Retornar URL limpa sem ?v= (cache-busting feito no frontend)
      const cleanUrl = publicUrlData.publicUrl;

      return {
        success: true,
        url: cleanUrl,
        metadata,
      };
    } catch (error) {
      console.warn(`⚠️ Tentativa ${attempt} falhou:`, error);

      // Retry se não excedeu o limite
      if (attempt < MAX_RETRIES) {
        await this.sleep(RETRY_DELAY_MS * attempt);
        return this.uploadWithRetry(blob, userId, originalName, opts, metadata, attempt + 1);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro no upload após múltiplas tentativas',
      };
    }
  }

  /**
   * Gerar thumbnail da imagem
   */
  private async generateThumbnail(
    blob: Blob,
    userId: string,
    originalName: string,
    opts: Required<UploadOptions>
  ): Promise<UploadResult> {
    const THUMB_SIZE = 300;

    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const aspectRatio = img.width / img.height;

        if (img.width > img.height) {
          canvas.width = THUMB_SIZE;
          canvas.height = THUMB_SIZE / aspectRatio;
        } else {
          canvas.height = THUMB_SIZE;
          canvas.width = THUMB_SIZE * aspectRatio;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ success: false, error: 'Erro ao criar thumbnail' });
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (thumbBlob) => {
          if (!thumbBlob) {
            resolve({ success: false, error: 'Erro ao gerar thumbnail' });
            return;
          }

          const fileExt = (originalName.split('.').pop() || 'jpg').toLowerCase(); // 🔥 Normalizar
          const timestamp = Date.now();
          const thumbFileName = `${opts.folder}/${userId}/thumb_${timestamp}.${fileExt}`;

          try {
            const { error } = await supabase.storage
              .from('images')
              .upload(thumbFileName, thumbBlob, {
                upsert: true,
                cacheControl: '3600',
              });

            if (error) throw error;

            const { data } = supabase.storage
              .from('images')
              .getPublicUrl(thumbFileName);

            // 🔥 CORREÇÃO: URL limpa sem query params
            resolve({ success: true, url: data.publicUrl });
          } catch (error) {
            resolve({ success: false, error: 'Erro ao fazer upload do thumbnail' });
          }
        }, 'image/jpeg', 0.7);
      };

      reader.readAsDataURL(blob);
    });
  }

  /**
   * 🔥 Helper: Extrair caminho do objeto da URL pública do Supabase
   *
   * Extrai o caminho correto do storage a partir da publicUrl,
   * removendo query params e normalizando a estrutura.
   *
   * @param publicUrl - URL pública completa do Supabase Storage
   * @returns Caminho do objeto ou null se inválido
   *
   * @example
   * Input:  "https://xyz.supabase.co/storage/v1/object/public/images/foto.jpg?v=123"
   * Output: "images/foto.jpg"
   */
  private extractObjectPathFromPublicUrl(publicUrl: string): string | null {
    try {
      const url = new URL(publicUrl);

      // Encontrar índice do caminho do storage
      const storagePathPrefix = '/storage/v1/object/public/';
      const idx = url.pathname.indexOf(storagePathPrefix);

      if (idx === -1) {
        console.warn('❌ URL não contém caminho de storage válido:', publicUrl);
        return null;
      }

      // Extrair caminho após o prefixo
      const objectPath = url.pathname.slice(idx + storagePathPrefix.length);

      // Remover query params (já está no pathname, mas garantir)
      const cleanPath = objectPath.split('?')[0];

      if (!cleanPath || cleanPath.length === 0) {
        console.warn('❌ Caminho extraído está vazio:', publicUrl);
        return null;
      }

      return cleanPath;
    } catch (error) {
      console.error('❌ Erro ao fazer parse da URL:', error);
      return null;
    }
  }

  /**
   * 🔥 Deletar imagem do storage (CORRIGIDO)
   *
   * Remove arquivo do Supabase Storage com extração correta do caminho
   * e normalização da extensão do arquivo.
   *
   * @param imageUrl - URL pública da imagem
   * @returns true se deletou com sucesso, false caso contrário
   */
  async deleteImage(imageUrl: string): Promise<boolean> {
    try {
      // 1. Extrair caminho correto da URL
      const objectPath = this.extractObjectPathFromPublicUrl(imageUrl);

      if (!objectPath) {
        console.warn('⚠️ Não foi possível extrair caminho da URL:', imageUrl);
        return false;
      }

      // 2. Normalizar extensão do arquivo (.JPG → .jpg)
      const normalized = objectPath.replace(/\.[A-Z]+$/, (match) => match.toLowerCase());

      console.log('🗑️ Deletando arquivo:', normalized);

      // 3. Remover do storage
      const { error } = await supabase.storage
        .from('images')
        .remove([normalized]);

      if (error) {
        console.warn('⚠️ Erro ao deletar arquivo do storage:', error);
        return false;
      }

      console.log('✅ Arquivo deletado com sucesso:', normalized);
      return true;
    } catch (error) {
      console.error('❌ Erro ao processar exclusão de imagem:', error);
      return false;
    }
  }

  /**
   * Helper: Atualizar progresso
   */
  private updateProgress(phase: UploadProgress['phase'], percent: number, message: string) {
    if (this.onProgress) {
      this.onProgress({ phase, percent, message });
    }
  }

  /**
   * Helper: Sleep/delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ==========================================
// FUNÇÕES UTILITÁRIAS
// ==========================================

/**
 * Formatar tamanho de arquivo
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validar se URL é válida
 */
export function isValidImageUrl(url: string): boolean {
  try {
    new URL(url);
    return url.includes('/images/') && (
      url.endsWith('.jpg') ||
      url.endsWith('.jpeg') ||
      url.endsWith('.png') ||
      url.endsWith('.webp') ||
      url.endsWith('.gif') ||
      url.includes('.jpg?') ||
      url.includes('.jpeg?') ||
      url.includes('.png?') ||
      url.includes('.webp?') ||
      url.includes('.gif?')
    );
  } catch {
    return false;
  }
}
