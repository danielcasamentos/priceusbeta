/**
 * High-Performance IndexedDB Storage Engine for PriceU$ Culling
 * Permite salvar milhares de micro-miniaturas (15KB) no SSD do computador
 * sem gastar memória RAM, com purge automático ao excluir/publicar.
 */

import { platformAdapter } from './platformAdapter';

const DB_NAME = 'PriceUS_Culling_SSD_Store';
const DB_VERSION = 1;
const STORE_THUMBNAILS = 'micro_thumbnails';
const STORE_METADATA = 'project_metadata';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste ambiente'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_THUMBNAILS)) {
        db.createObjectStore(STORE_THUMBNAILS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA, { keyPath: 'projectId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Salva a micro-miniatura de uma foto no SSD
 */
export async function saveThumbnailToSSD(projectId: string, photoId: string, dataUrlOrBlob: string | Blob): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_THUMBNAILS, 'readwrite');
    const store = tx.objectStore(STORE_THUMBNAILS);
    const key = `${projectId}_${photoId}`;
    store.put({ key, projectId, photoId, data: dataUrlOrBlob, updatedAt: Date.now() });
    platformAdapter.addLog('info', 'STORAGE', `[IndexedDB SSD] Micro-miniatura salva para foto ${photoId} no projeto ${projectId}`);
  } catch (err) {
    console.warn('[IndexedDB Storage] Erro ao salvar miniatura no SSD:', err);
  }
}

/**
 * Recupera a micro-miniatura de uma foto no SSD
 */
export async function getThumbnailFromSSD(projectId: string, photoId: string): Promise<string | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_THUMBNAILS, 'readonly');
    const store = tx.objectStore(STORE_THUMBNAILS);
    const key = `${projectId}_${photoId}`;

    return new Promise((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result && request.result.data) {
          const item = request.result.data;
          if (typeof item === 'string') {
            // Rejeita blob URLs guardados em sessões anteriores (morrem ao reiniciar)
            if (item.startsWith('data:') || item.startsWith('http')) {
              resolve(item);
            } else {
              resolve(null);
            }
          } else if (item instanceof Blob) {
            // Converte Blob para data URL permanente (blob URLs morrem ao reiniciar o app)
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(item);
          } else {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('[IndexedDB Storage] Erro ao buscar miniatura no SSD:', err);
    return null;
  }
}

/**
 * PURGE COMPLETO DE MEMÓRIA E SSD (Zero-RAW Protocol)
 * Apaga 100% das miniaturas de um projeto do SSD e libera a memória RAM
 * quando o projeto é publicado na galeria online ou excluído pelo fotógrafo.
 */
export async function purgeProjectStorage(projectId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_THUMBNAILS, STORE_METADATA], 'readwrite');
    const storeThumbnails = tx.objectStore(STORE_THUMBNAILS);
    const storeMetadata = tx.objectStore(STORE_METADATA);

    // Deletar metadados do projeto
    storeMetadata.delete(projectId);

    // Deletar todas as miniaturas com o prefixo do projectId
    const indexRequest = storeThumbnails.openCursor();
    indexRequest.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        if (cursor.value.projectId === projectId) {
          cursor.delete();
        }
        cursor.continue();
      }
    };

    console.log(`[IndexedDB Storage] 🧹 Purge executado com sucesso para o projeto ${projectId}. Memória e SSD liberados!`);
    platformAdapter.addLog('info', 'STORAGE', `[IndexedDB Storage] 🧹 Purge executado com sucesso para o projeto ${projectId}. Memória e SSD liberados!`);
  } catch (err) {
    console.warn('[IndexedDB Storage] Erro ao purgar armazenamento do projeto:', err);
  }
}

/**
 * Retorna estimativa em tempo real do uso do armazenamento do navegador (IndexedDB SSD)
 */
export async function getStorageEstimate(): Promise<{ usedMB: number; quotaGB: number; percentUsed: number }> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      const usedMB = Math.round(usage / (1024 * 1024));
      const quotaGB = Math.round((quota / (1024 * 1024 * 1024)) * 10) / 10;
      const percentUsed = quota > 0 ? Math.round((usage / quota) * 100) : 0;
      return { usedMB, quotaGB, percentUsed };
    }
  } catch {}
  return { usedMB: 0, quotaGB: 50, percentUsed: 0 };
}

/**
 * Purga apenas as miniaturas SSD pesadas de um projeto específico (mantém metadados de seleção intactos)
 */
export async function purgeProjectThumbnailsOnly(projectId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_THUMBNAILS, 'readwrite');
    const storeThumbnails = tx.objectStore(STORE_THUMBNAILS);

    const indexRequest = storeThumbnails.openCursor();
    indexRequest.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        if (cursor.value.projectId === projectId) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  } catch (err) {
    console.warn('[IndexedDB Storage] Erro ao purgar miniaturas do projeto:', err);
  }
}

/**
 * AUTO-PURGE INTELIGENTE DE CACHE
 * Verifica o espaço do navegador. Se o uso ultrapassar 400MB, expurga automaticamente
 * as miniaturas dos projetos mais antigos mantendo os metadados intactos para liberar espaço.
 */
export async function autoPurgeOldestProjects(activeProjectId: string, projectIdsOrder: string[]): Promise<number> {
  try {
    const estimate = await getStorageEstimate();
    // Se o uso ultrapassar 400MB, purga miniaturas dos projetos mais antigos
    if (estimate.usedMB > 400) {
      const inactiveProjectIds = projectIdsOrder.filter((id) => id !== activeProjectId);
      let purgedCount = 0;

      for (const oldId of inactiveProjectIds) {
        await purgeProjectThumbnailsOnly(oldId);
        purgedCount++;
        const currentEst = await getStorageEstimate();
        if (currentEst.usedMB < 250) break; // Para assim que o espaço livre for garantido
      }
      return purgedCount;
    }
  } catch (err) {
    console.warn('[IndexedDB Storage] Erro no auto-purge inteligente:', err);
  }
  return 0;
}

/**
 * Salva a lista inteira de projetos de culling no IndexedDB (sem limite de 5MB do localStorage)
 */
export async function saveProjectsToIndexedDB(userId: string, projectsData: any[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_METADATA, 'readwrite');
    const store = tx.objectStore(STORE_METADATA);
    const key = `user_projects_${userId || 'default'}`;
    store.put({ projectId: key, data: projectsData, updatedAt: Date.now() });
  } catch (err) {
    console.warn('[IndexedDB Storage] Erro ao salvar projetos no SSD:', err);
  }
}

/**
 * Carrega a lista inteira de projetos de culling do IndexedDB
 */
export async function getProjectsFromIndexedDB(userId: string): Promise<any[] | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_METADATA, 'readonly');
    const store = tx.objectStore(STORE_METADATA);
    const key = `user_projects_${userId || 'default'}`;

    return new Promise((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result && request.result.data) {
          resolve(request.result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('[IndexedDB Storage] Erro ao carregar projetos do SSD:', err);
    return null;
  }
}
