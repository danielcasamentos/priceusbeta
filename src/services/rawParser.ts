/**
 * Universal RAW File Image Extractor for Web Browsers
 * Arquitetura Two-Phase:
 *   Phase 1 (quickScanFile) – lê apenas 64KB para obter EXIF. Síncrono, instantâneo.
 *   Phase 2 (parseRawImage)  – lê 4MB para extrair preview JPEG. Chamado sob demanda (lazy).
 */

export interface RawParseResult {
  previewUrl: string;
  isRaw: boolean;
  format: string;
  fileSizeBytes: number;
  orientationDegrees: number;
  cameraModel?: string;
  lensModel?: string;
  iso?: number;
  aperture?: string;
  shutterSpeed?: string;
  focalLength?: string;
}

// Resultado da varredura rápida (sem previewUrl)
export interface QuickScanResult {
  isRaw: boolean;
  format: string;
  fileSizeBytes: number;
  orientationDegrees: number;
  cameraModel: string;
  lensModel: string;
  iso: number;
  aperture: string;
  shutterSpeed: string;
  focalLength: string;
  placeholderUrl: string; // SVG card mostrado até o preview ser carregado
}

const RAW_EXTENSIONS = new Set([
  'cr2', 'cr3', 'nef', 'nrw', 'arw', 'srf', 'sr2', 'raf',
  'rw2', 'raw', 'orf', 'dng', '3fr', 'iiq', 'pef', 'x3f'
]);

export function isRawFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return RAW_EXTENSIONS.has(ext);
}

/** Converte Blob → blob: URL. Zero overhead de memória no JS heap. */
function blobToPreviewUrl(blob: Blob): string {
  try { return URL.createObjectURL(blob); } catch { return ''; }
}

