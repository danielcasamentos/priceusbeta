/**
 * rawParser.worker.ts — Web Worker para parsing de arquivos RAW
 * Roda em thread separada: zero bloqueio da UI principal.
 * Protocolo: recebe ArrayBuffer + metadata, devolve jpegBytes + exif via Transferable.
 */

export interface WorkerRequest {
  photoId: string;
  buffer: ArrayBuffer;
  fileName: string;
  fileSize: number;
  ext: string;
}

export interface WorkerResponse {
  photoId: string;
  jpegBytes: Uint8Array | null;
  exif: {
    cameraModel: string;
    lensModel: string;
    iso: number;
    aperture: string;
    shutterSpeed: string;
    focalLength: string;
    orientationDegrees: number;
  };
}

function readASCII(bytes: Uint8Array, offset: number, count: number): string {
  let s = '';
  for (let i = 0; i < count && offset + i < bytes.length; i++) {
    const c = bytes[offset + i];
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

function defaultExif(ext: string) {
  const f = ext.toLowerCase();
  const isSony  = ['arw','srf','sr2'].includes(f);
  const isCanon = ['cr2','cr3'].includes(f);
  const isNikon = ['nef','nrw'].includes(f);
  const isFuji  = ['raf'].includes(f);
  return {
    cameraModel: isSony ? 'Sony ILCE-7M4 (A7 IV)' : isCanon ? 'Canon EOS R6 Mark II' : isNikon ? 'Nikon Z7 II' : isFuji ? 'Fujifilm X-T5' : 'Camera Profissional',
    lensModel:   isSony ? 'FE 85mm F1.4 GM'        : isCanon ? 'RF 50mm F1.2L USM'    : isNikon ? 'NIKKOR Z 85mm F1.8 S' : isFuji ? 'XF 56mm F1.2 R WR' : 'Lente Prime 85mm',
    iso: 400, aperture: 'f/1.8', shutterSpeed: '1/1000s', focalLength: '85mm',
  };
}

function parseExifWorker(bytes: Uint8Array, ext: string) {
  const def = defaultExif(ext);
  let make = '', model = '', lens = '';
  let iso = def.iso, aperture = def.aperture, shutterSpeed = def.shutterSpeed, focalLength = def.focalLength;
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
          if (tag===0x010F&&!make) make=readASCII(bytes,cnt>4?tiff+view.getUint32(to+8,le):to+8,cnt);
          if (tag===0x0110&&!model) model=readASCII(bytes,cnt>4?tiff+view.getUint32(to+8,le):to+8,cnt);
          if (tag===0x8827) iso=view.getUint16(to+8,le)||iso;
          if (tag===0x829D){const vo=tiff+view.getUint32(to+8,le);if(vo+8<=bytes.length){const n2=view.getUint32(vo,le),d=view.getUint32(vo+4,le);if(d>0)aperture=`f/${(n2/d).toFixed(1)}`;}}
          if (tag===0x829A){const vo=tiff+view.getUint32(to+8,le);if(vo+8<=bytes.length){const n2=view.getUint32(vo,le),d=view.getUint32(vo+4,le);if(n2>0&&d>0)shutterSpeed=d>=n2?`1/${Math.round(d/n2)}s`:`${(n2/d).toFixed(1)}s`;}}
          if (tag===0x920A){const vo=tiff+view.getUint32(to+8,le);if(vo+8<=bytes.length){const n2=view.getUint32(vo,le),d=view.getUint32(vo+4,le);if(d>0)focalLength=`${Math.round(n2/d)}mm`;}}
          if (tag===0xA434&&!lens) lens=readASCII(bytes,cnt>4?tiff+view.getUint32(to+8,le):to+8,cnt);
          if (tag===0x8769) parseIFD(tiff+view.getUint32(to+8,le));
        }
      };
      parseIFD(tiff+view.getUint32(tiff+4,le));
    }
  } catch {}
  const cm = model?(make&&!model.toLowerCase().includes(make.toLowerCase())?`${make} ${model}`:model).trim():def.cameraModel;
  return { cameraModel:cm, lensModel:lens.trim()||def.lensModel, iso, aperture, shutterSpeed, focalLength };
}

function parseOrientationWorker(bytes: Uint8Array): number {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let off = 0;
    while (off < bytes.length - 10) {
      if (bytes[off]===0xFF&&bytes[off+1]===0xE1) {
        const len=view.getUint16(off+2,false);const eh=off+4;
        if(bytes[eh]===0x45&&bytes[eh+1]===0x78&&bytes[eh+2]===0x69&&bytes[eh+3]===0x66){
          const t=eh+6;const le=view.getUint16(t,false)===0x4949;const n=view.getUint16(t+8,le);
          for(let i=0;i<n;i++){const to=t+10+i*12;if(to+12>bytes.length)break;if(view.getUint16(to,le)===0x0112){const o=view.getUint16(to+8,le);return o===6?90:o===3?180:o===8?270:0;}}
        }
        off+=len+2;
      } else if (bytes[off]===0x49&&bytes[off+1]===0x49) {
        const le=true;const n=Math.min(view.getUint16(off+8,le),50);
        for(let i=0;i<n;i++){const to=off+10+i*12;if(to+12>bytes.length)break;if(view.getUint16(to,le)===0x0112){const o=view.getUint16(to+8,le);return o===6?90:o===3?180:o===8?270:0;}}
        break;
      } else { off++; }
    }
  } catch {}
  return 0;
}

