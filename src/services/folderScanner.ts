export interface ScannedFileItem {
  file: File;
  relativePath: string;
  subfolderName: string;
}

/**
 * Leitor Recursivo de Pastas e Subpastas para a API WebKitFileSystem
 * Garante a leitura completa de milhares de arquivos (sem parar no limite de 100 entradas por pasta do Chrome/Safari)
 */
export async function scanDataTransferItems(
  items: DataTransferItemList,
  onProgressLog?: (msg: string) => void
): Promise<ScannedFileItem[]> {
  const fileItems: ScannedFileItem[] = [];

  async function readEntry(entry: any, pathPrefix: string) {
    if (!entry) return;

    if (entry.isFile) {
      await new Promise<void>((resolve) => {
        entry.file(
          (file: File) => {
            const relPath = pathPrefix ? `${pathPrefix}/${file.name}` : file.name;
            const parts = relPath.split('/').filter(Boolean);

            // Determinar o nome da subpasta mais relevante (ex: "01_MakingOf_Noiva")
            let subfolder = 'Fotos Gerais';
            if (parts.length >= 2) {
              subfolder = parts[parts.length - 2];
            } else if (parts.length === 1) {
              subfolder = 'Pasta Raiz';
            }

            // Somente arquivos de imagem ou RAW (Sony, Canon, Nikon, Fuji, Panasonic, Olympus, etc.)
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            const validExts = [
              'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'tif', 'tiff', 'gif', 'bmp',
              'cr2', 'cr3', 'nef', 'nrw', 'arw', 'srf', 'sr2', 'raf', 'rw2', 'raw', 'orf', 'dng', '3fr', 'iiq', 'pef', 'x3f'
            ];
            if (file.type.startsWith('image/') || validExts.includes(ext)) {
              fileItems.push({
                file,
                relativePath: relPath,
                subfolderName: subfolder,
              });
            }
            resolve();
          },
          () => resolve()
        );
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const currentPath = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;
      if (onProgressLog) {
        onProgressLog(`📂 Mapeando subpasta: "${currentPath}"...`);
      }

      let entriesBatch: any[] = [];
      do {
        entriesBatch = await new Promise<any[]>((resolve) => {
          dirReader.readEntries(
            (batch: any[]) => resolve(batch || []),
            () => resolve([])
          );
        });

        for (const child of entriesBatch) {
          await readEntry(child, currentPath);
        }
      } while (entriesBatch.length > 0); // Repete até esgotar todas as 100+ entradas de cada subpasta!
    }
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const entry = item.webkitGetAsEntry?.();
    if (entry) {
      await readEntry(entry, '');
    } else {
      const file = item.getAsFile();
      if (file) {
        fileItems.push({
          file,
          relativePath: file.name,
          subfolderName: 'Arquivos Selecionados',
        });
      }
    }
  }

  return fileItems;
}

/**
 * Escaneia uma FileList vinda do input nativo <input type="file" webkitdirectory directory />
 */
export function scanFileListWithDirectory(files: FileList | File[]): ScannedFileItem[] {
  const result: ScannedFileItem[] = [];
  const fileArray = Array.from(files);

  for (const file of fileArray) {
    const relPath = file.webkitRelativePath || file.name;
    const parts = relPath.split('/').filter(Boolean);

    let subfolder = 'Fotos Gerais';
    if (parts.length >= 3) {
      subfolder = parts[parts.length - 2];
    } else if (parts.length === 2) {
      subfolder = parts[0];
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const validExts = [
      'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'tif', 'tiff', 'gif', 'bmp',
      'cr2', 'cr3', 'nef', 'nrw', 'arw', 'srf', 'sr2', 'raf', 'rw2', 'raw', 'orf', 'dng', '3fr', 'iiq', 'pef', 'x3f'
    ];
    if (file.type.startsWith('image/') || validExts.includes(ext)) {
      result.push({
        file,
        relativePath: relPath,
        subfolderName: subfolder,
      });
    }
  }

  return result;
}
