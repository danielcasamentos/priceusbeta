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

// Helper de conversão RGB para HSL (0..360, 0..1, 0..1)
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

// Helper de conversão HSL para RGB (0..255)
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360 / 360;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Renderiza uma imagem tratada com todas as configurações profissionais estilo Lightroom Classic
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
    const scale = 1 + Math.abs(straightenDegrees) * 0.03;
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);
  }

  // 2. Desenhar Imagem Base
  ctx.drawImage(imageElement, 0, 0, width, height);

  // 3. Remoção de Imperfeições (Spot Healing)
  if (healingPoints && healingPoints.length > 0) {
    applySpotHealing(ctx, width, height, healingPoints);
  }

  // 4. Processamento de Cor com Pipeline Completo do Lightroom Classic
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Fator de intensidade do preset (0% a 200%)
    const intensity = (settings.presetIntensity !== undefined ? settings.presetIntensity : 100) / 100;

    // Básico
    const rawEv = Math.min(5, Math.max(-5, (settings.exposure || 0) * intensity));
    const expFactor = Math.pow(2, rawEv * 0.5);
    const contrastFactor = (255 + (settings.contrast || 0) * intensity * 1.8) / 255;
    const tempK = settings.temp || 5500;
    const tintVal = (settings.tint || 0) * intensity;

    // Balanço de Brancos Planckian Kelvin
    const tempShift = ((tempK - 5500) / 10000) * intensity;
    const rTemp = Math.max(0.6, Math.min(1.5, 1 + tempShift * 0.35));
    const bTemp = Math.max(0.6, Math.min(1.5, 1 - tempShift * 0.35));
    const gTint = Math.max(0.6, Math.min(1.5, 1 - (tintVal / 300)));
    const rTint = Math.max(0.6, Math.min(1.5, 1 + (tintVal / 600)));
    const bTint = Math.max(0.6, Math.min(1.5, 1 + (tintVal / 600)));

    // Saturação e Vibração
    const vibrance = ((settings.vibrance || 0) * intensity) / 100;
    const saturation = ((settings.saturation || 0) * intensity) / 100;
    const isBlackAndWhite = settings.isBlackAndWhite || settings.saturation === -100;

    // HSL 8 Canais
    const hsl = settings.hsl;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // A. Exposição Física (EV) + Balanço de Brancos Kelvin e Tint
      r = r * expFactor * rTemp * rTint;
      g = g * expFactor * gTint;
      b = b * expFactor * bTemp * bTint;

      // B. Contraste em torno do cinza médio (128)
      r = (r - 128) * contrastFactor + 128;
      g = (g - 128) * contrastFactor + 128;
      b = (b - 128) * contrastFactor + 128;

      // C. Realces (Highlights), Sombras (Shadows), Brancos (Whites), Pretos (Blacks)
      const avg = (r + g + b) / 3;
      if (avg > 140 && settings.highlights) {
        const hMult = 1 + ((settings.highlights * intensity) / 220) * ((avg - 140) / 115);
        r *= hMult; g *= hMult; b *= hMult;
      } else if (avg < 110 && settings.shadows) {
        const sMult = 1 + ((settings.shadows * intensity) / 220) * ((110 - avg) / 110);
        r *= sMult; g *= sMult; b *= sMult;
      }
      if (settings.whites) {
        const wMult = 1 + ((settings.whites * intensity) / 300) * (avg / 255);
        r *= wMult; g *= wMult; b *= wMult;
      }
      if (settings.blacks) {
        const bMult = 1 + ((settings.blacks * intensity) / 300) * (1 - avg / 255);
        r *= bMult; g *= bMult; b *= bMult;
      }

      if (isBlackAndWhite) {
        // Conversão Preto & Branco Fine Art (Pesos de Luminância Rec. 709)
        const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        data[i] = Math.min(255, Math.max(0, gray));
        data[i + 1] = Math.min(255, Math.max(0, gray));
        data[i + 2] = Math.min(255, Math.max(0, gray));
      } else {
        // D. HSL 8 Canais de Cores Individuais
        if (hsl) {
          let [h, s, l] = rgbToHsl(Math.min(255, Math.max(0, r)), Math.min(255, Math.max(0, g)), Math.min(255, Math.max(0, b)));
          let ch = hsl.red;
          if (h >= 15 && h < 45) ch = hsl.orange; // TOM DE PELE
          else if (h >= 45 && h < 75) ch = hsl.yellow;
          else if (h >= 75 && h < 165) ch = hsl.green; // FOLHAGENS
          else if (h >= 165 && h < 200) ch = hsl.aqua;
          else if (h >= 200 && h < 265) ch = hsl.blue;
          else if (h >= 265 && h < 315) ch = hsl.purple;
          else if (h >= 315 && h < 345) ch = hsl.magenta;

          if (ch) {
            h += (ch.hue * intensity * 0.3);
            s = Math.max(0, Math.min(1, s * (1 + (ch.saturation * intensity) / 100)));
            l = Math.max(0, Math.min(1, l * (1 + (ch.luminance * intensity) / 100)));
            const [nr, ng, nb] = hslToRgb(h, s, l);
            r = nr; g = ng; b = nb;
          }
        }

        // E. Vibração & Saturação Geral
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
    // Fallback gracioso
  }

  ctx.restore();
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
