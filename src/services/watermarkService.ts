import { WatermarkPosition, WatermarkType } from '../types/gallery';

export interface WatermarkOptions {
  type?: WatermarkType; // 'text' | 'image'
  text?: string;
  logoUrl?: string;
  position?: WatermarkPosition;
  opacity?: number; // 0.1 to 1.0 (default 0.7)
  scale?: number; // 0.05 to 0.5 (default 0.18)
  rotation?: number; // graus (default 0 = horizontal)
}

/**
 * Aplica uma marca d'água (Texto ou Logo PNG sem fundo) sobre uma imagem via Canvas 2D.
 * Retorna um Blob ou DataURL da imagem resultante com a marca aplicada no canto/posição especificado.
 */
export async function applyWatermarkToImage(
  imageSource: string | Blob | HTMLImageElement,
  options: WatermarkOptions
): Promise<Blob> {
  const type = options.type || 'text';
  const position = options.position || 'bottom-right';
  const opacity = options.opacity ?? 0.7;
  const scale = options.scale ?? 0.18;
  const text = options.text || '';
  const logoUrl = options.logoUrl || '';
  const rotation = (options.rotation ?? 0) * (Math.PI / 180); // converter graus para radianos

  // 1. Carregar a imagem base
  const baseImg = await loadImage(imageSource);
  const canvas = document.createElement('canvas');
  canvas.width = baseImg.naturalWidth || baseImg.width;
  canvas.height = baseImg.naturalHeight || baseImg.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Não foi possível obter contexto 2D do canvas.');
  }

  // Desenhar imagem base
  ctx.drawImage(baseImg, 0, 0);

  const margin = Math.min(canvas.width, canvas.height) * 0.03; // 3% de margem

  // 2. Se a marca for LOGO PNG (Imagem)
  if (type === 'image' && logoUrl) {
    try {
      const logoImg = await loadImage(logoUrl);
      const logoAspect = (logoImg.naturalWidth || logoImg.width) / (logoImg.naturalHeight || logoImg.height);

      // Calcular tamanho proporcional da marca d'água
      let drawWidth = canvas.width * scale;
      let drawHeight = drawWidth / logoAspect;

      // Garantir que não estoure em telas pequenas
      if (drawHeight > canvas.height * 0.3) {
        drawHeight = canvas.height * 0.3;
        drawWidth = drawHeight * logoAspect;
      }

      const { x, y } = getCoordinatesForPosition(position, canvas.width, canvas.height, drawWidth, drawHeight, margin);

      ctx.save();
      ctx.globalAlpha = opacity;
      // Aplicar rotação centrada no ponto da marca d'água
      if (rotation !== 0) {
        ctx.translate(x + drawWidth / 2, y + drawHeight / 2);
        ctx.rotate(rotation);
        ctx.drawImage(logoImg, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      } else {
        ctx.drawImage(logoImg, x, y, drawWidth, drawHeight);
      }
      ctx.restore();
    } catch (e) {
      console.warn('[WatermarkService] Erro ao carregar logo PNG, utilizando fallback de texto:', e);
      drawTextWatermark(ctx, text, position, opacity, rotation, canvas.width, canvas.height, margin);
    }
  } else {
    // 3. Marca d'água de TEXTO
    drawTextWatermark(ctx, text, position, opacity, rotation, canvas.width, canvas.height, margin);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Falha ao gerar blob com marca d\'água'));
      },
      'image/jpeg',
      0.92
    );
  });
}

function drawTextWatermark(
  ctx: CanvasRenderingContext2D,
  text: string,
  position: WatermarkPosition,
  opacity: number,
  rotation: number,
  canvasWidth: number,
  canvasHeight: number,
  margin: number
) {
  if (!text || !text.trim()) return;

  const fontSize = Math.max(16, Math.round(canvasWidth * 0.03));
  ctx.save();
  ctx.font = `600 ${fontSize}px sans-serif`;

  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = fontSize;

  const { x, y } = getCoordinatesForPosition(position, canvasWidth, canvasHeight, textWidth, textHeight, margin);

  ctx.globalAlpha = opacity;

  // Aplicar rotação centralizada no texto
  if (rotation !== 0) {
    ctx.translate(x + textWidth / 2, y - textHeight / 2);
    ctx.rotate(rotation);
    ctx.translate(-(x + textWidth / 2), -(y - textHeight / 2));
  }

  ctx.globalAlpha = opacity;

  // Desenhar fundo semi-transparente de contraste atrás do texto
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  const paddingH = fontSize * 0.4;
  const paddingV = fontSize * 0.25;
  ctx.fillRect(x - paddingH, y - textHeight + paddingV, textWidth + paddingH * 2, textHeight + paddingV * 2);

  // Desenhar texto branco com sombra suave
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 6;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);

  ctx.restore();
}

function getCoordinatesForPosition(
  pos: WatermarkPosition,
  cw: number,
  ch: number,
  w: number,
  h: number,
  margin: number
): { x: number; y: number } {
  let x = margin;
  let y = margin + h;

  switch (pos) {
    case 'top-left':
      x = margin;
      y = margin + h;
      break;
    case 'top-center':
      x = (cw - w) / 2;
      y = margin + h;
      break;
    case 'top-right':
      x = cw - w - margin;
      y = margin + h;
      break;
    case 'center-left':
      x = margin;
      y = (ch + h) / 2;
      break;
    case 'center':
      x = (cw - w) / 2;
      y = (ch + h) / 2;
      break;
    case 'center-right':
      x = cw - w - margin;
      y = (ch + h) / 2;
      break;
    case 'bottom-left':
      x = margin;
      y = ch - margin;
      break;
    case 'bottom-center':
      x = (cw - w) / 2;
      y = ch - margin;
      break;
    case 'bottom-right':
      x = cw - w - margin;
      y = ch - margin;
      break;
  }

  return { x, y };
}

function loadImage(src: string | Blob | HTMLImageElement): Promise<HTMLImageElement> {
  if (src instanceof HTMLImageElement) {
    if (src.complete && src.naturalWidth > 0) return Promise.resolve(src);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);

    if (typeof src === 'string') {
      img.src = src;
    } else if (src instanceof Blob) {
      img.src = URL.createObjectURL(src);
    } else if (src instanceof HTMLImageElement) {
      img.src = src.src;
    }
  });
}
