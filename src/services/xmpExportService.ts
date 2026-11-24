import JSZip from 'jszip';
import { platformAdapter } from './platformAdapter';

export interface XmpPhotoData {
  fileName: string;
  starRating?: number;
  selected?: boolean;
  isDiscarded?: boolean;
  colorLabel?: 'none' | 'red' | 'yellow' | 'green' | 'blue' | 'purple' | string;
  editSettings?: {
    exposure?: number;
    contrast?: number;
    highlights?: number;
    shadows?: number;
    whites?: number;
    blacks?: number;
    temp?: number;
    tint?: number;
    vibrance?: number;
    saturation?: number;
    clarity?: number;
    dehaze?: number;
    hsl?: any;
    cropOffsetX?: number;
    cropOffsetY?: number;
  };
}

/**
 * Mapeia o Color Label interno do PriceU$ para a string padrão do Adobe Lightroom Classic
 */
export function mapColorLabelToXmp(colorLabel?: string): string {
  switch (colorLabel?.toLowerCase()) {
    case 'red':
      return 'Red';
    case 'yellow':
      return 'Yellow';
    case 'green':
      return 'Green';
    case 'blue':
      return 'Blue';
    case 'purple':
      return 'Purple';
    default:
      return '';
  }
}

/**
 * Nível de urgência do Photoshop/Lightroom (Urgency: 1 = Top/Aprovada, 5 = Rejeitada/Lixeira, 0 = Neutra)
 */
export function calculatePhotoshopUrgency(photo: XmpPhotoData): number {
  if (photo.isDiscarded) return 5;
  if (photo.selected || (photo.starRating && photo.starRating >= 4)) return 1;
  if (photo.starRating && photo.starRating > 0) return 2;
  return 0;
}

/**
 * Calcula a pontuação final de estrelas (0 a 5) para o arquivo .xmp
 */
export function calculateXmpRating(photo: XmpPhotoData): number {
  if (photo.isDiscarded) return 1;
  if (photo.starRating && photo.starRating > 0) return photo.starRating;
  if (photo.selected) return 4;
  return 0;
}

/**
 * Gera o conteúdo XML padronizado no formato Adobe XMP Core com suporte a 100% dos sliders do Lightroom Classic
 */
export function generateAdobeXmpXml(photo: XmpPhotoData): string {
  const rating = calculateXmpRating(photo);
  const label = mapColorLabelToXmp(photo.colorLabel);
  const urgency = calculatePhotoshopUrgency(photo);

  const edit = photo.editSettings || {};
  const exposureVal = edit.exposure !== undefined ? edit.exposure : 0;
  const exposureStr = exposureVal >= 0 ? `+${exposureVal.toFixed(2)}` : exposureVal.toFixed(2);
  const contrast = Math.round(edit.contrast || 0);
  const highlights = Math.round(edit.highlights || 0);
  const shadows = Math.round(edit.shadows || 0);
  const whites = Math.round(edit.whites || 0);
  const blacks = Math.round(edit.blacks || 0);
  const temp = Math.round(edit.temp || 5500);
  const tint = Math.round(edit.tint || 0);
  const vibrance = Math.round(edit.vibrance || 0);
  const saturation = Math.round(edit.saturation || 0);
  const clarity = Math.round(edit.clarity || 0);
  const dehaze = Math.round(edit.dehaze || 0);

  const hsl = edit.hsl || {};
  const orangeHue = Math.round(hsl.orange?.hue || 0);
  const orangeSat = Math.round(hsl.orange?.saturation || 0);
  const orangeLum = Math.round(hsl.orange?.luminance || 0);
  const greenSat = Math.round(hsl.green?.saturation || 0);
  const greenLum = Math.round(hsl.green?.luminance || 0);

  return `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 2026/01/01-00:00:00">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
    crs:Version="16.0"
    crs:ProcessVersion="15.4"
    xmp:Rating="${rating}"
    xmp:Label="${label}"
    photoshop:Urgency="${urgency}"
    crs:AlreadyApplied="True"
    crs:Exposure2012="${exposureStr}"
    crs:Contrast2012="${contrast}"
    crs:Highlights2012="${highlights}"
    crs:Shadows2012="${shadows}"
    crs:Whites2012="${whites}"
    crs:Blacks2012="${blacks}"
    crs:Temperature="${temp}"
    crs:Tint="${tint}"
    crs:Vibrance="${vibrance}"
    crs:Saturation="${saturation}"
    crs:Clarity2012="${clarity}"
    crs:Dehaze="${dehaze}"
    crs:HueAdjustmentOrange="${orangeHue}"
    crs:SaturationAdjustmentOrange="${orangeSat}"
    crs:LuminanceAdjustmentOrange="${orangeLum}"
    crs:SaturationAdjustmentGreen="${greenSat}"
    crs:LuminanceAdjustmentGreen="${greenLum}">
   <crs:ToneCurvePV2012>
    <rdf:Seq>
     <rdf:li>0, 0</rdf:li>
     <rdf:li>255, 255</rdf:li>
    </rdf:Seq>
   </crs:ToneCurvePV2012>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>`;
}

/**
 * Dispara o comando nativo que foca o Adobe Lightroom Classic diretamente na janela de Importação da pasta selecionada
 */
