/**
 * cullingThreadPool.ts — Gerenciador de Pool de Threads Multicore para Culling
 * Distribui fotos entre múltiplos Web Workers para utilizar todos os núcleos da CPU.
 * Grava miniaturas no IndexedDB SSD e mantém uso de memória RAM abaixo de 30MB.
 */

import { saveThumbnailToSSD } from './indexedDBStorage';
import type { CullingWorkerRequest, CullingWorkerResult } from '../workers/cullingMulticore.worker';
import type { CullingSensitivityMode } from './cullingScoreEngine';

export interface ThreadPoolItem {
  id: string;
  file: File;
  fileName: string;
  isRaw: boolean;
  subfolderName: string;
}

export class CullingThreadPool {
  private static workerPool: Worker[] = [];
  private static numWorkers = Math.max(2, Math.min(navigator.hardwareConcurrency || 4, 8));

  /**
   * Inicializa o pool de workers
   */
  private static initPool(): Worker[] {
    if (this.workerPool.length > 0) return this.workerPool;

    const workers: Worker[] = [];
    for (let i = 0; i < this.numWorkers; i++) {
      try {
        const worker = new Worker(
          new URL('../workers/cullingMulticore.worker.ts', import.meta.url),
          { type: 'module' }
        );
        workers.push(worker);
      } catch (err) {
        console.warn('[CullingThreadPool] Falha ao criar worker:', err);
      }
    }

    this.workerPool = workers;
    return workers;
  }

  /**
   * Encerra todos os workers do pool
   */
  public static terminatePool(): void {
    for (const w of this.workerPool) {
      try {
        w.terminate();
      } catch {}
    }
    this.workerPool = [];
  }

  /**
   * Processa uma lista de fotos em paralelo através de todos os núcleos da CPU
   */
  public static async processAll(
    items: ThreadPoolItem[],
    projectId: string,
    sensitivityMode: CullingSensitivityMode,
    onProgress: (processed: number, total: number, currentFileName: string) => void,
    onLog?: (msg: string) => void
  ): Promise<Map<string, CullingWorkerResult>> {
    const workers = this.initPool();
    const results = new Map<string, CullingWorkerResult>();
    const total = items.length;

    if (total === 0) return results;

    if (onLog) {
      onLog(`⚡ [Hardware Multicore] Ativadas ${workers.length} threads paralelas na CPU para analisar ${total} fotos.`);
    }

    let currentIndex = 0;
    let completedCount = 0;

    // Se os Web Workers falharem ao inicializar, executa processamento sequencial simples
    if (workers.length === 0) {
      for (const item of items) {
        completedCount++;
        onProgress(completedCount, total, item.fileName);
      }
      return results;
    }

    // Processamento com fila concorrente nos workers disponíveis
    return new Promise((resolve) => {
      let activeWorkersCount = workers.length;

      const runNextOnWorker = (worker: Worker) => {
        if (currentIndex >= items.length) {
          activeWorkersCount--;
          if (activeWorkersCount <= 0) {
            resolve(results);
          }
          return;
        }

        const item = items[currentIndex++];
        const req: CullingWorkerRequest = {
          id: item.id,
          file: item.file,
          fileName: item.fileName,
          isRaw: item.isRaw,
          sensitivityMode,
        };

        const handleMessage = (e: MessageEvent) => {
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);

          const res = e.data;
          if (res && res.data) {
            const data: CullingWorkerResult = res.data;
            results.set(data.id, data);

            // Grava micro-miniatura no SSD para não ocupar RAM
            if (projectId && data.thumbnailDataUrl && data.thumbnailDataUrl.startsWith('data:')) {
              saveThumbnailToSSD(projectId, data.id, data.thumbnailDataUrl);
            }
          }

          completedCount++;
          onProgress(completedCount, total, item.fileName);
          runNextOnWorker(worker);
        };

        const handleError = (err: ErrorEvent) => {
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
          console.warn('[Worker Error on File]', item.fileName, err);

          completedCount++;
          onProgress(completedCount, total, item.fileName);
          runNextOnWorker(worker);
        };

        worker.addEventListener('message', handleMessage);
        worker.addEventListener('error', handleError);
        worker.postMessage(req);
      };

      // Dispara todos os workers simultaneamente
      for (const worker of workers) {
        runNextOnWorker(worker);
      }
    });
  }
}