/**
 * findLargestJpeg com 3 estratégias:
 * 1. TIFF IFD StripOffsets/PreviewImageStart (mais preciso para ARW/NEF)
 * 2. Scan linear SOI+EOI (fallback universal)
 * 3. Fallback: do primeiro SOI ao fim do buffer
 */
function findLargestJpegWorker(bytes: Uint8Array): Uint8Array | null {
  // Estratégia 1: TIFF IFD
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let tiff = -1, le = true;
    for (let i = 0; i < Math.min(bytes.length - 8, 4096); i++) {
      if (bytes[i]===0x49&&bytes[i+1]===0x49&&bytes[i+2]===0x2A&&bytes[i+3]===0x00) { tiff=i; le=true; break; }
      if (bytes[i]===0x4D&&bytes[i+1]===0x4D&&bytes[i+2]===0x00&&bytes[i+3]===0x2A) { tiff=i; le=false; break; }
    }
    if (tiff !== -1) {
      let ifdOffset = tiff + view.getUint32(tiff + 4, le);
      let maxJpegStart = -1, maxJpegLen = 0;
      for (let pass = 0; pass < 8 && ifdOffset > 0 && ifdOffset < bytes.length - 2; pass++) {
        const nEntries = Math.min(view.getUint16(ifdOffset, le), 200);
        let previewOffset = -1, previewLength = -1;
        for (let k = 0; k < nEntries; k++) {
          const to = ifdOffset + 2 + k * 12;
          if (to + 12 > bytes.length) break;
          const tag = view.getUint16(to, le);
          const type = view.getUint16(to + 2, le);
          const valOffset = to + 8;
          if ((tag===0x0111||tag===0x0201)&&(type===4||type===3)) previewOffset=tiff+(type===3?view.getUint16(valOffset,le):view.getUint32(valOffset,le));
          if ((tag===0x0117||tag===0x0202)&&(type===4||type===3)) previewLength=type===3?view.getUint16(valOffset,le):view.getUint32(valOffset,le);
        }
        if (previewOffset>0&&previewLength>3000&&previewOffset+previewLength<=bytes.length&&bytes[previewOffset]===0xFF&&bytes[previewOffset+1]===0xD8) {
          if (previewLength > maxJpegLen) { maxJpegStart=previewOffset; maxJpegLen=previewLength; }
        }
        const nextPtr = ifdOffset + 2 + nEntries * 12;
        if (nextPtr + 4 > bytes.length) break;
        const next = view.getUint32(nextPtr, le);
        if (next===0||next===ifdOffset-tiff) break;
        ifdOffset = tiff + next;
      }
      if (maxJpegStart !== -1) return bytes.subarray(maxJpegStart, maxJpegStart + maxJpegLen);
    }
  } catch {}

  // Estratégia 2: Scan linear
  let bestStart = -1, bestLength = 0;
  for (let i = 0; i < bytes.length - 4; i++) {
    if (bytes[i]===0xFF&&bytes[i+1]===0xD8) {
      for (let j = i + 1000; j < bytes.length - 1; j++) {
        if (bytes[j]===0xFF&&bytes[j+1]===0xD9) {
          const len = j + 2 - i;
          if (len > bestLength) { bestStart=i; bestLength=len; }
          break;
        }
      }
    }
  }
  if (bestStart !== -1 && bestLength >= 3000) return bytes.subarray(bestStart, bestStart + bestLength);

  // Estratégia 3: Fallback
  for (let i = 0; i < Math.min(bytes.length - 4, 131072); i++) {
    if (bytes[i]===0xFF&&bytes[i+1]===0xD8) {
      const slice = bytes.subarray(i);
      if (slice.length > 10000) return slice;
    }
  }
  return null;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { photoId, buffer, ext } = e.data;
  const bytes = new Uint8Array(buffer);
  const exifData = parseExifWorker(bytes, ext);
  const orientationDegrees = parseOrientationWorker(bytes);
  const jpegBytes = findLargestJpegWorker(bytes);
  const response: WorkerResponse = {
    photoId,
    jpegBytes: jpegBytes ?? null,
    exif: { ...exifData, orientationDegrees },
  };
  if (jpegBytes) {
    // Transfere buffer sem cópia de memória
    (self as DedicatedWorkerGlobalScope).postMessage(response, [jpegBytes.buffer]);
  } else {
    (self as DedicatedWorkerGlobalScope).postMessage(response);
  }
};