export async function launchAdobeLightroomImport(folderPath?: string): Promise<boolean> {
  try {
    platformAdapter.addLog(
      'info',
      'SYSTEM',
      `🚀 Disparando Adobe Lightroom Classic diretamente na tela de Importação (Pasta: ${folderPath || 'Automática'})...`
    );

    // Se estiver no Desktop App (Electron)
    if (typeof window !== 'undefined' && (window as any).electron?.launchLightroom) {
      return await (window as any).electron.launchLightroom(folderPath);
    }

    // Fallback URL Protocol
    if (folderPath) {
      window.location.href = `lightroom://import?path=${encodeURIComponent(folderPath)}`;
    }
    return true;
  } catch (err) {
    console.warn('[XmpExportService] Aviso ao abrir Lightroom:', err);
    return false;
  }
}

/**
 * Retorna o nome exato do arquivo .xmp correspondente (ex: IMG_1234.CR3 -> IMG_1234.xmp)
 */
export function getXmpFilename(photoFileName: string): string {
  const lastDot = photoFileName.lastIndexOf('.');
  const baseName = lastDot > 0 ? photoFileName.substring(0, lastDot) : photoFileName;
  return `${baseName}.xmp`;
}

/**
 * Tenta gravar ou atualizar um arquivo .xmp diretamente na pasta de origem do usuário via File System Access API ou App Nativo Electron
 */
export async function writeXmpSidecarToDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle | null | undefined,
  photo: XmpPhotoData & { filePath?: string }
): Promise<boolean> {
  const xmpFileName = getXmpFilename(photo.fileName);
  const xmpContent = generateAdobeXmpXml(photo);

  // 1. Se estiver rodando dentro do App Nativo Desktop (Electron) e o caminho nativo estiver disponível:
  const nativeApi = (window as any).priceusNative;
  if (nativeApi?.writeXmpFile && photo.filePath) {
    try {
      const lastSlash = Math.max(photo.filePath.lastIndexOf('/'), photo.filePath.lastIndexOf('\\'));
      const dirPath = lastSlash > 0 ? photo.filePath.substring(0, lastSlash) : '';
      const fullXmpPath = dirPath ? `${dirPath}/${xmpFileName}` : xmpFileName;
      const res = await nativeApi.writeXmpFile(fullXmpPath, xmpContent);
      if (res?.success) {
        platformAdapter.addLog(
          'success',
          'CULLING',
          `[App Nativo Desktop] Gravado ${xmpFileName} diretamente no SSD em ${fullXmpPath}`
        );
        return true;
      }
    } catch (err) {
      console.warn('[Electron Native XMP] Falha ao salvar via IPC:', err);
    }
  }

  // 2. Se houver um FileSystemDirectoryHandle ativo no navegador (File System Access API):
  if (dirHandle) {
    try {
      const fileHandle = await dirHandle.getFileHandle(xmpFileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(xmpContent);
      await writable.close();

      platformAdapter.addLog(
        'success',
        'CULLING',
        `[XMP Sidecar Local] Gravado ${xmpFileName} com sucesso na pasta de origem (${calculateXmpRating(photo)}★)`
      );
      return true;
    } catch (err) {
      console.warn(`[XMP Writer] Não foi possível salvar ${photo.fileName}.xmp no Handle de Diretório:`, err);
      return false;
    }
  }

  return false;
}

/**
 * Sincroniza em lote os arquivos .xmp diretamente na pasta local do usuário
 * RESTRITO APENAS ÀS FOTOS APROVADAS E SELECIONADAS PELO CULLING
 */
export async function syncAllXmpSidecarsToFolder(
  dirHandle: FileSystemDirectoryHandle | null | undefined,
  photos: (XmpPhotoData & { filePath?: string })[],
  approvedOnly: boolean = true
): Promise<number> {
  const targetPhotos = approvedOnly
    ? photos.filter((p) => p.selected && !p.isDiscarded)
    : photos;

  let successCount = 0;
  for (const photo of targetPhotos) {
    const ok = await writeXmpSidecarToDirectoryHandle(dirHandle, photo);
    if (ok) successCount++;
  }
  platformAdapter.addLog(
    'info',
    'CULLING',
    `[XMP Sync Local] Sincronizados ${successCount} de ${targetPhotos.length} arquivos .xmp de fotos aprovadas na pasta local.`
  );
  return successCount;
}

/**
 * Pacote ZIP contendo os arquivos .xmp Sidecar SOMENTE das fotos aprovadas/selecionadas
 */
export async function downloadXmpZipPackage(
  photos: XmpPhotoData[],
  zipTitle: string = 'sidecars_xmp_priceus',
  approvedOnly: boolean = true
): Promise<void> {
  const targetPhotos = approvedOnly
    ? photos.filter((p) => p.selected && !p.isDiscarded)
    : photos;

  if (targetPhotos.length === 0) {
    platformAdapter.addLog('warn', 'CULLING', '[Exportação XMP] Nenhuma foto aprovada para exportar sidecars .XMP.');
    return;
  }

  const zip = new JSZip();
  let count = 0;

  for (const photo of targetPhotos) {
    const xmpFileName = getXmpFilename(photo.fileName);
    const xmlContent = generateAdobeXmpXml(photo);
    zip.file(xmpFileName, xmlContent);
    count++;
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${zipTitle}_${Date.now()}.zip`;
  link.click();
  URL.revokeObjectURL(url);

  platformAdapter.addLog(
    'success',
    'CULLING',
    `[Exportação XMP ZIP] Pacote baixado com ${count} arquivos .xmp sidecar de fotos aprovadas para o Lightroom Classic.`
  );
}
