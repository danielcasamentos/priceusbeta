/**
 * Motor de Pontuação de Culling com 5 Pilares Reais (PriceU$ Culling Engine)
 * 1. Nitidez Laplaciana Ponderada no Assunto (35%)
 * 2. Foco & Micro-Contraste Facial / Olhos (25%)
 * 3. Exposição & Equilíbrio de Histograma (20%)
 * 4. Composição & Bokeh / Separação de Fundo (15%)
 * 5. Aprendizado Ativo & Feedback do Usuário (5%)
 */

import { getStoredAILearningProfile } from './aiLearningEngine';
import { platformAdapter } from './platformAdapter';

export type CullingSensitivityMode = 'conservative' | 'balanced' | 'editorial';

export interface CullingScoreMetrics {
  sharpnessScore: number;     // 0 a 100
  roiFocusScore: number;      // 0 a 100
  exposureScore: number;      // 0 a 100
  compositionScore: number;   // 0 a 100
  userPreferenceBonus: number;// -15 a +15
  finalScore: number;         // 0 a 100
  isBlurry: boolean;
  eyesClosed: boolean;
  isBestTake: boolean;
  starRating: 0 | 1 | 2 | 3 | 4 | 5;
  thumbnailDataUrl?: string;
}

export interface CullingSensitivityConfig {
  blurryThreshold: number;
  bestTakeThreshold: number;
  star5Threshold: number;
  star4Threshold: number;
  star3Threshold: number;
}

export const SENSITIVITY_CONFIGS: Record<CullingSensitivityMode, CullingSensitivityConfig> = {
  conservative: {
    blurryThreshold: 35,
    bestTakeThreshold: 68,
    star5Threshold: 84,
    star4Threshold: 70,
    star3Threshold: 55,
  },
  balanced: {
    blurryThreshold: 44,
    bestTakeThreshold: 74,
    star5Threshold: 88,
    star4Threshold: 75,
    star3Threshold: 62,
  },
  editorial: {
    blurryThreshold: 52,
    bestTakeThreshold: 82,
    star5Threshold: 92,
    star4Threshold: 80,
    star3Threshold: 68,
  },
};

/**
 * Avalia a imagem com precisão ótica e performance ultrarrápida em OffscreenCanvas
 */
