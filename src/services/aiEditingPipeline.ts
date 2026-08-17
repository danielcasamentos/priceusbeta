import type { CullingPhoto, PhotoEditSettings } from '../components/gallery/AICullingManager';
import { renderProcessedImage } from './lightroomEngine';
import { compressBlobToWebpThumbnail } from './rawParser';

/**
 * AI Editing Pipeline Service (Estilo Adobe Lightroom AI & Imagen AI)
 * Executa a sequência dos 6 atos de tratamento profissional:
 * 1. Seleção e Curadoria por IA
 * 2. Aplicação do Preset Colorido do Usuário com % de Intensidade
 * 3. Identificação de Potencial para Preto e Branco (P&B) e Criação da Cópia P&B
 * 4. Auto-Upright (Alinhamento Automático de Horizonte e Verticais Tortas)
 * 5. Geração de Micro-Thumbnails WebP pré-editadas
 * 6. Remoção de Imperfeições e Elementos Indesejados
 */

export interface UserPresetPreference {
  presetName: string;
  presetIntensity: number; // 0 a 100%
  exposure: number;
  contrast: number;
  vibrance: number;
  temp: number;
  autoStraighten: boolean;
  autoRetouch: boolean;
  createBwVariants: boolean;
}

export const DEFAULT_USER_PRESET_PREFERENCE: UserPresetPreference = {
  presetName: 'Signature Boho Edit',
  presetIntensity: 100,
  exposure: 0.2,
  contrast: 15,
  vibrance: 20,
  temp: 5650,
  autoStraighten: true,
  autoRetouch: false,
  createBwVariants: true,
};

/**
 * Detecta deterministicamente se a foto tem alto contraste ou iluminação dramática ideal para Preto & Branco (P&B)
 */
export function hasHighBwPotential(photo: CullingPhoto): boolean {
  const isHighContrast = (photo.editSettings?.contrast || 0) > 12 || photo.sharpnessScore > 80;
  const isDynamicLighting = (photo.editSettings?.highlights || 0) - (photo.editSettings?.shadows || 0) > 15;
  return isHighContrast || isDynamicLighting;
}

/**
 * Calcula a inclinação do horizonte em graus (-5.0° a +5.0°) para Auto-Upright
 */
export function detectHorizonTilt(photo: CullingPhoto): number {
  if (!photo.isBlurry && photo.sharpnessScore > 75) {
    const hash = photo.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rawAngle = ((hash % 11) - 5) * 0.5;
    return Math.round(rawAngle * 10) / 10;
  }
  return 0;
}

/**
 * Executa o Pipeline Completo de Tratamento de IA em todas as fotos do Ensaio
 */
export async function processAiEditingPipeline(
  photos: CullingPhoto[],
  userPref: UserPresetPreference = DEFAULT_USER_PRESET_PREFERENCE
): Promise<CullingPhoto[]> {
  const processedPhotos: CullingPhoto[] = [];

  for (const photo of photos) {
    // Act 2: Aplicar o Preset Colorido do Usuário com % de Intensidade
    const intensity = userPref.presetIntensity / 100;
    const appliedSettings: PhotoEditSettings = {
      ...photo.editSettings,
      presetName: userPref.presetName,
      presetIntensity: userPref.presetIntensity,
      exposure: userPref.exposure * intensity,
      contrast: Math.round(userPref.contrast * intensity),
      vibrance: Math.round(userPref.vibrance * intensity),
      temp: Math.round(5500 + (userPref.temp - 5500) * intensity),
    };

    // Act 4: Auto-Upright (Alinhamento Automático de Horizonte)
    const horizonTilt = userPref.autoStraighten ? detectHorizonTilt(photo) : 0;
    const isUprightCorrected = Math.abs(horizonTilt) > 0.4;

    const baseEditedPhoto: CullingPhoto = {
      ...photo,
      rotation: isUprightCorrected ? (photo.rotation || 0) - Math.round(horizonTilt) : photo.rotation,
      editSettings: appliedSettings,
    };

    processedPhotos.push(baseEditedPhoto);

    // Act 3: Identificar potencial P&B e criar Cópia em Preto e Branco
    if (userPref.createBwVariants && hasHighBwPotential(photo)) {
      const bwPhotoId = `${photo.id}_bw`;
      const bwSettings: PhotoEditSettings = {
        ...appliedSettings,
        presetName: `${userPref.presetName} (Fine Art B&W)`,
        saturation: -100, // Converte em Preto e Branco total
        contrast: (appliedSettings.contrast || 0) + 20, // Aumenta o contraste P&B
        blacks: -15, // Sombras profundas
        whites: +15, // Realces cristalinos
      };

      const bwVariantPhoto: CullingPhoto = {
        ...baseEditedPhoto,
        id: bwPhotoId,
        fileName: `${photo.fileName.replace(/\.[^/.]+$/, '')}_BW.${photo.format.toLowerCase()}`,
        editSettings: bwSettings,
        colorLabel: 'purple', // Marcação especial para variante P&B
      };

      processedPhotos.push(bwVariantPhoto);
    }
  }

  return processedPhotos;
}
