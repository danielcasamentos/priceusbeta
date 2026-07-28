/**
 * Módulo de Aprendizado Contínuo da IA de Culling & Edição (PriceU$ AI Learning Engine)
 * Memoriza os hábitos de corte, zoom, enquadramento e revelação do fotógrafo.
 */

export interface UserAIEferenceProfile {
  totalEditsLearned: number;
  preferredCropRatio: string; // ex: '4:5', '3:4', '16:9'
  avgZoomScale: number; // ex: 1.15
  avgPresetIntensity: number; // ex: 85
  favoriteColorStyle: string; // 'vibrant' | 'warm' | 'natural'
  autoUprightPreference: boolean;
  bwCreationRate: number; // % de fotos que o usuário converte em P&B
  lastUpdated: string;
}

const LEARNING_PROFILE_KEY = 'priceus_ai_user_learning_profile';

export const DEFAULT_AI_LEARNING_PROFILE: UserAIEferenceProfile = {
  totalEditsLearned: 0,
  preferredCropRatio: '4:5',
  avgZoomScale: 1.1,
  avgPresetIntensity: 85,
  favoriteColorStyle: 'warm',
  autoUprightPreference: true,
  bwCreationRate: 0.15,
  lastUpdated: new Date().toISOString(),
};

/**
 * Carrega o perfil de aprendizado treinado do usuário
 */
export function getStoredAILearningProfile(): UserAIEferenceProfile {
  try {
    const raw = localStorage.getItem(LEARNING_PROFILE_KEY);
    if (raw) {
      return { ...DEFAULT_AI_LEARNING_PROFILE, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Erro ao ler perfil de aprendizado da IA:', err);
  }
  return DEFAULT_AI_LEARNING_PROFILE;
}

/**
 * Registra um evento de edição manual do usuário para aprendizado contínuo da IA
 */
export function registerUserEditFeedback(editData: {
  cropRatio?: string;
  zoomScale?: number;
  presetIntensity?: number;
  hasRotation?: boolean;
  isBW?: boolean;
}): UserAIEferenceProfile {
  const current = getStoredAILearningProfile();

  const total = current.totalEditsLearned + 1;
  const newCropRatio = editData.cropRatio || current.preferredCropRatio;
  
  const newZoomScale = editData.zoomScale
    ? (current.avgZoomScale * current.totalEditsLearned + editData.zoomScale) / total
    : current.avgZoomScale;

  const newPresetIntensity = editData.presetIntensity
    ? (current.avgPresetIntensity * current.totalEditsLearned + editData.presetIntensity) / total
    : current.avgPresetIntensity;

  const updated: UserAIEferenceProfile = {
    totalEditsLearned: total,
    preferredCropRatio: newCropRatio,
    avgZoomScale: Math.round(newZoomScale * 100) / 100,
    avgPresetIntensity: Math.round(newPresetIntensity),
    favoriteColorStyle: current.favoriteColorStyle,
    autoUprightPreference: editData.hasRotation !== undefined ? editData.hasRotation : current.autoUprightPreference,
    bwCreationRate: editData.isBW ? Math.min(1.0, current.bwCreationRate + 0.05) : current.bwCreationRate,
    lastUpdated: new Date().toISOString(),
  };

  try {
    localStorage.setItem(LEARNING_PROFILE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Erro ao salvar aprendizado da IA:', err);
  }

  return updated;
}