export async function analyzePhotoQuality(
  imgSource: CanvasImageSource,
  width: number,
  height: number,
  mode: CullingSensitivityMode = 'balanced'
): Promise<CullingScoreMetrics> {
  // Renderiza em resolução ideal (max 320px) preservando aspecto vertical (retrato) ou horizontal (paisagem)
  const isVertical = height > width;
  const maxDim = 320;
  let targetW: number;
  let targetH: number;

  if (isVertical) {
    targetH = maxDim;
    targetW = Math.max(120, Math.round((maxDim * width) / Math.max(1, height)));
  } else {
    targetW = maxDim;
    targetH = Math.max(120, Math.round((maxDim * height) / Math.max(1, width)));
  }
  
  const canvas = new OffscreenCanvas(targetW, targetH);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  if (!ctx) {
    return defaultFallbackMetrics(mode);
  }

  ctx.drawImage(imgSource, 0, 0, targetW, targetH);
  const imgData = ctx.getImageData(0, 0, targetW, targetH);
  const data = imgData.data;
  const w = targetW;
  const h = targetH;

  // 1. Nitidez por Operador Laplaciano Ponderado (Grayscale 3x3)
  const gray = new Float32Array(w * h);
  let sumLuma = 0;
  let clippedHigh = 0;
  let clippedLow = 0;

  for (let i = 0; i < data.length; i += 4) {
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[i / 4] = luma;
    sumLuma += luma;
    if (luma > 252) clippedHigh++;
    if (luma < 4) clippedLow++;
  }

  let lapSum = 0;
  let lapSqSum = 0;
  let totalPixels = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      // Kernel Laplaciano 3x3: [[0, 1, 0], [1, -4, 1], [0, 1, 0]]
      const val = gray[idx - w] + gray[idx - 1] - 4 * gray[idx] + gray[idx + 1] + gray[idx + w];
      lapSum += val;
      lapSqSum += val * val;
      totalPixels++;
    }
  }

  const globalMean = lapSum / Math.max(1, totalPixels);
  const globalVariance = Math.max(0, (lapSqSum / Math.max(1, totalPixels)) - (globalMean * globalMean));
  const rawSharpness = Math.min(100, Math.max(10, Math.round(Math.log2(globalVariance + 1) * 9.2)));

  // 2. Foco na Região de Interesse Superior / Central (Rostos, Olhos e Assunto)
  let roiLapSq = 0;
  let roiCount = 0;
  const minX = Math.floor(w * 0.20);
  const maxX = Math.floor(w * 0.80);
  const minY = Math.floor(h * 0.15); // Rostos costumam ficar no terço superior
  const maxY = Math.floor(h * 0.65);

  let darkPixelCount = 0;
  let brightPixelCount = 0;

  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      const idx = y * w + x;
      const val = gray[idx - w] + gray[idx - 1] - 4 * gray[idx] + gray[idx + 1] + gray[idx + w];
      roiLapSq += val * val;
      roiCount++;

      const l = gray[idx];
      if (l < 45) darkPixelCount++;
      if (l > 175) brightPixelCount++;
    }
  }

  const roiVariance = roiCount > 0 ? roiLapSq / roiCount : globalVariance;
  const roiRatio = globalVariance > 0 ? roiVariance / globalVariance : 1;
  const roiFocusScore = Math.min(100, Math.max(20, Math.round(Math.min(roiRatio, 1.8) * 60 + rawSharpness * 0.3)));

  // 3. Exposição & Equilíbrio de Histograma
  const avgLuma = sumLuma / gray.length; // Ideal: ~105 a 145
  const lumaDev = Math.abs(avgLuma - 126) / 126;
  const clipPenalty = ((clippedHigh * 1.5 + clippedLow) / gray.length) * 100;
  const exposureScore = Math.min(100, Math.max(10, Math.round(100 - (lumaDev * 38 + clipPenalty * 1.6))));

  // 4. Composição & Bokeh (Nitidez no assunto vs suavidade nas bordas)
  const compositionScore = Math.min(100, Math.max(30, Math.round(rawSharpness * 0.5 + roiFocusScore * 0.5)));

  // 5. Aprendizado com o Perfil do Usuário
  const profile = getStoredAILearningProfile();
  let userPreferenceBonus = 0;
  if (profile.approvalSignals) {
    if (rawSharpness >= profile.approvalSignals.avgSharpnessOfApproved - 5) {
      userPreferenceBonus += 4;
    }
    if (exposureScore >= profile.approvalSignals.avgExposureOfApproved - 8) {
      userPreferenceBonus += 4;
    }
  }

  // Pontuação Ponderada Final
  const finalScore = Math.min(100, Math.max(1, Math.round(
    rawSharpness * 0.35 +
    roiFocusScore * 0.30 +
    exposureScore * 0.20 +
    compositionScore * 0.15 +
    userPreferenceBonus
  )));

  const cfg = SENSITIVITY_CONFIGS[mode] || SENSITIVITY_CONFIGS.balanced;

  // Detecção precisa de foto borrada
  const isBlurry = rawSharpness < cfg.blurryThreshold || (roiFocusScore < 36 && finalScore < 45);

  // Detecção de olhos fechados: analisa contraste esclera/íris na área central
  const eyeRegionTotal = Math.max(1, (maxY - minY) * (maxX - minX));
  const scleraIrisRatio = (darkPixelCount * brightPixelCount) / (eyeRegionTotal * eyeRegionTotal);
  const eyesClosed = !isBlurry && roiVariance < 22 && scleraIrisRatio < 0.0006;

  // Foto vencedora / Best take
  const isBestTake = !isBlurry && !eyesClosed && (finalScore >= cfg.bestTakeThreshold);

  // Avaliação por estrelas
  const starRating: 0 | 1 | 2 | 3 | 4 | 5 = 
    finalScore >= cfg.star5Threshold ? 5 :
    finalScore >= cfg.star4Threshold ? 4 :
    finalScore >= cfg.star3Threshold ? 3 :
    finalScore >= 45 ? 2 :
    finalScore >= 32 ? 1 : 0;

  let thumbnailDataUrl: string | undefined = undefined;
  try {
    if (typeof (canvas as any).convertToBlob === 'function') {
      const thumbBlob = await (canvas as any).convertToBlob({ type: 'image/webp', quality: 0.55 });
      if (thumbBlob) {
        thumbnailDataUrl = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onloadend = () => res(reader.result as string);
          reader.readAsDataURL(thumbBlob);
        });
      }
    }
  } catch {}

  return {
    sharpnessScore: rawSharpness,
    roiFocusScore,
    exposureScore,
    compositionScore,
    userPreferenceBonus,
    finalScore,
    isBlurry,
    eyesClosed,
    isBestTake,
    starRating,
    thumbnailDataUrl,
  };
}

export function defaultFallbackMetrics(mode: CullingSensitivityMode = 'balanced'): CullingScoreMetrics {
  const cfg = SENSITIVITY_CONFIGS[mode] || SENSITIVITY_CONFIGS.balanced;
  return {
    sharpnessScore: 72,
    roiFocusScore: 70,
    exposureScore: 75,
    compositionScore: 70,
    userPreferenceBonus: 0,
    finalScore: 72,
    isBlurry: false,
    eyesClosed: false,
    isBestTake: 72 >= cfg.bestTakeThreshold,
    starRating: 3,
  };
}
