/**
 * Módulo de Aprendizado Contínuo da IA de Culling & Edição (PriceU$ AI Learning Engine)
 * Memoriza os hábitos de corte, zoom, enquadramento e revelação do fotógrafo,
 * bem como preferências de aprovação (T) e descarte (X).
 */

export interface ApprovalSignals {
  avgSharpnessOfApproved: number;
  avgExposureOfApproved: number;
  totalApprovals: number;
  totalRejections: number;
}

export interface UserAIEferenceProfile {
  totalEditsLearned: number;
  preferredCropRatio: string; // ex: '4:5', '3:4', '16:9'
  avgZoomScale: number; // ex: 1.15
  avgPresetIntensity: number; // ex: 85
  favoriteColorStyle: string; // 'vibrant' | 'warm' | 'natural'
  autoUprightPreference: boolean;
  bwCreationRate: number; // % de fotos que o usuário converte em P&B
  approvalSignals?: ApprovalSignals;
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
  approvalSignals: {
    avgSharpnessOfApproved: 75,
    avgExposureOfApproved: 80,
    totalApprovals: 0,
    totalRejections: 0,
  },
  lastUpdated: new Date().toISOString(),
};

/**
 * Carrega o perfil de aprendizado treinado do usuário
 */
export function getStoredAILearningProfile(): UserAIEferenceProfile {
  try {
    const raw = localStorage.getItem(LEARNING_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_AI_LEARNING_PROFILE,
        ...parsed,
        approvalSignals: {
          ...DEFAULT_AI_LEARNING_PROFILE.approvalSignals!,
          ...(parsed.approvalSignals || {}),
        },
      };
    }
  } catch (err) {
    console.warn('Erro ao ler perfil de aprendizado da IA:', err);
  }
  return DEFAULT_AI_LEARNING_PROFILE;
}

/**
 * Registra aprovação de foto (tecla 'T') para ajustar preferências
 */
export function registerUserPhotoApproval(sharpness: number, exposure: number = 80): UserAIEferenceProfile {
  const current = getStoredAILearningProfile();
  const sig = current.approvalSignals || DEFAULT_AI_LEARNING_PROFILE.approvalSignals!;
  const n = sig.totalApprovals + 1;

  const newSharp = Math.round((sig.avgSharpnessOfApproved * sig.totalApprovals + sharpness) / n);
  const newExp = Math.round((sig.avgExposureOfApproved * sig.totalApprovals + exposure) / n);

  const updated: UserAIEferenceProfile = {
    ...current,
    totalEditsLearned: current.totalEditsLearned + 1,
    approvalSignals: {
      avgSharpnessOfApproved: newSharp,
      avgExposureOfApproved: newExp,
      totalApprovals: n,
      totalRejections: sig.totalRejections,
    },
    lastUpdated: new Date().toISOString(),
  };

  try {
    localStorage.setItem(LEARNING_PROFILE_KEY, JSON.stringify(updated));
  } catch {}

  return updated;
}

/**
 * Registra descarte de foto (tecla 'X')
 */
export function registerUserPhotoRejection(): UserAIEferenceProfile {
  const current = getStoredAILearningProfile();
  const sig = current.approvalSignals || DEFAULT_AI_LEARNING_PROFILE.approvalSignals!;

  const updated: UserAIEferenceProfile = {
    ...current,
    totalEditsLearned: current.totalEditsLearned + 1,
    approvalSignals: {
      ...sig,
      totalRejections: sig.totalRejections + 1,
    },
    lastUpdated: new Date().toISOString(),
  };

  try {
    localStorage.setItem(LEARNING_PROFILE_KEY, JSON.stringify(updated));
  } catch {}

  return updated;
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
    ...current,
    totalEditsLearned: total,
    preferredCropRatio: newCropRatio,
    avgZoomScale: Math.round(newZoomScale * 100) / 100,
    avgPresetIntensity: Math.round(newPresetIntensity),
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