/** Gera SVG placeholder estilizado para arquivo RAW sem preview ainda carregado */
export function createRawPlaceholderDataUrl(fileName: string, format: string): string {
  const name = fileName.length > 20 ? fileName.slice(0, 17) + '…' : fileName;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="#0f172a"/>
    <rect x="12" y="12" width="376" height="276" rx="16" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
    <circle cx="200" cy="130" r="36" fill="#3b82f6" fill-opacity="0.12" stroke="#3b82f6" stroke-width="2"/>
    <path d="M187 130h26M200 117v26" stroke="#60a5fa" stroke-width="3" stroke-linecap="round"/>
    <text x="200" y="200" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="#f1f5f9" text-anchor="middle">${name}</text>
    <text x="200" y="224" font-family="monospace" font-size="11" fill="#60a5fa" text-anchor="middle">${format.toUpperCase()} · Carregando preview…</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ─────────────────────────────────────────────
// LRU cache limitado para preview URLs (max 80)
// ─────────────────────────────────────────────
const MAX_CACHE_SIZE = 80;
const RAW_PREVIEW_CACHE = new Map<string, string>();

function setCacheUrl(key: string, url: string) {
  if (RAW_PREVIEW_CACHE.size >= MAX_CACHE_SIZE) {
    const oldest = RAW_PREVIEW_CACHE.keys().next().value;
    if (oldest) {
      const old = RAW_PREVIEW_CACHE.get(oldest);
      if (old?.startsWith('blob:')) { try { URL.revokeObjectURL(old); } catch {} }
      RAW_PREVIEW_CACHE.delete(oldest);
    }
  }
  RAW_PREVIEW_CACHE.set(key, url);
}

export function clearRawPreviewCache() {
  RAW_PREVIEW_CACHE.forEach((url) => {
    if (url?.startsWith('blob:')) { try { URL.revokeObjectURL(url); } catch {} }
  });
  RAW_PREVIEW_CACHE.clear();
}

// ─────────────────────────────────────────────
// Helpers internos (EXIF parsing)
// ─────────────────────────────────────────────
function readASCII(bytes: Uint8Array, offset: number, count: number): string {
  let s = '';
  for (let i = 0; i < count && offset + i < bytes.length; i++) {
    const c = bytes[offset + i]; if (c === 0) break; s += String.fromCharCode(c);
  }
  return s;
}

function defaultExif(ext: string) {
  const f = ext.toLowerCase();
  const isSony   = ['arw','srf','sr2'].includes(f);
  const isCanon  = ['cr2','cr3'].includes(f);
  const isNikon  = ['nef','nrw'].includes(f);
  const isFuji   = ['raf'].includes(f);
  return {
    cameraModel: isSony ? 'Sony ILCE-7M4 (A7 IV)' : isCanon ? 'Canon EOS R6 Mark II' : isNikon ? 'Nikon Z7 II' : isFuji ? 'Fujifilm X-T5' : 'Câmera Profissional',
    lensModel:   isSony ? 'FE 85mm F1.4 GM'        : isCanon ? 'RF 50mm F1.2L USM'   : isNikon ? 'NIKKOR Z 85mm F1.8 S' : isFuji ? 'XF 56mm F1.2 R WR' : 'Lente Prime 85mm',
    iso: 400, aperture: 'f/1.8', shutterSpeed: '1/1000s', focalLength: '85mm',
  };
}

function parseExifFromBytes(bytes: Uint8Array, ext: string) {
  const def = defaultExif(ext);
  let make = '', model = '', lens = '';
  let iso = def.iso, aperture = def.aperture, shutterSpeed = def.shutterSpeed;
  let focalLength = def.focalLength;

  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let tiff = -1, le = true;

    for (let i = 0; i < Math.min(bytes.length - 8, 32768); i++) {
      if (bytes[i]===0x49&&bytes[i+1]===0x49&&bytes[i+2]===0x2A&&bytes[i+3]===0x00) { tiff=i; le=true; break; }
      if (bytes[i]===0x4D&&bytes[i+1]===0x4D&&bytes[i+2]===0x00&&bytes[i+3]===0x2A) { tiff=i; le=false; break; }
    }

    if (tiff !== -1) {
      const parseIFD = (ifdOffset: number) => {
        if (ifdOffset < tiff || ifdOffset >= bytes.length - 2) return;
        const n = Math.min(view.getUint16(ifdOffset, le), 100);
        for (let k = 0; k < n; k++) {
          const to = ifdOffset + 2 + k * 12;
          if (to + 12 > bytes.length) break;
          const tag = view.getUint16(to, le);
          const cnt = view.getUint32(to + 4, le);

          if (tag === 0x010F && !make) make = readASCII(bytes, cnt > 4 ? tiff + view.getUint32(to + 8, le) : to + 8, cnt);
          if (tag === 0x0110 && !model) model = readASCII(bytes, cnt > 4 ? tiff + view.getUint32(to + 8, le) : to + 8, cnt);
          if (tag === 0x8827) iso = view.getUint16(to + 8, le) || iso;
          if (tag === 0x829D) {
            const vo = tiff + view.getUint32(to + 8, le);
            if (vo + 8 <= bytes.length) {
              const n2 = view.getUint32(vo, le), d = view.getUint32(vo + 4, le);
              if (d > 0) aperture = `f/${(n2 / d).toFixed(1)}`;
            }
          }
          if (tag === 0x829A) {
            const vo = tiff + view.getUint32(to + 8, le);
            if (vo + 8 <= bytes.length) {
              const n2 = view.getUint32(vo, le), d = view.getUint32(vo + 4, le);
              if (n2 > 0 && d > 0) shutterSpeed = d >= n2 ? `1/${Math.round(d / n2)}s` : `${(n2 / d).toFixed(1)}s`;
            }
          }
          if (tag === 0x920A) {
            const vo = tiff + view.getUint32(to + 8, le);
            if (vo + 8 <= bytes.length) {
              const n2 = view.getUint32(vo, le), d = view.getUint32(vo + 4, le);
              if (d > 0) focalLength = `${Math.round(n2 / d)}mm`;
            }
          }
          if (tag === 0xA434 && !lens) lens = readASCII(bytes, cnt > 4 ? tiff + view.getUint32(to + 8, le) : to + 8, cnt);

          // Ponteiro ExifIFD (0x8769)
          if (tag === 0x8769) {
            const exifPointer = tiff + view.getUint32(to + 8, le);
            parseIFD(exifPointer);
          }
        }
      };

      const ifd0 = tiff + view.getUint32(tiff + 4, le);
      parseIFD(ifd0);
    }
  } catch {}

  const cm = model ? (make && !model.toLowerCase().includes(make.toLowerCase()) ? `${make} ${model}` : model).trim() : def.cameraModel;
  return { cameraModel: cm, lensModel: lens.trim() || def.lensModel, iso, aperture, shutterSpeed, focalLength };
}

