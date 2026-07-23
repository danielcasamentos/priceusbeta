export interface ProcessedImages {
  thumbBlob: Blob;
  webBlob: Blob;
  width: number;
  height: number;
  fileSizeBytes: number;
}

/**
 * Redimensiona e comprime uma imagem usando HTML Canvas e gera formato WebP
 */
export async function processImageForGallery(
  file: File,
  watermarkText?: string | null
): Promise<ProcessedImages> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = async () => {
        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;

        try {
          // 1. Gerar Thumbnail (máx 400px, WebP, qualidade 75%, sem marca d'água)
          const thumbBlob = await resizeCanvas(img, 400, 0.75, null);

          // 2. Gerar Web Display (máx 2048px, WebP, qualidade 80%, com marca d'água opcional)
          const webBlob = await resizeCanvas(img, 2048, 0.80, watermarkText);

          resolve({
            thumbBlob,
            webBlob,
            width: originalWidth,
            height: originalHeight,
            fileSizeBytes: file.size,
          });
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${file.name}`));
    };

    reader.onerror = () => reject(new Error(`Falha ao ler arquivo: ${file.name}`));
  });
}

function resizeCanvas(
  img: HTMLImageElement,
  maxDimension: number,
  quality: number,
  watermarkText?: string | null
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    // Calcular proporções
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return reject(new Error('Não foi possível obter o contexto 2D do Canvas'));
    }

    // Desenhar a imagem suavizada
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    // Aplicar Marca d'Água se houver
    if (watermarkText && watermarkText.trim().length > 0) {
      ctx.save();
      const fontSize = Math.max(16, Math.round(width / 24));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Posicionar texto inclinado no centro da imagem
      ctx.translate(width / 2, height / 2);
      ctx.rotate(-Math.PI / 6); // Rotação de -30 graus

      ctx.strokeText(watermarkText, 0, 0);
      ctx.fillText(watermarkText, 0, 0);
      ctx.restore();
    }

    // Converter para WebP
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Erro ao gerar blob WebP do canvas'));
        }
      },
      'image/webp',
      quality
    );
  });
}

/**
 * Converte qualquer URL de imagem (ex: WebP do storage) em memória para JPEG (.jpg) em baixa resolução (máx 1920px na aresta maior, 96 DPI, qualidade 88%)
 */
export async function convertWebpToLowResJpeg(
  imageUrl: string,
  maxDimension: number = 1920,
  quality: number = 0.88
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Redimensionar mantendo proporção para no máximo 1920px na aresta maior
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Não foi possível obter o contexto 2D do Canvas'));
      }

      // Suavização em alta definição (96 DPI)
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fundo branco caso haja transparência
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Erro ao converter imagem para JPEG'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Falha ao carregar imagem para conversão em JPEG'));
  });
}

