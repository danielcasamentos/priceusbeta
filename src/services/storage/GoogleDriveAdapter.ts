import { StorageAdapter } from './StorageAdapter';
import { supabase } from '../../lib/supabase';

export class GoogleDriveAdapter implements StorageAdapter {
  providerName: 'google_drive' = 'google_drive';
  private accessToken: string;
  private isRefreshing: Promise<string | null> | null = null;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private get headers(): Record<string, string> {
    const token = localStorage.getItem('priceus_google_drive_token') || this.accessToken;
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async refreshAccessToken(): Promise<string | null> {
    if (this.isRefreshing) return this.isRefreshing;

    this.isRefreshing = (async () => {
      try {
        console.log('[GoogleDriveAdapter] Tentando renovar access_token do Google...');
        // 1. Tentar sincronizar via Edge Function google-calendar-sync (renova token via refresh_token)
        const { error: invokeErr } = await supabase.functions.invoke('google-calendar-sync', { body: {} });
        if (!invokeErr) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('google_auth_data')
              .eq('id', user.id)
              .maybeSingle();

            const newToken = profile?.google_auth_data?.access_token;
            if (newToken && newToken !== this.accessToken) {
              console.log('[GoogleDriveAdapter] ✅ Token renovado com sucesso!');
              this.accessToken = newToken;
              localStorage.setItem('priceus_google_drive_token', newToken);
              return newToken;
            }
          }
        }

        // 2. Verificar se a sessão do Supabase tem um novo provider_token
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.provider_token && sessionData.session.provider_token !== this.accessToken) {
          const newToken = sessionData.session.provider_token;
          this.accessToken = newToken;
          localStorage.setItem('priceus_google_drive_token', newToken);
          return newToken;
        }

        return null;
      } catch (err) {
        console.warn('[GoogleDriveAdapter] Falha ao renovar token automaticamente:', err);
        return null;
      } finally {
        this.isRefreshing = null;
      }
    })();

    return this.isRefreshing;
  }

  async ensureGalleryFolder(galleryTitle: string, existingFolderId?: string | null): Promise<string | null> {
    if (existingFolderId) return existingFolderId;

    try {
      // 1. Procurar diretamente se existe uma pasta com o nome exato da galeria em qualquer lugar do Drive
      const galleryFolderName = galleryTitle.replace(/[^\w\s-]/gi, '_');
      const searchExactQuery = encodeURIComponent(
        `mimeType = 'application/vnd.google-apps.folder' and (name = '${galleryTitle}' or name = '${galleryFolderName}') and trashed = false`
      );
      let searchResp = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${searchExactQuery}&fields=files(id,name,parents)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
        { headers: this.headers }
      );

      if (searchResp.status === 401) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          searchResp = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${searchExactQuery}&fields=files(id,name,parents)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
            { headers: this.headers }
          );
        }
      }

      if (searchResp.ok) {
        const searchData = await searchResp.json();
        if (searchData.files && searchData.files.length > 0) {
          // Se tiver múltiplos, dar preferência ao que não se chama PriceUS_Galerias
          const match = searchData.files.find((f: any) => f.name.toLowerCase() !== 'priceus_galerias') || searchData.files[0];
          console.log(`[GoogleDriveAdapter] 🎯 Pasta da galeria encontrada no Drive: "${match.name}" (ID: ${match.id})`);
          return match.id;
        }
      }

      // 2. Se não encontrou, verificar ou criar a pasta raiz 'PriceUS_Galerias'
      const rootSearchQuery = encodeURIComponent("name = 'PriceUS_Galerias' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
      let rootResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${rootSearchQuery}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
        { headers: this.headers }
      );

      let rootFolderId: string;
      const rootData = await rootResponse.json();

      if (rootData.files && rootData.files.length > 0) {
        rootFolderId = rootData.files[0].id;

        // Verificar se dentro de PriceUS_Galerias existe a pasta da galeria
        const childQuery = encodeURIComponent(
          `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and (name = '${galleryTitle}' or name = '${galleryFolderName}') and trashed = false`
        );
        const childResp = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${childQuery}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
          { headers: this.headers }
        );
        if (childResp.ok) {
          const childData = await childResp.json();
          if (childData.files && childData.files.length > 0) {
            console.log(`[GoogleDriveAdapter] 🎯 Subpasta encontrada dentro de PriceUS_Galerias: "${childData.files[0].name}" (ID: ${childData.files[0].id})`);
            return childData.files[0].id;
          }
        }
      } else {
        // Criar pasta raiz PriceUS_Galerias
        const createRootResp = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
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

      // 3. Criar subpasta para a galeria específica dentro de PriceUS_Galerias
      const createGalleryFolderResp = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
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
      console.log(`[GoogleDriveAdapter] 📁 Nova subpasta criada para "${galleryTitle}":`, galleryFolderData.id);
      return galleryFolderData.id || null;
    } catch (err) {
      console.error('[GoogleDriveAdapter] Erro ao buscar/criar pasta no Drive:', err);
      return null;
    }
  }

  async uploadOriginal(
    file: File,
    folderId: string,
    onProgress?: (percent: number) => void,
    isRetry: boolean = false
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
      const token = localStorage.getItem('priceus_google_drive_token') || this.accessToken;
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

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
          try {
            const res = JSON.parse(xhr.responseText);
            // Permissão pública de leitura para download da foto
            try {
              await fetch(`https://www.googleapis.com/drive/v3/files/${res.id}/permissions`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
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
          } catch (e) {
            reject(new Error('Erro ao processar resposta do Google Drive'));
          }
        } else if (xhr.status === 401 && !isRetry) {
          console.warn('[GoogleDriveAdapter] 401 Unauthorized recebido. Tentando renovar token e reenviar...');
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            try {
              const retryRes = await this.uploadOriginal(file, folderId, onProgress, true);
              resolve(retryRes);
            } catch (retryErr) {
              reject(retryErr);
            }
          } else {
            reject(new Error('Token do Google Drive expirado. Reconecte seu Google Drive nas configurações.'));
          }
        } else {
          reject(new Error(`Drive Upload Error: ${xhr.statusText || 'Erro desconhecido'} (${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error('Erro de conexão de rede ao enviar para o Google Drive'));
      xhr.send(formData);
    });
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  async makeFolderPublic(folderId: string): Promise<boolean> {
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions?supportsAllDrives=true`, {
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
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Garante em lote assíncrono que as fotos no Google Drive tenham permissão de visualização no CDN
   */
  async makeFilesPublicBatch(fileIds: string[]): Promise<void> {
    if (!fileIds || fileIds.length === 0) return;
    const CHUNK = 25;
    const token = localStorage.getItem('priceus_google_drive_token') || this.accessToken;

    for (let i = 0; i < fileIds.length; i += CHUNK) {
      const chunk = fileIds.slice(i, i + CHUNK);
      await Promise.allSettled(
        chunk.map((id) =>
          fetch(`https://www.googleapis.com/drive/v3/files/${id}/permissions?supportsAllDrives=true`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              role: 'reader',
              type: 'anyone',
            }),
          })
        )
      );
    }
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

  /**
   * Lista todos os arquivos de imagem de uma pasta do Google Drive (e subpastas) com paginação completa e dados de captura
   */
  async listFilesInFolder(folderId: string): Promise<Array<{ id: string; name: string; mimeType: string; size?: number; capturedAt?: string }>> {
    let allFiles: Array<{ id: string; name: string; mimeType: string; size?: number; capturedAt?: string; createdTime?: string; imageMediaMetadata?: { time?: string } }> = [];
    let pageToken: string | null = null;

    try {
      // 1. Buscar todos os arquivos diretos na pasta (incluindo metadados de hora da foto)
      do {
        const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
        let url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=nextPageToken,files(id,name,mimeType,size,createdTime,imageMediaMetadata)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true`;
        if (pageToken) url += `&pageToken=${pageToken}`;

        let resp = await fetch(url, { headers: this.headers });
        if (resp.status === 401) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            resp = await fetch(url, { headers: this.headers });
          }
        }

        if (!resp.ok) {
          if (resp.status === 401) {
            console.warn('[GoogleDriveAdapter] ⚠️ Token do Google Drive expirado. Reconecte o Google Drive nas configurações para sincronizar novos arquivos.');
          } else {
            const errText = await resp.text();
            console.warn('[GoogleDriveAdapter] Erro na requisição Drive API:', resp.status, errText);
          }
          break;
        }

        const data = await resp.json();
        if (data.files && Array.isArray(data.files)) {
          console.log(`[GoogleDriveAdapter] ${data.files.length} itens encontrados na pasta ${folderId} (Página)`);
          allFiles = allFiles.concat(data.files);
        }
        pageToken = data.nextPageToken || null;
      } while (pageToken);

      // 2. Buscar fotos que possam estar em subpastas da galeria (ex: Lightroom abas/coleções)
      const subfolders = allFiles.filter((f) => f.mimeType === 'application/vnd.google-apps.folder');
      for (const subfolder of subfolders) {
        let subPageToken: string | null = null;
        do {
          const q = encodeURIComponent(`'${subfolder.id}' in parents and trashed = false`);
          let subFileUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=nextPageToken,files(id,name,mimeType,size,createdTime,imageMediaMetadata)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true`;
          if (subPageToken) subFileUrl += `&pageToken=${subPageToken}`;

          const sResp = await fetch(subFileUrl, { headers: this.headers });
          if (sResp.ok) {
            const sData = await sResp.json();
            if (sData.files && Array.isArray(sData.files)) {
              console.log(`[GoogleDriveAdapter] ${sData.files.length} itens encontrados na subpasta "${subfolder.name}" (${subfolder.id})`);
              allFiles = allFiles.concat(sData.files);
            }
            subPageToken = sData.nextPageToken || null;
          } else {
            break;
          }
        } while (subPageToken);
      }
    } catch (err) {
      console.error('[GoogleDriveAdapter] Erro ao listar arquivos da pasta:', err);
    }

    // Filtrar apenas arquivos de imagem (não pastas) e normalizar data de captura
    const filteredImages = allFiles
      .filter((f) => {
        if (f.mimeType === 'application/vnd.google-apps.folder') return false;
        const isImgMime = f.mimeType && (f.mimeType.startsWith('image/') || f.mimeType === 'application/octet-stream');
        const isImgExt = /\.(jpg|jpeg|png|webp|heic|raw|cr2|nef|arw|dng)$/i.test(f.name);
        return isImgMime || isImgExt;
      })
      .map((f) => {
        let capturedAt: string | undefined = undefined;
        if (f.imageMediaMetadata?.time) {
          // Converte formato EXIF "YYYY:MM:DD HH:MM:SS" para ISO
          capturedAt = f.imageMediaMetadata.time.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
        } else if (f.createdTime) {
          capturedAt = f.createdTime;
        }

        return {
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          size: f.size,
          capturedAt,
        };
      });

    console.log(`[GoogleDriveAdapter] Total de fotos válidas extraídas do Google Drive: ${filteredImages.length}`);
    return filteredImages;
  }
}