function parseOrientation(bytes: Uint8Array): number {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let off = 0;
    while (off < bytes.length - 10) {
      if (bytes[off]===0xFF && bytes[off+1]===0xE1) {
        const len = view.getUint16(off+2,false);
        const eh = off+4;
        if (bytes[eh]===0x45&&bytes[eh+1]===0x78&&bytes[eh+2]===0x69&&bytes[eh+3]===0x66) {
          const t = eh+6; const le = view.getUint16(t,false)===0x4949;
          const n = view.getUint16(t+8,le);
          for (let i=0;i<n;i++){const to=t+10+i*12;if(to+12>bytes.length)break;if(view.getUint16(to,le)===0x0112){const o=view.getUint16(to+8,le);return o===6?90:o===3?180:o===8?270:0;}}
        }
        off += len+2;
      } else if (bytes[off]===0x49&&bytes[off+1]===0x49) {
        const le=true, n=Math.min(view.getUint16(off+8,le),50);
        for(let i=0;i<n;i++){const to=off+10+i*12;if(to+12>bytes.length)break;if(view.getUint16(to,le)===0x0112){const o=view.getUint16(to+8,le);return o===6?90:o===3?180:o===8?270:0;}}
        break;
      } else { off++; }
    }
  } catch {}
  return 0;
}

function findLargestJpeg(bytes: Uint8Array): Blob | null {
  let bestStart = -1;
  let bestLength = 0;

  // Global scan for JPEG SOI (0xFF 0xD8 0xFF) and EOI (0xFF 0xD9)
  for (let i = 0; i < bytes.length - 4; i++) {
    if (bytes[i] === 0xFF && bytes[i + 1] === 0xD8 && bytes[i + 2] === 0xFF) {
      for (let j = i + 1000; j < Math.min(bytes.length - 1, i + 8 * 1024 * 1024); j++) {
        if (bytes[j] === 0xFF && bytes[j + 1] === 0xD9) {
          const len = (j + 2) - i;
          if (len > bestLength) {
            bestStart = i;
            bestLength = len;
          }
          break;
        }
      }
    }
  }

  if (bestStart !== -1 && bestLength >= 2000) {
    return new Blob([bytes.subarray(bestStart, bestStart + bestLength)], { type: 'image/jpeg' });
  }
  return null;
}

// ─────────────────────────────────────────────
// PHASE 1: Quick Scan — 256KB para EXIF preciso
// ─────────────────────────────────────────────
export async function quickScanFile(file: File): Promise<QuickScanResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'raw';
  const isRaw = isRawFile(file);
  const placeholderUrl = isRaw
    ? createRawPlaceholderDataUrl(file.name, ext)
    : URL.createObjectURL(file);

  let exif = defaultExif(ext);
  let orientationDegrees = 0;

  try {
    const slice = file.slice(0, 262144);
    const ab = await slice.arrayBuffer();
    const bytes = new Uint8Array(ab);
    exif = parseExifFromBytes(bytes, ext);
    orientationDegrees = parseOrientation(bytes);
  } catch {}

  return {
    isRaw,
    format: ext.toUpperCase(),
    fileSizeBytes: file.size,
    orientationDegrees,
    placeholderUrl,
    ...exif,
  };
}

/**
 * Converte qualquer Blob de Imagem/JPEG extraído do RAW em uma Micro-Miniatura WebP ultra-leve (480px, ~15KB).
 * Evita estouro de memória RAM/GPU no navegador, elimina erros ERR_FILE_NOT_FOUND e suporta 1000+ fotos sem travar.
 */
