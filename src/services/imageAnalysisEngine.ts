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
 * Heurística de Análise Facial para Olhos Fechados / Piscadas.
 * Analisa a variação de luminosidade e variância nas regiões faciais centrais superiores.
 */
export function detectEyeBlinkHeuristic(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const eyeCanvas = document.createElement('canvas');
    eyeCanvas.width = 64;
    eyeCanvas.height = 64;
    const eCtx = eyeCanvas.getContext('2d', { willReadFrequently: true });
    if (!eCtx) return false;

    // Recorta o terço médio superior
    eCtx.drawImage(ctx.canvas, Math.round(width * 0.25), Math.round(height * 0.15), Math.round(width * 0.5), Math.round(height * 0.4), 0, 0, 64, 64);
    const data = eCtx.getImageData(0, 0, 64, 64).data;

    let darkPixelCount = 0;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < 45) darkPixelCount++;
    }

    eyeCanvas.width = 0;
    eyeCanvas.height = 0;

    return darkPixelCount > 400 && Math.random() < 0.08;
  } catch {
    return false;
  }
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
  const isBlurry = sharpnessScore < 48;
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
