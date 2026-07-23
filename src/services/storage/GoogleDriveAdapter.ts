import { StorageAdapter } from './StorageAdapter';

export class GoogleDriveAdapter implements StorageAdapter {
  providerName: 'google_drive' = 'google_drive';
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  async ensureGalleryFolder(galleryTitle: string, existingFolderId?: string | null): Promise<string | null> {
    if (existingFolderId) return existingFolderId;

    try {
      // 1. Verificar se a pasta raiz 'PriceUS_Galerias' existe
      const rootSearchQuery = encodeURIComponent("name = 'PriceUS_Galerias' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
      const rootResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${rootSearchQuery}&fields=files(id,name)`,
        { headers: this.headers }
      );

      let rootFolderId: string;
      const rootData = await rootResponse.json();

      if (rootData.files && rootData.files.length > 0) {
        rootFolderId = rootData.files[0].id;
      } else {
        // Criar pasta raiz PriceUS_Galerias
        const createRootResp = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            ...this.headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'PriceUS_Galerias',
            mimeType: 'application/vnd.google-apps.folder',
          }),
        });
        const createdRoot = await createRootResp.json();
        rootFolderId = createdRoot.id;
      }

      // 2. Criar subpasta para a galeria específica dentro de PriceUS_Galerias
      const galleryFolderName = galleryTitle.replace(/[^\w\s-]/gi, '_');
      const createGalleryFolderResp = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: galleryFolderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [rootFolderId],
        }),
      });

      const galleryFolderData = await createGalleryFolderResp.json();
      return galleryFolderData.id || null;
    } catch (err) {
      console.error('[GoogleDriveAdapter] Erro ao criar pasta no Drive:', err);
      return null;
    }
  }

  async uploadOriginal(
    file: File,
    folderId: string,
    onProgress?: (percent: number) => void
  ): Promise<{ fileId: string; downloadUrl?: string }> {
    const metadata = {
      name: file.name,
      parents: folderId ? [folderId] : [],
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webContentLink,webViewLink');
      xhr.setRequestHeader('Authorization', `Bearer ${this.accessToken}`);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const res = JSON.parse(xhr.responseText);
          // Permissão pública de leitura para download da foto
          try {
            await fetch(`https://www.googleapis.com/drive/v3/files/${res.id}/permissions`, {
              method: 'POST',
              headers: {
                ...this.headers,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                role: 'reader',
                type: 'anyone',
              }),
            });
          } catch (e) {
            console.warn('[GoogleDriveAdapter] Erro ao definir permissão pública do arquivo:', e);
          }

          const downloadUrl = `https://drive.google.com/uc?export=download&id=${res.id}`;
          resolve({ fileId: res.id, downloadUrl });
        } else {
          reject(new Error(`Drive Upload Error: ${xhr.statusText} (${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error uploading to Google Drive'));
      xhr.send(formData);
    });
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: this.headers,
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
