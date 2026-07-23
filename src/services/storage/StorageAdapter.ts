/**
 * Interface StorageAdapter - Padrão Adapter para Provedores de Armazenamento de Fotos Originais
 */
export interface StorageAdapter {
  providerName: 'google_drive' | 'supabase' | 's3' | 'r2';

  /**
   * Inicializa ou garante a existência da pasta raiz/estrutura para a galeria
   */
  ensureGalleryFolder(galleryTitle: string, userFolderId?: string | null): Promise<string | null>;

  /**
   * Faz upload de um arquivo original (High-Res)
   */
  uploadOriginal(
    file: File,
    pathOrFolderId: string,
    onProgress?: (percent: number) => void
  ): Promise<{ fileId: string; downloadUrl?: string }>;

  /**
   * Retorna a URL de download em alta resolução para um arquivo
   */
  getDownloadUrl(fileId: string): Promise<string>;

  /**
   * Deleta um arquivo original do provedor
   */
  deleteFile(fileId: string): Promise<boolean>;
}
