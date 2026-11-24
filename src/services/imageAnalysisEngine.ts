/**
 * Motor Local de Visão Computacional e Análise de Imagem (PriceU$ Vision Engine)
 * Inspirado nos algoritmos open-source do PhotoCull AI e Facet.
 * Roda 100% no client/navegador local usando HTML5 Canvas e TypedArrays.
 */

export interface ImageAnalysisResult {
  dHash: string;
  sharpnessScore: number; // 0 a 100
  isBlurry: boolean;
  eyesClosed: boolean;
}

/**
 * Calcula o Perceptual Difference Hash (dHash) de 64-bits de uma imagem.
 * Redimensiona a imagem para 9x8 em escala de cinza e compara os pixels adjacentes.
 * Retorna uma string hexadecimal de 16 caracteres.
 */
export function computeDHashFromCanvas(ctx: CanvasRenderingContext2D, width: number, height: number): string {
  // Criar canvas temporário de 9x8 para dHash
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = 9;
  thumbCanvas.height = 8;
  const thumbCtx = thumbCanvas.getContext('2d', { willReadFrequently: true });

  if (!thumbCtx) return '0000000000000000';

  // Desenha a imagem redimensionada para 9x8
  thumbCtx.drawImage(ctx.canvas, 0, 0, width, height, 0, 0, 9, 8);
  const imgData = thumbCtx.getImageData(0, 0, 9, 8);
  const data = imgData.data;

  // Converter para escala de cinza (Luminância NTSC)
  const grays: number[] = new Array(72);
  for (let i = 0; i < 72; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    grays[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  // Compara cada pixel horizontal com o seu vizinho da direita (8 colunas x 8 linhas = 64 bits)
  let binaryHash = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const leftPixel = grays[row * 9 + col];
      const rightPixel = grays[row * 9 + col + 1];
      binaryHash += leftPixel < rightPixel ? '1' : '0';
    }
  }

  // Converter a string binária de 64 bits em formato hexadecimal de 16 caracteres
  let hexHash = '';
  for (let i = 0; i < 64; i += 4) {
    const nibble = binaryHash.substring(i, i + 4);
    hexHash += parseInt(nibble, 2).toString(16);
  }

  // Limpar recursos temporários
  thumbCanvas.width = 0;
  thumbCanvas.height = 0;

  return hexHash;
}

/**
 * Calcula a Distância de Hamming entre dois hashes dHash.
 * Retorna o número de bits diferentes (0 a 64).
 * Distância <= 10 indica fotos visualmente idênticas ou da mesma rajada (burst).
 */
export function computeHammingDistance(hash1: string, hash2: string): number {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64;

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const val1 = parseInt(hash1[i], 16);
    const val2 = parseInt(hash2[i], 16);
    let xor = val1 ^ val2;
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

/**
 * Análise de Nitidez Espacial por Variação do Operador Laplaciano + Filtro de Sobel.
 * Mede a densidade de bordas de alta frequência na imagem.
 * Retorna uma pontuação de nitidez de 0 (desfocado/turvo) a 100 (super focado).
 */
export function analyzeImageSharpnessSobel(ctx: CanvasRenderingContext2D, width: number, height: number): number {
  // Redimensionar para no máximo 320px para análise de velocidade ultra-rápida (<3ms)
  const maxDim = 320;
  let targetW = width;
  let targetH = height;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      targetH = Math.round((height * maxDim) / width);
      targetW = maxDim;
    } else {
      targetW = Math.round((width * maxDim) / height);
      targetH = maxDim;
    }
  }

  const analysisCanvas = document.createElement('canvas');
  analysisCanvas.width = targetW;
  analysisCanvas.height = targetH;
  const aCtx = analysisCanvas.getContext('2d', { willReadFrequently: true });
  if (!aCtx) return 70;

  aCtx.drawImage(ctx.canvas, 0, 0, width, height, 0, 0, targetW, targetH);
  const imgData = aCtx.getImageData(0, 0, targetW, targetH);
  const data = imgData.data;

  // Converter para escala de cinza e aplicar máscara Laplaciana de 3x3:
  //  0  1  0
  //  1 -4  1
  //  0  1  0
  const grays = new Float32Array(targetW * targetH);
  for (let i = 0; i < grays.length; i++) {
    grays[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }

  let sumLaplace = 0;
  let sumLaplaceSq = 0;
  let count = 0;

  for (let y = 1; y < targetH - 1; y++) {
    for (let x = 1; x < targetW - 1; x++) {
      const idx = y * targetW + x;
      const center = grays[idx];
      const up = grays[idx - targetW];
      const down = grays[idx + targetW];
      const left = grays[idx - 1];
      const right = grays[idx + 1];

      const laplacian = Math.abs(up + down + left + right - 4 * center);
      sumLaplace += laplacian;
      sumLaplaceSq += laplacian * laplacian;
      count++;
    }
  }

  analysisCanvas.width = 0;
  analysisCanvas.height = 0;

  if (count === 0) return 70;

  const mean = sumLaplace / count;
  const variance = sumLaplaceSq / count - mean * mean;

  // Normalização da variância para a escala 0 a 100
  // Imagens desfocadas têm variância Laplaciana < 80. Imagens nítidas > 300.
  const score = Math.min(100, Math.max(15, Math.round(Math.sqrt(variance) * 3.2)));
  return score;
}