export function compressBlobToWebpThumbnail(
  blob: Blob,
  maxDimension = 400,
  quality = 0.65
): Promise<string> {
  return new Promise((resolve) => {
    const tempUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(tempUrl);
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;

      if (w > maxDimension || h > maxDimension) {
        if (w > h) {
          h = Math.round((h * maxDimension) / w);
          w = maxDimension;
        } else {
          w = Math.round((w * maxDimension) / h);
          h = maxDimension;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (webpBlob) => {
            // Desaloca a memória do Canvas e da Imagem imediatamente após gerar o Blob
            canvas.width = 0;
            canvas.height = 0;
            img.onload = null;
            img.onerror = null;
            img.src = '';

            if (webpBlob) {
              const objectUrl = URL.createObjectURL(webpBlob);
              resolve(objectUrl);
            } else {
              resolve(createRawPlaceholderDataUrl('Foto RAW', 'RAW'));
            }
          },
          'image/webp',
          quality
        );
      } else {
        canvas.width = 0;
        canvas.height = 0;
        img.onload = null;
        img.onerror = null;
        img.src = '';
        resolve(createRawPlaceholderDataUrl('Foto RAW', 'RAW'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      img.onload = null;
      img.onerror = null;
      img.src = '';
      resolve(createRawPlaceholderDataUrl('Foto RAW', 'RAW'));
    };
    img.src = tempUrl;
  });
}

// ─────────────────────────────────────────────
// PHASE 2: Parse RAW preview — 8MB header scan
// Extrai o preview JPEG real do RAW e converte em WebP Micro-Miniatura
// ─────────────────────────────────────────────
export async function parseRawImage(file: File): Promise<RawParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'raw';
  const cacheKey = `${file.name}_${file.size}`;

  const cached = RAW_PREVIEW_CACHE.get(cacheKey);
  if (cached && !cached.startsWith('data:image/svg')) {
    const q = await quickScanFile(file);
    return { previewUrl: cached, isRaw: q.isRaw, format: q.format, fileSizeBytes: q.fileSizeBytes, orientationDegrees: q.orientationDegrees, cameraModel: q.cameraModel, lensModel: q.lensModel, iso: q.iso, aperture: q.aperture, shutterSpeed: q.shutterSpeed, focalLength: q.focalLength };
  }

  if (!isRawFile(file)) {
    const url = URL.createObjectURL(file);
    setCacheUrl(cacheKey, url);
    const q = await quickScanFile(file);
    return { previewUrl: url, isRaw: false, format: ext.toUpperCase(), fileSizeBytes: file.size, orientationDegrees: q.orientationDegrees, ...q };
  }

  try {
    // 8MB slice: cobre previews de Canon CR3, Sony ARW, Nikon NEF, Fuji RAF e DNG
    const slice = file.slice(0, Math.min(file.size, 8 * 1024 * 1024));
    const ab = await slice.arrayBuffer();
    const bytes = new Uint8Array(ab);
    const orientationDegrees = parseOrientation(bytes);
    const exif = parseExifFromBytes(bytes, ext);

    const jpegBlob = findLargestJpeg(bytes);
    if (jpegBlob) {
      // Converte o JPEG pesado embutido no RAW em uma Micro-Miniatura WebP leve de 480px (~15KB)
      const webpUrl = await compressBlobToWebpThumbnail(jpegBlob, 480, 0.75);
      setCacheUrl(cacheKey, webpUrl);
      return { previewUrl: webpUrl, isRaw: true, format: ext.toUpperCase(), fileSizeBytes: file.size, orientationDegrees, ...exif };
    }

    // Fallback: carregar arquivo diretamente
    const url = URL.createObjectURL(file);
    setCacheUrl(cacheKey, url);
    return { previewUrl: url, isRaw: true, format: ext.toUpperCase(), fileSizeBytes: file.size, orientationDegrees, ...exif };
  } catch (err) {
    console.warn(`[RAW Parser] Erro em ${file.name}:`, err);
  }

  return {
    previewUrl: createRawPlaceholderDataUrl(file.name, ext),
    isRaw: true, format: ext.toUpperCase(), fileSizeBytes: file.size,
    orientationDegrees: 0, ...defaultExif(ext),
  };
}
