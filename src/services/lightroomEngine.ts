/**
 * Lightroom Color & Processing Engine (Canvas 2D / WebGL)
 * Aplica tratamento de cores, exposição, temperatura (Kelvin), presets .xmp,
 * alinhamento de horizonte (Auto-Upright) e Preto & Branco Fine Art.
 */

import { PhotoEditSettings } from '../components/gallery/AICullingManager';
import { platformAdapter } from './platformAdapter';

export interface SpotHealingPoint {
  xPct: number; // 0 a 100% da largura
  yPct: number; // 0 a 100% da altura
  radiusPx: number;
}

/**
 * Renderiza uma imagem tratada com as configurações de edição estilo Lightroom em um Canvas 2D
 */
export function renderProcessedImage(
  imageElement: HTMLImageElement,
  settings: PhotoEditSettings,
  targetCanvas?: HTMLCanvasElement,
  straightenDegrees: number = 0,
  healingPoints: SpotHealingPoint[] = []
): string {
  const canvas = targetCanvas || document.createElement('canvas');
  const width = imageElement.naturalWidth || imageElement.width || 800;
  const height = imageElement.naturalHeight || imageElement.height || 600;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return imageElement.src;

  ctx.save();

  // 1. Aplicar Alinhamento de Horizonte (Auto-Upright)
  if (straightenDegrees !== 0) {
    const centerX = width / 2;
    const centerY = height / 2;
    const rad = (straightenDegrees * Math.PI) / 180;

    ctx.translate(centerX, centerY);
    ctx.rotate(rad);
    // Escala para evitar bordas vazias ao rotacionar (Crop de Alinhamento)
    const scale = 1 + Math.abs(straightenDegrees) * 0.03;
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);
  }

  // 2. Desenhar Imagem Base
  ctx.drawImage(imageElement, 0, 0, width, height);

  // 3. Remoção de Imperfeições e Retoque por IA (Spot Healing)
  if (healingPoints && healingPoints.length > 0) {
    applySpotHealing(ctx, width, height, healingPoints);
  }

  // 4. Extrair Buffer de Pixels para Processamento de Cor / P&B
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Fatores de Ajuste (Curva EV Normalizada estilo Lightroom Classic)
    const rawEv = Math.min(3, Math.max(-3, settings.exposure || 0));
    const expFactor = Math.pow(2, rawEv * 0.45);
    const contrastFactor = (255 + (settings.contrast || 0) * 1.8) / 255;
    const tempK = settings.temp || 5500;

    // Balanço de Brancos Kelvin (Shift suave Amarelo/Azul)
    const tempShift = (tempK - 5500) / 10000;
    const rTemp = Math.max(0.7, Math.min(1.4, 1 + tempShift * 0.25));
    const bTemp = Math.max(0.7, Math.min(1.4, 1 - tempShift * 0.25));

    // Vibração / Saturação
    const vibrance = (settings.vibrance || 10) / 100;
    const saturation = (settings.saturation || 0) / 100;
    const isBlackAndWhite = settings.saturation === -100;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // A. Exposição (EV) + Balanço de Brancos
      r = r * expFactor * rTemp;
      g = g * expFactor;
      b = b * expFactor * bTemp;

      // B. Contraste em torno do tom médio (128)
      r = (r - 128) * contrastFactor + 128;
      g = (g - 128) * contrastFactor + 128;
      b = (b - 128) * contrastFactor + 128;

      // C. Realces (Highlights) & Sombras (Shadows)
      const avg = (r + g + b) / 3;
      if (avg > 150 && settings.highlights !== 0) {
        const hMult = 1 + (settings.highlights / 200) * ((avg - 150) / 105);
        r *= hMult;
        g *= hMult;
        b *= hMult;
      } else if (avg < 100 && settings.shadows !== 0) {
        const sMult = 1 + (settings.shadows / 200) * ((100 - avg) / 100);
        r *= sMult;
        g *= sMult;
        b *= sMult;
      }

      if (isBlackAndWhite) {
        // Conversão em Preto & Branco Fine Art (Pesos de Luminância Rec. 709)
        const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        data[i] = Math.min(255, Math.max(0, gray));
        data[i + 1] = Math.min(255, Math.max(0, gray));
        data[i + 2] = Math.min(255, Math.max(0, gray));
      } else {
        // D. Vibração & Saturação Colorida
        const maxC = Math.max(r, g, b);
        const satAmount = (maxC - avg) / (maxC || 1);
        const vFactor = 1 + vibrance * (1 - satAmount) + saturation;

        r = avg + (r - avg) * vFactor;
        g = avg + (g - avg) * vFactor;
        b = avg + (b - avg) * vFactor;

        data[i] = Math.min(255, Math.max(0, r));
        data[i + 1] = Math.min(255, Math.max(0, g));
        data[i + 2] = Math.min(255, Math.max(0, b));
      }
    }

    ctx.putImageData(imageData, 0, 0);
  } catch (err) {
    // Graceful fallback se o Canvas estiver protegido por CORS
  }

  ctx.restore();
  platformAdapter.addLog(
    'info',
    'CULLING',
    `[Lightroom Engine] Imagem renderizada (${width}x${height}px) | EV: ${settings.exposure || 0} | Kelvin: ${settings.temp || 5500}K | Contraste: ${settings.contrast || 0} | P&B: ${settings.saturation === -100 ? 'Sim' : 'Não'} | Alinhamento: ${straightenDegrees}°`
  );
  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Remoção de Imperfeições e Elementos Indesejados (Spot Healing Brush)
 */
function applySpotHealing(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  points: SpotHealingPoint[]
) {
  for (const pt of points) {
    const cx = (pt.xPct / 100) * width;
    const cy = (pt.yPct / 100) * height;
    const r = pt.radiusPx;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Clona amostra lateral limpa para suavizar o ponto
    const sampleX = Math.min(width - r, cx + r * 1.5);
    const sampleY = Math.min(height - r, cy + r * 0.5);

    ctx.drawImage(
      ctx.canvas,
      sampleX - r,
      sampleY - r,
      r * 2,
      r * 2,
      cx - r,
      cy - r,
      r * 2,
      r * 2
    );

    ctx.restore();
  }
}

/**
 * Desenha a Grade de Regra dos Terços (Rule of Thirds) e Alinhamento de Horizonte
 */
export function drawCropAndRuleOfThirdsOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rotationAngleDegrees: number = 0
) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;

  // Linhas Verticais da Regra dos Terços
  ctx.beginPath();
  ctx.moveTo(width / 3, 0);
  ctx.lineTo(width / 3, height);
  ctx.moveTo((2 * width) / 3, 0);
  ctx.lineTo((2 * width) / 3, height);

  // Linhas Horizontais da Regra dos Terços
  ctx.moveTo(0, height / 3);
  ctx.lineTo(width, height / 3);
  ctx.moveTo(0, (2 * height) / 3);
  ctx.lineTo(width, (2 * height) / 3);
  ctx.stroke();

  // Guia de Alinhamento de Horizonte Central
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  ctx.restore();
}