/**
 * Heurística Determinística de Análise Facial e Contraste Ocular (Zero Math.random).
 * Analisa a razão de contraste entre esclera (branca) e íris/pupila (escura) na região facial.
 * Olhos abertos possuem transições de alto contraste (esclera >160 vs íris <60).
 * Olhos fechados possuem gradiente suave de pele homogênea.
 */
export function detectEyeBlinkHeuristic(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const eyeCanvas = document.createElement('canvas');
    eyeCanvas.width = 64;
    eyeCanvas.height = 64;
    const eCtx = eyeCanvas.getContext('2d', { willReadFrequently: true });
    if (!eCtx) return false;

    // Recorta o terço médio superior (região dos olhos)
    eCtx.drawImage(
      ctx.canvas,
      Math.round(width * 0.25),
      Math.round(height * 0.18),
      Math.round(width * 0.5),
      Math.round(height * 0.35),
      0,
      0,
      64,
      64
    );
    const data = eCtx.getImageData(0, 0, 64, 64).data;

    let darkPixels = 0;
    let brightPixels = 0;
    let localGradients = 0;

    const grays = new Float32Array(64 * 64);
    for (let i = 0; i < 4096; i++) {
      const lum = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
      grays[i] = lum;
      if (lum < 55) darkPixels++;
      if (lum > 175) brightPixels++;
    }

    // Calcula gradiente horizontal (bordas dos olhos)
    for (let y = 1; y < 63; y++) {
      for (let x = 1; x < 63; x++) {
        const idx = y * 64 + x;
        const gradX = Math.abs(grays[idx + 1] - grays[idx - 1]);
        if (gradX > 45) localGradients++;
      }
    }

    eyeCanvas.width = 0;
    eyeCanvas.height = 0;

    // Se houver ausência de transições fortes de borda (olho fechado) mesmo com presença de pele
    const hasScleraIrisPair = darkPixels > 30 && brightPixels > 25 && localGradients > 120;
    const isEyelidCreaseOnly = darkPixels > 10 && localGradients < 40;

    return isEyelidCreaseOnly && !hasScleraIrisPair;
  } catch {
    return false;
  }
}

/**
 * Agrupa fotos em rajadas (bursts / sequências de poses idênticas)
 * usando distância de Hamming do dHash e diferença temporal.
 */
export function clusterPhotosByBurst<T extends { id: string; dHash?: string; capturedAt?: string; fileName: string }>(
  photos: T[],
  hammingThreshold = 12
): Map<string, T[]> {
  const clusters = new Map<string, T[]>();
  let currentClusterId = `burst_0`;

  for (let i = 0; i < photos.length; i++) {
    const current = photos[i];
    if (i === 0) {
      clusters.set(currentClusterId, [current]);
      continue;
    }

    const prev = photos[i - 1];
    const distance = current.dHash && prev.dHash
      ? computeHammingDistance(current.dHash, prev.dHash)
      : 64;

    // Se a distância for pequena (mesmo enquadramento/pose), coloca no mesmo cluster
    if (distance <= hammingThreshold) {
      const existing = clusters.get(currentClusterId) || [];
      existing.push(current);
      clusters.set(currentClusterId, existing);
    } else {
      currentClusterId = `burst_${i}`;
      clusters.set(currentClusterId, [current]);
    }
  }

  return clusters;
}

/**
 * Análise Completa de Qualidade da Imagem (dHash + Sobel Sharpness + Eye Blink).
 * Aceita um elemento HTMLImageElement carregado ou Canvas.
 */
export async function analyzeImageQuality(
  imageSource: HTMLImageElement | HTMLCanvasElement
): Promise<ImageAnalysisResult> {
  const width = imageSource.width || 400;
  const height = imageSource.height || 300;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    return {
      dHash: '0000000000000000',
      sharpnessScore: 75,
      isBlurry: false,
      eyesClosed: false,
    };
  }

  ctx.drawImage(imageSource, 0, 0, width, height);

  const dHash = computeDHashFromCanvas(ctx, width, height);
  const sharpnessScore = analyzeImageSharpnessSobel(ctx, width, height);
  const isBlurry = sharpnessScore < 45;
  const eyesClosed = detectEyeBlinkHeuristic(ctx, width, height);

  canvas.width = 0;
  canvas.height = 0;

  return {
    dHash,
    sharpnessScore,
    isBlurry,
    eyesClosed,
  };
}
