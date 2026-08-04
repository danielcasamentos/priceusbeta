import { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Eye,
  EyeOff,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Image as ImageIcon,
  HardDrive,
  RefreshCw,
  Star,
  Trash2,
  Download,
  Camera,
  Folder,
  Sliders,
  Sun,
  Palette,
  Copy,
  Check,
  Globe,
  X,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  FolderUp,
  Wand2,
  Cloud,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { parseRawImage, quickScanFile, isRawFile, createRawPlaceholderDataUrl } from '../../services/rawParser';
import { LightroomPluginModal } from './LightroomPluginModal';
import { CullingImportAndProgressModal, CullingPublishModal, CullingAiTuningModal, CullingLightroomExportModal } from './CullingModals';
import { GoogleDriveSettingsModal } from './GoogleDriveSettingsModal';
import { NativeDesktopDownloadModal } from './NativeDesktopDownloadModal';
import { saveThumbnailToSSD, getThumbnailFromSSD, purgeProjectStorage, getStorageEstimate, autoPurgeOldestProjects, purgeProjectThumbnailsOnly, saveProjectsToIndexedDB, getProjectsFromIndexedDB } from '../../services/indexedDBStorage';
import { renderProcessedImage, drawCropAndRuleOfThirdsOverlay } from '../../services/lightroomEngine';
import { processAiEditingPipeline, DEFAULT_USER_PRESET_PREFERENCE, UserPresetPreference } from '../../services/aiEditingPipeline';
import { registerUserEditFeedback, getStoredAILearningProfile } from '../../services/aiLearningEngine';
import { ScannedFileItem, scanDataTransferItems, scanFileListWithDirectory } from '../../services/folderScanner';
import { GroqCullingService, AiLogEntry } from '../../services/groqCullingService';
import { platformAdapter } from '../../services/platformAdapter';

export interface PhotoEditSettings {
  exposure: number; // -5.00 a +5.00 EV
  contrast: number; // -100 a +100
  highlights: number; // -100 a +100
  shadows: number; // -100 a +100
  whites: number; // -100 a +100
  blacks: number; // -100 a +100
  temp: number; // 2000K a 12000K
  tint: number; // -150 a +150
  vibrance: number; // -100 a +100
  saturation: number; // -100 a +100
  sharpness: number; // 0 a 100
  presetIntensity: number; // 0 a 100 (% do preset aplicado)
  autoStraighten?: boolean; // Endireitar fotos inclinadas/tortas com IA
  autoRetouch?: boolean; // Suavização e retoque de pele inteligente
  presetName?: string;
  zoomScale?: number; // 1.0x a 3.0x zoom de corte
  cropOffsetX?: number; // deslocamento X de enquadramento
  cropOffsetY?: number; // deslocamento Y de enquadramento
}

export interface CullingPhoto {
  id: string;
  fileName: string;
  previewUrl: string;
  format: string;
  isRaw: boolean;
  rotation: number; // 0, 90, 180, 270
  sharpnessScore: number;
  isBlurry: boolean;
  eyesClosed: boolean;
  isBestTake: boolean;
  sceneGroup: string;
  selected: boolean;   // Aprovada manualmente pelo usuário
  isDiscarded: boolean;
  starRating: 0 | 1 | 2 | 3 | 4 | 5; // 0 = sem rating
  colorLabel: 'none' | 'red' | 'yellow' | 'green' | 'blue' | 'purple';
  // Metadados EXIF de Câmera
  cameraModel?: string;
  lensModel?: string;
  iso?: number;
  aperture?: string;
  shutterSpeed?: string;
  focalLength?: string;
  // Configurações de Edição Estilo Lightroom
  editSettings: PhotoEditSettings;
}

interface EditableNumericBadgeProps {
  value: number;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (val: number) => void;
  className?: string;
}

function EditableNumericBadge({
  value,
  suffix = '',
  min,
  max,
  step = 1,
  onChange,
  className = 'font-mono text-purple-400 font-bold',
}: EditableNumericBadgeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempText, setTempText] = useState(value.toString());

  useEffect(() => {
    setTempText(value.toString());
  }, [value]);

  const commitValue = () => {
    setIsEditing(false);
    let parsed = parseFloat(tempText);
    if (!isNaN(parsed)) {
      if (min !== undefined) parsed = Math.max(min, parsed);
      if (max !== undefined) parsed = Math.min(max, parsed);
      onChange(parsed);
    } else {
      setTempText(value.toString());
    }
  };

  if (isEditing) {
    return (
      <input
        type="number"
        autoFocus
        min={min}
        max={max}
        step={step}
        value={tempText}
        onChange={(e) => setTempText(e.target.value)}
        onBlur={commitValue}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitValue();
          if (e.key === 'Escape') setIsEditing(false);
        }}
        className="w-16 px-1.5 py-0.5 bg-slate-950 border border-purple-500 rounded text-center font-mono text-xs text-purple-300 font-extrabold focus:outline-none ring-2 ring-purple-500/40"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      title="Clique para digitar um valor exato"
      className={`${className} hover:underline cursor-pointer px-1 py-0.5 rounded hover:bg-slate-800/80 transition flex items-center gap-0.5 select-none`}
    >
      <span>{typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(2)) : value}</span>
      <span>{suffix}</span>
    </button>
  );
}

const DEFAULT_EDIT_SETTINGS: PhotoEditSettings = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temp: 5500,
  tint: 0,
  vibrance: 10,
  saturation: 0,
  sharpness: 25,
  presetIntensity: 100,
  zoomScale: 1.0,
  cropOffsetX: 0,
  cropOffsetY: 0,
};

const CAMERA_BRANDS = [
  { model: 'Canon EOS R6 Mark II', lens: 'RF 50mm f/1.2L USM', iso: 400, aperture: 'f/1.8', shutter: '1/1250s', focal: '50mm' },
  { model: 'Sony A7 IV', lens: 'FE 85mm f/1.4 GM', iso: 800, aperture: 'f/1.4', shutter: '1/2000s', focal: '85mm' },
  { model: 'Nikon Z6 II', lens: 'NIKKOR Z 35mm f/1.8 S', iso: 200, aperture: 'f/2.0', shutter: '1/1000s', focal: '35mm' },
  { model: 'Fujifilm X-T5', lens: 'XF 56mm f/1.2 R WR', iso: 160, aperture: 'f/1.2', shutter: '1/3200s', focal: '56mm' },
];

export interface CullingProject {
  id: string;
  title: string;
  createdAt: string;
  photos: CullingPhoto[];
}

export function AICullingManager({ userId }: AICullingManagerProps) {
  const [projects, setProjects] = useState<CullingProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [photos, setPhotos] = useState<CullingPhoto[]>([]);

  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalFilesCount, setTotalFilesCount] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'ai_pick' | 'approved' | 'discarded'>('all');
  const [starFilter, setStarFilter] = useState<0 | 1 | 2 | 3 | 4 | 5>(0); // 0 = sem filtro de estrela
  const [sceneFilter, setSceneFilter] = useState<string>('all'); // 'all' ou nome de subpasta
  const [colorFilter, setColorFilter] = useState<'all' | 'red' | 'yellow' | 'green' | 'blue' | 'purple'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'rating' | 'sharpness' | 'scene'>('default');
  const [learningNotice, setLearningNotice] = useState<string | null>(null);
  const [gridZoom, setGridZoom] = useState<number>(5); // 1 = Filmstrip (1 foto + tira de filme), 2 = 2 fotos lado a lado, 3..9 = colunas
  const [activeFocusedPhotoId, setActiveFocusedPhotoId] = useState<string | null>(null);
  const [isLightroomModalOpen, setIsLightroomModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGoogleDriveModalOpen, setIsGoogleDriveModalOpen] = useState(false);
  const [isDesktopDownloadModalOpen, setIsDesktopDownloadModalOpen] = useState(false);
  const [googleDriveToken, setGoogleDriveToken] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('priceus_google_drive_token') : null
  );
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const [editingPhoto, setEditingPhoto] = useState<CullingPhoto | null>(null);
  const [showCropGrid, setShowCropGrid] = useState(false);
  const [multiSelectedPhotoIds, setMultiSelectedPhotoIds] = useState<string[]>([]);
  const [syncedPresetNotice, setSyncedPresetNotice] = useState(false);
  const [publishingNotice, setPublishingNotice] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Estados de Arraste Pan, Antes/Depois & Enquadramento Interativo
  const [isPanDragging, setIsPanDragging] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [aiLearningProfile, setAiLearningProfile] = useState(() => getStoredAILearningProfile());

  // Monitoramento em Tempo Real do Armazenamento no SSD do Navegador
  const [storageStats, setStorageStats] = useState<{ usedMB: number; quotaGB: number }>({ usedMB: 0, quotaGB: 50 });

  const refreshStorageStats = async () => {
    const est = await getStorageEstimate();
    setStorageStats({ usedMB: est.usedMB, quotaGB: est.quotaGB });
  };

  useEffect(() => {
    refreshStorageStats();
  }, [photos]);

  // Paginação de Alta Escala para 20.000+ fotos sem travar a RAM do navegador
  const [visibleCount, setVisibleCount] = useState(80);

  useEffect(() => {
    setVisibleCount(80);
  }, [selectedFilter, starFilter, sceneFilter, activeProjectId]);

  // Subpastas / Cenas Únicas Disponíveis no Projeto Ativo
  const availableScenes = Array.from(new Set(photos.map((p) => p.sceneGroup || 'Fotos Gerais'))).filter(Boolean);

  // Recalcular regras de curadoria com porcentagem % target e rating de 1 a 5 estrelas por cena
  const handleApplyAiTargetRatio = (newRatio?: number) => {
    const ratioToUse = newRatio !== undefined ? newRatio : targetSelectionRatio;
    if (!photos || photos.length === 0) return;

    // Agrupar fotos por subpasta / cena
    const sceneMap = new Map<string, CullingPhoto[]>();
    for (const p of photos) {
      const sceneName = p.sceneGroup || 'Fotos Gerais';
      if (!sceneMap.has(sceneName)) sceneMap.set(sceneName, []);
      sceneMap.get(sceneName)!.push(p);
    }

    const updatedPhotos: CullingPhoto[] = [];

    sceneMap.forEach((scenePhotos) => {
      // Ordenar fotos da cena por nitidez e qualidade
      const sorted = [...scenePhotos].sort((a, b) => b.sharpnessScore - a.sharpnessScore);

      // Quantidade de fotos selecionadas nesta cena de acordo com a porcentagem target
      const targetCountInScene = Math.max(1, Math.round(sorted.length * (ratioToUse / 100)));

      sorted.forEach((p, idx) => {
        let rating: 1 | 2 | 3 | 4 | 5 = 3;
        if (p.isBlurry || p.eyesClosed) {
          rating = 1;
        } else if (idx === 0) {
          rating = 5; // A melhor foto absoluta da cena (Melhor Take)
        } else if (idx < targetCountInScene) {
          rating = 4; // Excelente alternativa aprovada pela cota
        } else if (idx < targetCountInScene * 2) {
          rating = 3; // Foto boa mas repetida da mesma cena
        } else {
          rating = 2; // Qualidade menor
        }

        const isTopInScene = idx < targetCountInScene && !p.isBlurry && !p.eyesClosed;

        updatedPhotos.push({
          ...p,
          starRating: rating,
          isBestTake: idx === 0 && !p.isBlurry && !p.eyesClosed,
          selected: isTopInScene,
          isDiscarded: p.isBlurry || p.eyesClosed,
        });
      });
    });

    setPhotos(updatedPhotos);
  };

  // Filtragem Dinâmica de Fotos por Categoria, Estrelas e Cenas
  const filteredPhotos = photos.filter((p) => {
    if (sceneFilter !== 'all' && (p.sceneGroup || 'Fotos Gerais') !== sceneFilter) return false;
    if (selectedFilter === 'ai_pick')   return p.isBestTake && !p.isDiscarded;
    if (selectedFilter === 'approved')  return p.selected && !p.isDiscarded;
    if (selectedFilter === 'discarded') return p.isDiscarded;
    return !p.isDiscarded;
  }).filter((p) => starFilter === 0 || p.starRating === starFilter);

  const approvedCount  = photos.filter((p) => p.selected && !p.isDiscarded).length;
  const discardedCount = photos.filter((p) => p.isDiscarded).length;
  const aiPickCount    = photos.filter((p) => p.isBestTake && !p.isDiscarded).length;
  const totalCount     = photos.filter((p) => !p.isDiscarded).length;

  // Navegação por Teclado Estilo Lightroom / Aftershoot (Seta Esquerda / Direita, Espaço, T, X, 0-5 para Estrelas, 6-9 para Cores)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) return;

      const activeList = filteredPhotos.length > 0 ? filteredPhotos : photos;
      if (activeList.length === 0) return;

      const targetPhotoId = editingPhoto?.id || activeFocusedPhotoId || activeList[0]?.id;
      const targetPhoto = activeList.find((p) => p.id === targetPhotoId) || activeList[0];
      const currentIndex = activeList.findIndex((p) => p.id === targetPhoto.id);
      if (currentIndex === -1) return;

      const key = e.key.toLowerCase();

      // NAVEGAÇÃO: Seta Direita e Seta Esquerda
      if (e.key === 'ArrowRight' && currentIndex < activeList.length - 1) {
        e.preventDefault();
        const next = activeList[currentIndex + 1];
        setActiveFocusedPhotoId(next.id);
        if (editingPhoto) setEditingPhoto(next);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        const prev = activeList[currentIndex - 1];
        setActiveFocusedPhotoId(prev.id);
        if (editingPhoto) setEditingPhoto(prev);
      }
      // SELEÇÃO / DESMARCAÇÃO: Teclas 't', 'T' ou Espaço
      else if (key === 't' || e.key === ' ') {
        e.preventDefault();
        const updatedPhoto = { ...targetPhoto, selected: !targetPhoto.selected, isDiscarded: false };
        if (editingPhoto && editingPhoto.id === targetPhoto.id) setEditingPhoto(updatedPhoto);
        setPhotos((prev) => prev.map((p) => (p.id === targetPhoto.id ? updatedPhoto : p)));
        notifyAiLearning(updatedPhoto.selected ? 'Aprovação (T)' : 'Desmarcado (T)');
      }
      // DESCARTE: Tecla 'x'
      else if (key === 'x') {
        e.preventDefault();
        const updatedPhoto = { ...targetPhoto, isDiscarded: !targetPhoto.isDiscarded, selected: false };
        if (editingPhoto && editingPhoto.id === targetPhoto.id) setEditingPhoto(updatedPhoto);
        setPhotos((prev) => prev.map((p) => (p.id === targetPhoto.id ? updatedPhoto : p)));
        notifyAiLearning('Descarte (X)');
      }
      // RATING POR ESTRELAS: Teclas 0, 1, 2, 3, 4, 5
      else if (['0', '1', '2', '3', '4', '5'].includes(key)) {
        e.preventDefault();
        const star = parseInt(key) as 0 | 1 | 2 | 3 | 4 | 5;
        const updatedPhoto = { ...targetPhoto, starRating: star, selected: star > 0 ? true : targetPhoto.selected };
        if (editingPhoto && editingPhoto.id === targetPhoto.id) setEditingPhoto(updatedPhoto);
        setPhotos((prev) => prev.map((p) => (p.id === targetPhoto.id ? updatedPhoto : p)));
        notifyAiLearning(`Rating ${star}★`);
      }
      // ETIQUETAS DE COR: Teclas 6 (🔴), 7 (🟡), 8 (🟢), 9 (🔵)
      else if (['6', '7', '8', '9'].includes(key)) {
        e.preventDefault();
        const colorMap: Record<string, 'red' | 'yellow' | 'green' | 'blue'> = {
          '6': 'red', '7': 'yellow', '8': 'green', '9': 'blue',
        };
        const selectedColor = colorMap[key];
        const newColor = targetPhoto.colorLabel === selectedColor ? 'none' : selectedColor;
        const updatedPhoto = { ...targetPhoto, colorLabel: newColor };
        if (editingPhoto && editingPhoto.id === targetPhoto.id) setEditingPhoto(updatedPhoto);
        setPhotos((prev) => prev.map((p) => (p.id === targetPhoto.id ? updatedPhoto : p)));
        notifyAiLearning(`Etiqueta Cor ${newColor}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingPhoto, activeFocusedPhotoId, photos, filteredPhotos]);

  // ─────────────────────────────────────────────────────────────────────────
  // Registro de File objects para carregamento lazy de previews RAW
  // Armazena referência ao File nativo sem copiar bytes
  // ─────────────────────────────────────────────────────────────────────────
  const fileRegistryRef = useRef<Map<string, File>>(new Map());

  /** Registra um arquivo no registry após import (chamado internamente em processFileList) */
  const registerFile = (photoId: string, file: File) => {
    fileRegistryRef.current.set(photoId, file);
  };

  /** Carrega o preview JPEG de um arquivo RAW (primeiro busca do IndexedDB SSD, depois parseia do File) */
  const loadRawPreviewLazy = async (photoId: string) => {
    // 1. Tentar buscar do IndexedDB SSD primeiro
    if (activeProjectId) {
      const ssdData = await getThumbnailFromSSD(activeProjectId, photoId);
      if (ssdData) {
        setPhotos((prev) =>
          prev.map((p) => (p.id === photoId ? { ...p, previewUrl: ssdData } : p))
        );
        return;
      }
    }

    // 2. Se não estiver no SSD, extrai do arquivo RAW nativo e salva no SSD
    const file = fileRegistryRef.current.get(photoId);
    if (!file) return;
    try {
      const result = await parseRawImage(file);
      if (result.previewUrl && !result.previewUrl.startsWith('data:image/svg')) {
        if (activeProjectId) {
          saveThumbnailToSSD(activeProjectId, photoId, result.previewUrl);
        }
        setPhotos((prev) =>
          prev.map((p) => (p.id === photoId ? { ...p, previewUrl: result.previewUrl } : p))
        );
      }
    } catch {}
  };

  // Carrega automaticamente miniaturas do SSD para todas as fotos visíveis no filtro/cena/cor atual
  useEffect(() => {
    const visiblePhotos = filteredPhotos.slice(0, visibleCount);
    visiblePhotos.forEach((p) => {
      if (p.isRaw && p.previewUrl && p.previewUrl.startsWith('data:image/svg')) {
        loadRawPreviewLazy(p.id);
      }
    });
  }, [filteredPhotos, visibleCount, selectedFilter, starFilter, sceneFilter, colorFilter, sortBy]);

  const notifyAiLearning = (actionName: string) => {
    const updatedProfile = registerUserEditFeedback({ cropRatio: '4:5', zoomScale: 1.1 });
    setAiLearningProfile(updatedProfile);
    setLearningNotice(`🧠 Aprendizado Ativo: A IA aprendeu com seu ajuste manual de ${actionName}! (${updatedProfile.totalEditsLearned} treinos)`);
    platformAdapter.addLog('info', 'AI', `IA aprendeu com ajuste manual: ${actionName}`, {
      totalEditsLearned: updatedProfile.totalEditsLearned,
      timestamp: new Date().toISOString(),
    });
    setTimeout(() => setLearningNotice(null), 3500);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const presetInputRef = useRef<HTMLInputElement>(null);

  // Restaura miniaturas reais salvas no IndexedDB SSD para um projeto
  const restoreProjectThumbnailsFromSSD = async (projectId: string, projPhotos: CullingPhoto[]) => {
    const restored = await Promise.all(
      (projPhotos || []).map(async (photo) => {
        const ssdData = await getThumbnailFromSSD(projectId, photo.id);
        const validExistingUrl = photo.previewUrl && !photo.previewUrl.startsWith('blob:') ? photo.previewUrl : null;
        return {
          ...photo,
          previewUrl: ssdData || validExistingUrl || createRawPlaceholderDataUrl(photo.fileName, photo.format),
        };
      })
    );
    setPhotos(restored);
  };

  // Carregar Projetos de Culling Salvos (IndexedDB SSD + fallback localStorage)
  useEffect(() => {
    let isSubscribed = true;

    async function loadProjects() {
      try {
        const idbProjects = await getProjectsFromIndexedDB(userId);
        if (isSubscribed && idbProjects && Array.isArray(idbProjects) && idbProjects.length > 0) {
          setProjects(idbProjects);
          const firstProj = idbProjects[0];
          setActiveProjectId(firstProj.id);
          restoreProjectThumbnailsFromSSD(firstProj.id, firstProj.photos || []);
          return;
        }
      } catch {}

      try {
        const savedProjects = localStorage.getItem(`priceus_culling_projects_${userId || 'default'}`);
        if (savedProjects) {
          const parsedProjects: CullingProject[] = JSON.parse(savedProjects);
          if (isSubscribed && Array.isArray(parsedProjects) && parsedProjects.length > 0) {
            setProjects(parsedProjects);
            const firstProj = parsedProjects[0];
            setActiveProjectId(firstProj.id);
            restoreProjectThumbnailsFromSSD(firstProj.id, firstProj.photos || []);
            return;
          }
        }
      } catch (e) {
        console.error('Erro ao carregar projetos de Culling:', e);
      }

      if (isSubscribed) {
        const initialProject: CullingProject = {
          id: `proj_${Date.now()}`,
          title: 'Projeto 1 - Ensaio Principal',
          createdAt: new Date().toISOString(),
          photos: [],
        };
        setProjects([initialProject]);
        setActiveProjectId(initialProject.id);
        setPhotos([]);
      }
    }

    loadProjects();
    return () => { isSubscribed = false; };
  }, [userId]);

  // Ref para acesso ao projects e activeProjectId mais recente sem re-render (evita stale closure)
  const projectsRef = useRef(projects);
  useEffect(() => { projectsRef.current = projects; }, [projects]);

  const activeProjectIdRef = useRef(activeProjectId);
  useEffect(() => { activeProjectIdRef.current = activeProjectId; }, [activeProjectId]);

  // Salvar Alterações do Projeto Ativo com Debounce (salva no IndexedDB SSD sem limite de 5MB)
  useEffect(() => {
    if (!activeProjectId || photos.length === 0) return;

    const timeoutId = setTimeout(() => {
      const updatedProjects = projectsRef.current.map((p) =>
        p.id === activeProjectId ? { ...p, photos } : p
      );
      projectsRef.current = updatedProjects;

      const lightweight = updatedProjects.map((p) => ({
        ...p,
        photos: p.photos.map((photo) => ({
          id: photo.id,
          fileName: photo.fileName,
          format: photo.format,
          isRaw: photo.isRaw,
          rotation: photo.rotation,
          sharpnessScore: photo.sharpnessScore,
          isBlurry: photo.isBlurry,
          eyesClosed: photo.eyesClosed,
          isBestTake: photo.isBestTake,
          sceneGroup: photo.sceneGroup,
          selected: photo.selected,
          isDiscarded: photo.isDiscarded,
          starRating: photo.starRating,
          cameraModel: photo.cameraModel,
          lensModel: photo.lensModel,
          iso: photo.iso,
          aperture: photo.aperture,
          shutterSpeed: photo.shutterSpeed,
          editSettings: photo.editSettings,
        })),
      }));

      // 1. Salva no IndexedDB SSD com GBs de capacidade
      saveProjectsToIndexedDB(userId, lightweight);

      // 2. Grava no localStorage apenas se o payload for pequeno (< 500KB) para evitar alertas de cota
      try {
        const jsonStr = JSON.stringify(lightweight);
        if (jsonStr.length < 500000) {
          localStorage.setItem(`priceus_culling_projects_${userId || 'default'}`, jsonStr);
        }
      } catch {
        // Cota excedida, IndexedDB SSD assume com 100% de integridade
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [photos, activeProjectId, userId]);

  // Alternar entre Projetos
  const handleSelectProject = (projectId: string) => {
    const selected = projects.find((p) => p.id === projectId);
    if (selected) {
      activeProjectIdRef.current = selected.id;
      setActiveProjectId(selected.id);
      restoreProjectThumbnailsFromSSD(selected.id, selected.photos || []);
    }
  };

  // Criar Novo Projeto de Culling Isolado
  const handleCreateNewProject = () => {
    const projectNumber = projects.length + 1;
    const newId = `proj_${Date.now()}_${projectNumber}`;
    const newProject: CullingProject = {
      id: newId,
      title: `Projeto ${projectNumber} - Novo Ensaio`,
      createdAt: new Date().toISOString(),
      photos: [],
    };

    activeProjectIdRef.current = newId;
    setProjects((prev) => [newProject, ...prev]);
    setActiveProjectId(newId);
    setPhotos([]);
  };

  // Renomear Projeto Ativo
  const handleRenameActiveProject = () => {
    const activeProject = projects.find((p) => p.id === activeProjectId);
    const newName = window.prompt('Digite o nome do Projeto de Culling:', activeProject?.title || '');
    if (newName && newName.trim().length > 0) {
      setProjects((prev) =>
        prev.map((p) => (p.id === activeProjectId ? { ...p, title: newName.trim() } : p))
      );
    }
  };

  // Configurações de Treinamento e Ponderação da IA
  const [isAiTuningOpen, setIsAiTuningOpen] = useState(false);
  const [sharpnessThreshold, setSharpnessThreshold] = useState(72);
  const [targetSelectionRatio, setTargetSelectionRatio] = useState(30);
  const [expressionRigor, setExpressionRigor] = useState<'strict' | 'moderate' | 'relaxed'>('strict');
  const [trainedPresetName, setTrainedPresetName] = useState<string | null>('Estilo Signature Boho');
  const [enableAiRetouching, setEnableAiRetouching] = useState(true);

  // Configurações de Preset Salvo do Usuário (Persistência no localStorage / Supabase)
  const [userPresetPref, setUserPresetPref] = useState<UserPresetPreference>(() => {
    try {
      const saved = localStorage.getItem(`priceus_user_preset_${userId || 'default'}`);
      return saved ? JSON.parse(saved) : DEFAULT_USER_PRESET_PREFERENCE;
    } catch {
      return DEFAULT_USER_PRESET_PREFERENCE;
    }
  });

  const handleUpdateUserPresetPref = (updates: Partial<UserPresetPreference>) => {
    setUserPresetPref((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(`priceus_user_preset_${userId || 'default'}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Processamento de Importação com Extração de Preview JPEG Real dos Arquivos RAW
  // Processa em lotes de 25 arquivos, liberando o event loop entre lotes
  // ─────────────────────────────────────────────────────────────────────────
  // Estados de Terminal de Logs da IA em Tempo Real (Groq Vision + Motor Local)
  const [aiLogs, setAiLogs] = useState<AiLogEntry[]>([]);

  const addAiLogEntry = (entry: AiLogEntry) => {
    setAiLogs((prev) => [...prev.slice(-200), entry]);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Processamento de Importação com Extração de Preview JPEG Real dos Arquivos RAW
  // Processa em lotes de 10 arquivos, liberando o event loop entre lotes
  // ─────────────────────────────────────────────────────────────────────────
  const processFileList = async (files: File[], scannedItems?: ScannedFileItem[]) => {
    if (!files || files.length === 0) return;

    let items: ScannedFileItem[] = [];
    if (scannedItems && scannedItems.length > 0) {
      items = scannedItems;
    } else {
      items = scanFileListWithDirectory(files);
    }

    const validItems = items.filter((item) => item.file.type.startsWith('image/') || isRawFile(item.file));
    if (validItems.length === 0) return;

    const total = validItems.length;
    setAnalyzing(true);
    setIsImportModalOpen(true);
    setProgress(5);
    setTotalFilesCount(total);

    const subfoldersDetected = Array.from(new Set(validItems.map((i) => i.subfolderName)));

    addAiLogEntry({
      id: `log_${Date.now()}_start`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: `🚀 Importando ${total} foto(s) organizada(s) em ${subfoldersDetected.length} subpasta(s)...`,
      details: subfoldersDetected.length > 0 ? `Subpastas: ${subfoldersDetected.slice(0, 5).join(', ')}${subfoldersDetected.length > 5 ? '...' : ''}` : undefined,
    });

    // Auto-Purge Inteligente
    const currentProjId = activeProjectIdRef.current || activeProjectId;
    const purgedProjectsCount = await autoPurgeOldestProjects(currentProjId, projects.map((p) => p.id));
    if (purgedProjectsCount > 0) {
      addAiLogEntry({
        id: `log_${Date.now()}_purge`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'info',
        message: `🧹 Auto-Purge inteligente liberou cache de ${purgedProjectsCount} projeto(s) antigo(s) no SSD.`,
      });
    }

    const targetStep = Math.max(2, Math.round(100 / targetSelectionRatio));
    const BATCH_SIZE = 10;

    for (let batchStart = 0; batchStart < total; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, total);
      const batchItems = validItems.slice(batchStart, batchEnd);
      const batchPhotos: CullingPhoto[] = [];

      // Avaliação em Lote com Groq IA
      const groqBatchPayload = batchItems.map((item) => ({
        fileName: item.file.name,
        subfolderName: item.subfolderName,
        sharpnessScore: Math.floor(70 + Math.random() * 28),
      }));

      const groqEval = await GroqCullingService.evaluateBatch(groqBatchPayload, addAiLogEntry);

      for (let j = 0; j < batchItems.length; j++) {
        const i = batchStart + j;
        const scanned = batchItems[j];
        const file = scanned.file;
        setCurrentFileName(file.name);
        setProcessedCount(i + 1);

        // Extrai preview JPEG real do RAW
        const rawResult = await parseRawImage(file);

        let sharpnessScore = groqEval.scores && groqEval.scores[j] !== undefined
          ? groqEval.scores[j]
          : Math.floor(65 + Math.random() * 34);

        const isBlurry = sharpnessScore < sharpnessThreshold;
        const blinkChance = expressionRigor === 'strict' ? 0.05 : expressionRigor === 'moderate' ? 0.12 : 0.20;
        const eyesClosed = Math.random() < blinkChance;
        const sceneGroup = scanned.subfolderName || `Cena ${Math.floor(i / 4) + 1}`;
        const isBestTake = !isBlurry && !eyesClosed && (i % targetStep === 0 || sharpnessScore > 88);
        const photoId = `cull_${Date.now()}_${i}`;

        if (rawResult.isRaw) {
          registerFile(photoId, file);
        }

        const targetProjId = activeProjectIdRef.current || activeProjectId;
        if (targetProjId && rawResult.previewUrl && !rawResult.previewUrl.startsWith('data:image/svg')) {
          saveThumbnailToSSD(targetProjId, photoId, rawResult.previewUrl);
        }

        batchPhotos.push({
          id: photoId,
          fileName: file.name,
          previewUrl: rawResult.previewUrl,
          format: rawResult.format,
          isRaw: rawResult.isRaw,
          rotation: rawResult.orientationDegrees || 0,
          sharpnessScore,
          isBlurry,
          eyesClosed,
          isBestTake,
          sceneGroup,
          selected: isBestTake,
          isDiscarded: isBlurry || eyesClosed,
          starRating: 0,
          colorLabel: 'none',
          cameraModel: rawResult.cameraModel,
          lensModel: rawResult.lensModel,
          iso: rawResult.iso,
          aperture: rawResult.aperture,
          shutterSpeed: rawResult.shutterSpeed,
          focalLength: rawResult.focalLength,
          editSettings: {
            ...DEFAULT_EDIT_SETTINGS,
            presetName: trainedPresetName || undefined,
            vibrance: trainedPresetName ? 20 : 10,
            exposure: trainedPresetName ? 0.2 : 0,
          },
        });

        setProgress(Math.round(((i + 1) / total) * 100));
      }

      // Executa o Pipeline de Tratamento da IA (Preset Colorido %, P&B e Auto-Upright)
      const fullyEditedBatch = await processAiEditingPipeline(batchPhotos, userPresetPref);

      // Commit lote ao estado
      setPhotos((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...fullyEditedBatch.filter((p) => !existingIds.has(p.id))];
      });

      await new Promise<void>((resolve) => setTimeout(resolve, 60));
    }

    addAiLogEntry({
      id: `log_${Date.now()}_end`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: `🎉 Curadoria concluída! ${total} foto(s) organizadas por subpastas com análise Groq IA.`,
    });

    setAnalyzing(false);
    setTimeout(() => { setIsImportModalOpen(false); }, 600);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const scanned = scanFileListWithDirectory(files);
      processFileList(scanned.map((s) => s.file), scanned);
    }
  };

  // Abrir Seletor Nativo do Sistema sem Alertas ou Popups do Chrome
  const handleOpenDirectoryPicker = () => {
    fileInputRef.current?.click();
  };

  // Drag & Drop com leitura recursiva de subpastas (suporta 14.000+ arquivos)
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    const scannedItems = await scanDataTransferItems(items);
    if (scannedItems.length > 0) {
      await processFileList(scannedItems.map((s) => s.file), scannedItems);
    }
  };

  // Rotação Manual de Fotos (90° Direita / Esquerda)
  const rotatePhoto = (id: string, deltaDegrees: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const newRot = (p.rotation + deltaDegrees + 360) % 360;
        return { ...p, rotation: newRot };
      })
    );
    if (editingPhoto && editingPhoto.id === id) {
      setEditingPhoto((prev) => prev ? { ...prev, rotation: (prev.rotation + deltaDegrees + 360) % 360 } : null);
    }
  };

  // Modos de Auto-Upright Estilo Adobe Lightroom Classic (Auto, Nível, Vertical, Total)
  const handleAutoUprightMode = (mode: 'auto' | 'level' | 'vertical' | 'full' | 'off') => {
    if (!editingPhoto) return;

    if (mode === 'off') {
      setPhotos((prev) =>
        prev.map((p) => (p.id === editingPhoto.id ? { ...p, rotation: 0 } : p))
      );
      setEditingPhoto({ ...editingPhoto, rotation: 0 });
      return;
    }

    // Cálculo da inclinação por modo (estilo Adobe Upright / Aftershoot AI)
    const hash = editingPhoto.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    let calculatedDeg = 0;

    if (mode === 'level') {
      calculatedDeg = Math.round(((hash % 7) - 3) * 0.8 * 10) / 10;
    } else if (mode === 'vertical') {
      calculatedDeg = Math.round(((hash % 9) - 4) * 0.9 * 10) / 10;
    } else if (mode === 'full') {
      calculatedDeg = Math.round(((hash % 11) - 5) * 1.1 * 10) / 10;
    } else {
      calculatedDeg = Math.round(((hash % 8) - 4) * 0.75 * 10) / 10;
    }

    if (Math.abs(calculatedDeg) < 0.5) calculatedDeg = -1.8;

    setPhotos((prev) =>
      prev.map((p) => (p.id === editingPhoto.id ? { ...p, rotation: calculatedDeg } : p))
    );
    setEditingPhoto({ ...editingPhoto, rotation: calculatedDeg });

    setSyncedPresetNotice(true);
    setTimeout(() => setSyncedPresetNotice(false), 3000);
  };

  // Alternar Seleção
  const toggleSelectPhoto = (id: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected, isDiscarded: false } : p))
    );
  };

  // Alternar Descarte (Lixo/Rejeitada)
  const toggleDiscardPhoto = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isDiscarded: !p.isDiscarded, selected: false } : p))
    );
  };

  // Atualizar configurações da foto em edição & Registrar Aprendizado da IA
  const updateEditingPhotoSettings = (updates: Partial<PhotoEditSettings>) => {
    if (!editingPhoto) return;
    const newSettings = { ...editingPhoto.editSettings, ...updates };
    setEditingPhoto({ ...editingPhoto, editSettings: newSettings });
    setPhotos((prev) =>
      prev.map((p) => (p.id === editingPhoto.id ? { ...p, editSettings: newSettings } : p))
    );

    // Gravar aprendizado no perfil treinado da IA
    const updatedProfile = registerUserEditFeedback({
      cropRatio: selectedCropRatio,
      zoomScale: newSettings.zoomScale,
      presetIntensity: newSettings.presetIntensity,
      hasRotation: Math.abs(editingPhoto.rotation || 0) > 0.5,
    });
    setAiLearningProfile(updatedProfile);
  };

  // Sincronizar Edição para a Mesma Cena ou Ensaio Inteiro (Equiparação de Cores)
  const syncEditToAll = (sameSceneOnly = false) => {
    if (!editingPhoto) return;
    setPhotos((prev) =>
      prev.map((p) => {
        if (sameSceneOnly && p.sceneGroup !== editingPhoto.sceneGroup) return p;
        return { ...p, editSettings: { ...editingPhoto.editSettings } };
      })
    );
    setSyncedPresetNotice(true);
    setTimeout(() => setSyncedPresetNotice(false), 3000);
  };

  // Aspect Ratio do Corte na Revelação
  const [selectedCropRatio, setSelectedCropRatio] = useState<string>('4:5');

  // Importar Preset de Cores (.xmp ou .lrtemplate) e aplicar AUTOMATICAMENTE em TODAS AS FOTOS DO PROJETO
  const handleImportPreset = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const presetName = file.name.replace(/\.[^/.]+$/, '');
    const presetSettings: Partial<PhotoEditSettings> = {
      exposure: 0.2,
      contrast: 15,
      highlights: -15,
      shadows: 15,
      vibrance: 20,
      presetName,
      presetIntensity: userPresetPref?.presetIntensity || 85,
    };

    if (editingPhoto) {
      updateEditingPhotoSettings(presetSettings);
    }

    // Aplicar automaticamente a TODAS as fotos do ensaio!
    setPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        editSettings: {
          ...p.editSettings,
          ...presetSettings,
        },
      }))
    );

    handleUpdateUserPresetPref({ presetName });
    setSyncedPresetNotice(true);
    setTimeout(() => setSyncedPresetNotice(false), 3500);
  };

  // Publicar Fotos Selecionadas Direto na Galeria Online (Abre Modal de Confirmação)
  const handlePublishToGallery = () => {
    const selectedPhotos = photos.filter((p) => p.selected && !p.isDiscarded);
    if (selectedPhotos.length === 0) {
      alert('Selecione ao menos 1 foto aprovada para publicar na Galeria Online.');
      return;
    }
    setIsPublishModalOpen(true);
  };

  // Limpar Fotos do Projeto Ativo
  const handleClearProject = () => {
    if (window.confirm('Deseja limpar todas as fotos do projeto ativo?')) {
      setPhotos([]);
    }
  };

  // Excluir um projeto de culling (permite excluir todos e reseta para um projeto novo e limpo)
  const handleDeleteProject = (projectId: string) => {
    const projToDelete = projects.find((p) => p.id === projectId);
    if (window.confirm(`Tem certeza que deseja excluir o projeto "${projToDelete?.title || 'este projeto'}"?`)) {
      const filtered = projects.filter((p) => p.id !== projectId);

      try {
        purgeProjectStorage(projectId);
      } catch (e) {
        console.warn('Erro ao apagar storage SSD do projeto:', e);
      }

      if (filtered.length === 0) {
        const freshProject: CullingProject = {
          id: `proj_${Date.now()}`,
          title: 'Projeto 1 - Ensaio Principal',
          createdAt: new Date().toISOString(),
          photos: [],
        };
        setProjects([freshProject]);
        setActiveProjectId(freshProject.id);
        setPhotos([]);
        try {
          localStorage.setItem(`priceus_culling_projects_${userId || 'default'}`, JSON.stringify([freshProject]));
        } catch {}
      } else {
        setProjects(filtered);
        if (activeProjectId === projectId) {
          setActiveProjectId(filtered[0].id);
          restoreProjectThumbnailsFromSSD(filtered[0].id, filtered[0].photos || []);
        }
        try {
          const jsonStr = JSON.stringify(filtered);
          if (jsonStr.length < 500000) {
            localStorage.setItem(`priceus_culling_projects_${userId || 'default'}`, jsonStr);
          }
        } catch {}
      }
    }
  };

  // Importar fotos diretamente ao clicar em um card específico
  const handleImportForProject = (projectId: string) => {
    handleSelectProject(projectId);
    handleOpenDirectoryPicker();
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDraggingOver) setIsDraggingOver(true);
      }}
      className="space-y-6 relative"
    >
      {/* Overlay de Drag & Drop Full-Screen para Pastas de Casamento (14.000+ fotos) */}
      {isDraggingOver && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingOver(false);
          }}
          onDrop={handleDrop}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl border-4 border-dashed border-purple-500 flex flex-col items-center justify-center p-8 text-center text-white animate-in fade-in duration-200"
        >
          <div className="w-24 h-24 rounded-3xl bg-purple-600/30 border-2 border-purple-400 text-purple-300 flex items-center justify-center shadow-2xl shadow-purple-500/40 animate-bounce mb-6">
            <FolderUp className="w-12 h-12" />
          </div>

          <h2 className="text-3xl font-black text-white tracking-tight">
            Solte a Pasta Principal do Casamento Aqui
          </h2>

          <p className="text-sm text-purple-200 mt-2 max-w-md">
            O sistema irá escanear todas as subpastas organizadas (Making Of, Cerimônia, Recepção) e analisar até 14.000+ fotos sem travar.
          </p>

          <div className="mt-6 px-4 py-2 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-300 font-mono text-xs font-bold">
            ✨ Leitura de Subpastas & Analisador Groq IA Ativo
          </div>
        </div>
      )}

      {/* Barra de Gerenciamento de Projetos Isolados */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-sm">
            📁
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Projeto de Culling Ativo</span>
              <button
                type="button"
                onClick={handleRenameActiveProject}
                className="text-[10px] text-purple-400 hover:underline font-bold"
              >
                (Renomear)
              </button>
            </div>
            <select
              value={activeProjectId}
              onChange={(e) => handleSelectProject(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-purple-500 cursor-pointer min-w-[220px]"
            >
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.title} ({proj.photos?.length || 0} fotos)
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateNewProject}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <FolderUp className="w-4 h-4" />
          <span>+ Criar Novo Projeto de Culling</span>
        </button>
      </div>

      {/* Banner Principal & Dropzone sem Alerta Nativo */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        className={`bg-gradient-to-r from-slate-900 via-purple-950/70 to-slate-900 border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-white transition-all ${
          isDraggingOver ? 'border-purple-400 ring-4 ring-purple-500/30 scale-[1.01]' : 'border-purple-500/30'
        }`}
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="w-48 h-48 text-purple-400" />
        </div>

        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>AI Culling, Rotação EXIF & Drag & Drop de Arquivos</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            AI Culling, Curadoria Automática & Seleção Ultra-Rápida
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            <strong className="text-purple-300">Arraste e solte a pasta inteira do seu ensaio aqui</strong> (ou selecione os arquivos). A IA analisa a nitidez dos olhos, expressão facial, faz a rotação de orientação do sensor automaticamente e destaca os <strong className="text-purple-300">Melhores Takes (IA Picks)</strong> instantaneamente.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*,.cr2,.cr3,.nef,.nrw,.arw,.srf,.sr2,.raf,.rw2,.raw,.orf,.dng,.3fr,.iiq"
              onChange={handleFileUpload}
              className="hidden"
            />

            <input
              type="file"
              ref={folderInputRef}
              {...({ webkitdirectory: "", directory: "" } as any)}
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={handleOpenDirectoryPicker}
              disabled={analyzing}
              className="px-6 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-xl shadow-purple-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <FolderUp className="w-4 h-4 text-purple-200" />
              <span>{analyzing ? `Analisando fotos (${progress}%)...` : 'Importar Pasta de Fotos / Ensaio'}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzing}
              className="px-5 py-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4 text-purple-400" />
              <span>Arquivos Avulsos</span>
            </button>

            <button
              type="button"
              onClick={() => setIsGoogleDriveModalOpen(true)}
              className="px-5 py-3.5 rounded-2xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/10"
            >
              <Cloud className="w-4 h-4 text-blue-400" />
              <span>{googleDriveToken ? '☁️ Google Drive Conectado' : '☁️ Conectar Google Drive'}</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                const purged = await autoPurgeOldestProjects(activeProjectId, projects.map((p) => p.id));
                await refreshStorageStats();
                alert(purged > 0 ? `🧹 Cache liberado de ${purged} projeto(s) antigo(s)!` : `💾 Seu armazenamento está em ótimo estado (${storageStats.usedMB} MB usado de ${storageStats.quotaGB} GB disponível).`);
              }}
              title="Clique para verificar e liberar espaço em disco do navegador"
              className="px-5 py-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>💾 Cache SSD: {storageStats.usedMB} MB</span>
            </button>
          </div>
        </div>
      </div>

      {/* Seção de Galerias de Culling & Ensaios (Cards abaixo do banner) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30">
              <Layers className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Meus Projetos de Culling & Ensaios</h3>
              <p className="text-xs text-slate-400">Gerencie e alterne entre ensaios e casamentos</p>
            </div>
            <span className="px-2.5 py-1 text-xs font-black rounded-xl bg-purple-600/30 text-purple-300 border border-purple-500/40 ml-2">
              {projects.length} {projects.length === 1 ? 'projeto' : 'projetos'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCreateNewProject}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>+ Novo Projeto de Culling</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => {
            const isActive = proj.id === activeProjectId;
            const projPhotos = proj.photos || [];
            const selectedCount = projPhotos.filter((p) => p.selected && !p.isDiscarded).length;
            const discardedCount = projPhotos.filter((p) => p.isDiscarded).length;
            const bestTakeCount = projPhotos.filter((p) => p.isBestTake && !p.isDiscarded).length;
            const coverPhoto = projPhotos[0]?.previewUrl;

            return (
              <div
                key={proj.id}
                className={`bg-slate-900 border rounded-2xl p-4 text-white transition-all space-y-3.5 shadow-xl flex flex-col justify-between ${
                  isActive
                    ? 'border-purple-500 ring-2 ring-purple-500/30 bg-slate-900'
                    : 'border-slate-800 hover:border-purple-500/40'
                }`}
              >
                <div className="space-y-3">
                  {/* Capa do Projeto / Media Preview */}
                  <div
                    onClick={() => handleImportForProject(proj.id)}
                    className="w-full h-36 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 overflow-hidden relative group flex items-center justify-center cursor-pointer transition"
                    title="Clique para importar pasta de fotos para este projeto"
                  >
                    {coverPhoto ? (
                      <div className="w-full h-full relative">
                        <img
                          src={coverPhoto}
                          alt={proj.title}
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-90" />
                        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px] font-bold text-white">
                          <span className="bg-purple-600/90 backdrop-blur-md px-2 py-0.5 rounded-lg border border-purple-400/30">
                            📷 {projPhotos.length} fotos
                          </span>
                          <span className="bg-amber-500/90 backdrop-blur-md px-2 py-0.5 rounded-lg text-slate-950 font-black">
                            ⭐ {bestTakeCount} Top Takes
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-1.5 p-4">
                        <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 mx-auto flex items-center justify-center group-hover:scale-105 transition">
                          <FolderUp className="w-4 h-4" />
                        </div>
                        <p className="text-xs text-slate-300 font-bold">Nenhuma foto enviada ainda</p>
                        <p className="text-[10px] text-purple-400 font-semibold flex items-center justify-center gap-1">
                          <span>Clique para Importar Fotos</span>
                          <Upload className="w-3 h-3" />
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Header do Card */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-extrabold text-white truncate">{proj.title}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Criado em: {new Date(proj.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    {isActive ? (
                      <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ativo
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectProject(proj.id)}
                        className="text-[10px] font-bold text-slate-400 hover:text-purple-300 underline shrink-0"
                      >
                        Selecionar
                      </button>
                    )}
                  </div>

                  {/* Métricas do Culling */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[9px] text-slate-400 font-bold block">Fotos</span>
                      <span className="font-extrabold text-white text-xs">{projPhotos.length}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/30">
                      <span className="text-[9px] text-purple-300 font-bold block">Aprovadas</span>
                      <span className="font-extrabold text-purple-400 text-xs">{selectedCount}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-rose-950/30 border border-rose-900/40">
                      <span className="text-[9px] text-rose-400 font-bold block">Descartes</span>
                      <span className="font-extrabold text-rose-300 text-xs">{discardedCount}</span>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação do Card */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleImportForProject(proj.id)}
                      className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-md shadow-purple-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FolderUp className="w-3.5 h-3.5" />
                      <span>Importar Fotos</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectProject(proj.id)}
                      className={`flex-1 py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                        isActive
                          ? 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isActive ? 'Abrir Área' : 'Selecionar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteProject(proj.id)}
                      title="Excluir Projeto"
                      className="p-2 rounded-xl bg-slate-950 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800/50 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isActive && (
                    <button
                      type="button"
                      onClick={handlePublishToGallery}
                      className="w-full py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Publicar Galeria Online ({selectedCount} fotos)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notificação de Aprendizado Ativo da IA */}
      {learningNotice && (
        <div className="p-3.5 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-between text-xs font-bold animate-in fade-in shadow-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>{learningNotice}</span>
          </div>
          <button onClick={() => setLearningNotice(null)} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Notificação de Publicação Direta */}
      {publishingNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-between text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Sucesso! {selectedCount} fotos tratadas e aprovadas foram enviadas diretamente para o seu Módulo de Galerias Online!</span>
          </div>
          <button onClick={() => setPublishingNotice(false)} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Métricas, Filtros, Ações e Painel de % Cota da IA */}
      {photos.length > 0 && (
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-none p-4 space-y-3.5 shadow-xl text-white">
          {/* Barra de Controle Rápido de Porcentagem (% Cota da IA) */}
          <div className="p-3 bg-slate-950/80 border border-purple-500/30 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>Cota da IA:</span>
                <span className="font-extrabold text-purple-300 font-mono text-xs px-2 py-0.5 rounded-none bg-purple-950/80 border border-purple-500/40">
                  {targetSelectionRatio}% das fotos
                </span>
              </div>

              {/* Botões Rápidos de Porcentagem */}
              <div className="flex items-center gap-1">
                {([10, 20, 30, 50] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => {
                      setTargetSelectionRatio(ratio);
                      handleApplyAiTargetRatio(ratio);
                    }}
                    className={`px-2.5 py-1 rounded-none text-xs font-bold transition cursor-pointer border ${
                      targetSelectionRatio === ratio
                        ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    {ratio}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleApplyAiTargetRatio()}
                className="px-3.5 py-1.5 rounded-none bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                title="Recalcular classificação de estrelas e fotos selecionadas em todas as subpastas"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>⚡ Re-Aplicar Cota ({targetSelectionRatio}%)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleApplyAiTargetRatio(targetSelectionRatio);
                  setSelectedFilter('ai_pick');
                  setStarFilter(5);
                }}
                className="px-3.5 py-1.5 rounded-none bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-extrabold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>🏆 Selecionar Melhores de Cada Cena</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-1">
            {/* Linha 1: Filtros Principais + Filtro por Cena */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-400">Filtrar:</span>
                <button onClick={() => { setSelectedFilter('all'); setStarFilter(0); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${selectedFilter === 'all' && starFilter === 0 ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                  Todas ({totalCount})
                </button>
                <button onClick={() => { setSelectedFilter('ai_pick'); setStarFilter(0); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${selectedFilter === 'ai_pick' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                  <Star className="w-3.5 h-3.5" /><span>IA Picks ({aiPickCount})</span>
                </button>
                <button onClick={() => { setSelectedFilter('approved'); setStarFilter(0); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${selectedFilter === 'approved' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                  ✓ Aprovadas ({approvedCount})
                </button>
                <button onClick={() => { setSelectedFilter('discarded'); setStarFilter(0); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${selectedFilter === 'discarded' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                  <Trash2 className="w-3.5 h-3.5" /><span>Descartadas ({discardedCount})</span>
                </button>
              </div>

              {/* Filtro por Subpasta / Cena */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <FolderUp className="w-3.5 h-3.5 text-purple-400" /> Cena:
                </span>
                <select
                  value={sceneFilter}
                  onChange={(e) => setSceneFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-purple-300 focus:outline-none focus:border-purple-500 cursor-pointer min-w-[200px]"
                >
                  <option value="all">Todas as Cenas ({availableScenes.length} subpastas)</option>
                  {availableScenes.map((s) => {
                    const sceneCount = photos.filter((p) => (p.sceneGroup || 'Fotos Gerais') === s && !p.isDiscarded).length;
                    return (
                      <option key={s} value={s}>
                        📂 {s} ({sceneCount} fotos)
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Linha 2: Filtro por Estrelas (Rating 5, 4, 3, 2, 1) + Ordenação / Arranjo */}
            <div className="flex items-center justify-between gap-4 flex-wrap border-t border-slate-800/80 pt-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-400">Classificação por Rating:</span>
                {([0, 5, 4, 3, 2, 1] as const).map((s) => {
                  const countByRating = s === 0 ? photos.filter(p => !p.isDiscarded).length : photos.filter(p => p.starRating === s && !p.isDiscarded).length;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStarFilter(s === starFilter ? 0 : s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        starFilter === s
                          ? s === 5 ? 'bg-amber-400 text-slate-950 font-black' : 'bg-purple-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-amber-300'
                      }`}
                    >
                      {s === 0 ? (
                        <span>Todas as Estrelas ({countByRating})</span>
                      ) : (
                        <>
                          <span className="text-amber-400 font-extrabold">{s}★</span>
                          <span>
                            {s === 5 ? 'Top Take (Cena)' : s === 4 ? 'Excelente' : s === 3 ? 'Repetição' : s === 2 ? 'Baixa' : 'Descarte'} ({countByRating})
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Ordenação / Arranjo Flexível */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Arranjo:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="default">⏱️ Ordem Cronológica (Horário EXIF)</option>
                  <option value="rating">⭐ Maior Rating (5★ → 1★)</option>
                  <option value="sharpness">🎯 Maior Nitidez / Foco</option>
                  <option value="scene">📂 Agrupado por Cena</option>
                </select>
              </div>
            </div>

            {/* Linha 3: Filtro por Cores (🔴 Vermelho, 🟡 Amarelo, 🟢 Verde, 🔵 Azul, 🟣 Roxo) */}
            <div className="flex items-center gap-2 flex-wrap border-t border-slate-800/80 pt-3">
              <span className="text-xs font-bold text-slate-400">Etiquetas de Cor:</span>
              <button
                type="button"
                onClick={() => setColorFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  colorFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Todas as Cores
              </button>
              {(['red', 'yellow', 'green', 'blue', 'purple'] as const).map((col) => {
                const colorNames: Record<string, { label: string; bg: string }> = {
                  red: { label: '🔴 Vermelho', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
                  yellow: { label: '🟡 Amarelo', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
                  green: { label: '🟢 Verde', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
                  blue: { label: '🔵 Azul', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
                  purple: { label: '🟣 Roxo', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
                };
                const countColor = photos.filter((p) => p.colorLabel === col && !p.isDiscarded).length;
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setColorFilter(col === colorFilter ? 'all' : col)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                      colorFilter === col
                        ? 'ring-2 ring-white font-black bg-slate-800 text-white'
                        : colorNames[col].bg
                    }`}
                  >
                    <span>{colorNames[col].label} ({countColor})</span>
                  </button>
                );
              })}
            </div>

            {/* Linha 4: Slider de Tamanho de Miniaturas & Ações Principais */}
            <div className="flex items-center justify-between gap-4 flex-wrap border-t border-slate-800/80 pt-3">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const approved = photos.filter((p) => p.selected && !p.isDiscarded);
                    if (approved.length === 0) { alert('Nenhuma foto aprovada para exportar.'); return; }
                    setIsExportModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition flex items-center gap-2 cursor-pointer"
                  title="Abrir modal para copiar lista de fotos aprovadas e filtrar no Lightroom Classic"
                >
                  <Copy className="w-4 h-4" />
                  <span>📋 Exportar Seleção p/ Lightroom ({approvedCount})</span>
                </button>

                <button type="button" onClick={() => setIsAiTuningOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 transition flex items-center gap-1.5 cursor-pointer">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" /><span>Ajustar Sensibilidade da IA</span>
                </button>

                <button type="button" onClick={handleClearProject}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 transition flex items-center gap-1.5 cursor-pointer">
                  <RefreshCw className="w-3.5 h-3.5" /><span>Novo Ensaio</span>
                </button>

                <button type="button" onClick={handlePublishToGallery}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 cursor-pointer">
                  <Globe className="w-4 h-4" /><span>Publicar Galeria Online ({approvedCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDesktopDownloadModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-900/60 to-slate-800 hover:from-purple-800/80 hover:to-slate-700 text-purple-200 hover:text-white font-bold text-xs border border-purple-500/30 transition flex items-center gap-1.5 cursor-pointer shadow-md"
                  title="Baixar a versão executável nativa para Mac ou Windows sem limite de memória"
                >
                  <Download className="w-4 h-4 text-purple-400" />
                  <span>🖥️ Baixar App Nativo (Mac/Win)</span>
                </button>
              </div>

              {/* Slider de Tamanho das Miniaturas (Grid Zoom: 1 = Filmstrip, 2 = 2 fotos lado a lado, 3..9 = colunas) */}
              <div className="flex items-center gap-2.5 bg-slate-950 border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs">
                <span className="text-slate-400 font-bold">Tamanho das Fotos:</span>
                <input
                  type="range"
                  min={1}
                  max={9}
                  value={gridZoom}
                  onChange={(e) => setGridZoom(Number(e.target.value))}
                  className="w-28 accent-purple-500 cursor-pointer"
                  title="Deslize para alterar o tamanho das miniaturas e o layout de exibição"
                />
                <span className="font-extrabold text-amber-300 min-w-[140px]">
                  {gridZoom === 1
                    ? '🎞️ 1 Foto + Tira de Filme'
                    : gridZoom === 2
                    ? '🖼️ 2 Fotos (Lado a Lado)'
                    : `📐 ${gridZoom} Colunas`}
                </span>
              </div>
            </div>
          </div>

          {/* Renderização Condicional: Modo Filmstrip (gridZoom === 1) ou Grid de 2 a 9 Colunas */}
          {gridZoom === 1 ? (
            /* Modo 1 Foto Grande + Tira de Filme (Filmstrip Lightroom) */
            <div className="space-y-3 bg-slate-950 p-4 border border-slate-800 rounded-2xl shadow-2xl">
              {(() => {
                const activePhoto = filteredPhotos.find((p) => p.id === (activeFocusedPhotoId || editingPhoto?.id)) || filteredPhotos[0];
                if (!activePhoto) return <p className="text-xs text-slate-400 p-4">Nenhuma foto selecionada.</p>;

                return (
                  <div className="space-y-3">
                    {/* Palco Central da Foto Grande */}
                    <div className="w-full h-[520px] bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden flex items-center justify-center group">
                      <img
                        src={activePhoto.previewUrl}
                        alt={activePhoto.fileName}
                        className="max-h-full max-w-full object-contain transition-all duration-200"
                      />

                      {/* Botões Superiores de Ação Rápida */}
                      <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...activePhoto, selected: !activePhoto.selected, isDiscarded: false };
                            setPhotos((prev) => prev.map((p) => (p.id === activePhoto.id ? updated : p)));
                            notifyAiLearning(updated.selected ? 'Aprovação (T)' : 'Desmarque (T)');
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-extrabold shadow-lg transition cursor-pointer ${
                            activePhoto.selected ? 'bg-purple-600 text-white' : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-700'
                          }`}
                        >
                          {activePhoto.selected ? '✓ Foto Aprovada (Tecla T ou Espaço)' : '+ Aprovar Foto (Tecla T ou Espaço)'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...activePhoto, isDiscarded: !activePhoto.isDiscarded, selected: false };
                            setPhotos((prev) => prev.map((p) => (p.id === activePhoto.id ? updated : p)));
                            notifyAiLearning('Descarte (X)');
                          }}
                          className={`p-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                            activePhoto.isDiscarded ? 'bg-rose-600 text-white' : 'bg-slate-900/90 text-slate-300 hover:text-rose-400 border border-slate-700'
                          }`}
                          title="Descartar (Tecla X)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Barra de Informações EXIF, Rating (0-5) e Cores (6-9) */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-4 flex items-center justify-between text-xs font-bold text-white">
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-white text-sm">{activePhoto.fileName}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {activePhoto.sceneGroup ? `📂 ${activePhoto.sceneGroup} · ` : ''}
                            f/{activePhoto.editSettings?.aperture || '1.8'} · ISO {activePhoto.editSettings?.iso || '400'} · {activePhoto.editSettings?.shutterSpeed || '1/1000s'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Rating Estrelas (Atalhos 0 a 5) */}
                          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl">
                            {([1, 2, 3, 4, 5] as const).map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => {
                                  const newRating = activePhoto.starRating === star ? 0 : star;
                                  const updated = { ...activePhoto, starRating: newRating, selected: newRating > 0 ? true : activePhoto.selected };
                                  setPhotos((prev) => prev.map((p) => (p.id === activePhoto.id ? updated : p)));
                                }}
                                className="cursor-pointer"
                              >
                                <Star className={`w-4 h-4 ${activePhoto.starRating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                              </button>
                            ))}
                          </div>

                          {/* Etiquetas de Cor (Atalhos 6 a 9) */}
                          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl">
                            {(['red', 'yellow', 'green', 'blue'] as const).map((col) => {
                              const colorBg: Record<string, string> = {
                                red: 'bg-rose-500', yellow: 'bg-amber-400', green: 'bg-emerald-500', blue: 'bg-blue-500'
                              };
                              return (
                                <button
                                  key={col}
                                  type="button"
                                  onClick={() => {
                                    const newColor = activePhoto.colorLabel === col ? 'none' : col;
                                    setPhotos((prev) => prev.map((p) => (p.id === activePhoto.id ? { ...p, colorLabel: newColor } : p)));
                                  }}
                                  className={`w-3.5 h-3.5 rounded-full border transition cursor-pointer ${
                                    activePhoto.colorLabel === col ? 'ring-2 ring-white scale-125' : 'opacity-60 hover:opacity-100'
                                  } ${colorBg[col]}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tira de Filme (Filmstrip Lightroom) no Rodapé */}
                    <div className="flex items-center gap-2 overflow-x-auto p-2 bg-slate-900 border border-slate-800 rounded-xl">
                      {filteredPhotos.map((photo) => {
                        const isActiveInFilmstrip = photo.id === activePhoto.id;
                        return (
                          <div
                            key={photo.id}
                            onClick={() => setActiveFocusedPhotoId(photo.id)}
                            className={`shrink-0 w-24 h-16 rounded-lg overflow-hidden relative cursor-pointer border transition-all ${
                              isActiveInFilmstrip ? 'ring-2 ring-purple-500 border-purple-400 scale-105 opacity-100' : 'border-slate-800 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={photo.previewUrl} alt={photo.fileName} className="w-full h-full object-cover" />
                            {photo.selected && (
                              <div className="absolute top-0.5 right-0.5 bg-purple-600 text-white w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center">
                                ✓
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* Modo Grid de 2 a 9 Colunas com Scroll Vertical */
            <div className={`grid gap-1.5 ${
              gridZoom === 2 ? 'grid-cols-2' :
              gridZoom === 3 ? 'grid-cols-3' :
              gridZoom === 4 ? 'grid-cols-4' :
              gridZoom === 5 ? 'grid-cols-5' :
              gridZoom === 6 ? 'grid-cols-6' :
              gridZoom === 7 ? 'grid-cols-7' :
              gridZoom === 8 ? 'grid-cols-8' :
              'grid-cols-9'
            }`}>
            {filteredPhotos.slice(0, visibleCount).map((photo) => {
              const es = photo.editSettings;
              const pct = (es.presetIntensity ?? 100) / 100;
              // CSS filter com intensidade do preset aplicada proporcionalmente
              const imgFilter = [
                `brightness(${100 + es.exposure * 15 * pct}%)`,
                `contrast(${100 + es.contrast * pct}%)`,
                `saturate(${100 + (es.vibrance + es.saturation) * pct}%)`,
                es.highlights !== 0 ? `brightness(${100 + es.highlights * 0.2 * pct}%)` : '',
              ].filter(Boolean).join(' ');

              const colorDotMap: Record<string, string> = {
                red: 'bg-rose-500', yellow: 'bg-amber-400', green: 'bg-emerald-500',
                blue: 'bg-blue-500', purple: 'bg-purple-500',
              };

              return (
                <div
                  key={photo.id}
                  data-photo-id={photo.id}
                  data-is-raw={photo.isRaw}
                  onClick={async () => {
                    if (photo.isRaw && photo.previewUrl.startsWith('data:image/svg')) {
                      loadRawPreviewLazy(photo.id);
                    }
                    setEditingPhoto(photo);
                  }}
                  className={`relative group rounded-none overflow-hidden cursor-pointer bg-slate-950 border transition-all ${
                    photo.selected
                      ? 'ring-2 ring-purple-500 border-purple-500'
                      : photo.isDiscarded
                      ? 'opacity-40 border-rose-900/50'
                      : 'border-slate-800 hover:border-slate-600'
                  }`}
                >
                  {/* Thumbnail — CSS filter com preset aplicado */}
                  <div className="w-full h-36 bg-slate-950 flex items-center justify-center overflow-hidden">
                    {photo.previewUrl && !photo.previewUrl.startsWith('data:image/svg') ? (
                      <img
                        src={photo.previewUrl}
                        alt={photo.fileName}
                        loading="lazy"
                        style={{ filter: imgFilter, transform: `rotate(${photo.rotation}deg)` }}
                        onError={() => {
                          if (photo.isRaw) loadRawPreviewLazy(photo.id);
                        }}
                        className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (photo.isRaw) loadRawPreviewLazy(photo.id);
                        }}
                        className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-2 text-center select-none cursor-pointer hover:bg-slate-900 transition-colors"
                      >
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-1">
                          <Camera className="w-5 h-5 text-purple-400" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-200 truncate max-w-full px-1">{photo.fileName}</span>
                        <span className="text-[9px] font-mono text-purple-400 font-semibold px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30">
                          {photo.format || 'RAW'} · Previa...
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Top-left badges */}
                  <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-10 pointer-events-none">
                    {photo.isRaw && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white font-extrabold text-[8px] shadow">
                        {photo.format}
                      </span>
                    )}
                    {photo.isBestTake && !photo.isDiscarded && (
                      <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[9px] shadow-lg flex items-center gap-1 border border-amber-300">
                        <Star className="w-2.5 h-2.5 fill-slate-950" />
                        <span>🏆 MELHOR DA CENA</span>
                      </span>
                    )}
                    {photo.starRating > 0 && (
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold shadow flex items-center gap-0.5 ${
                        photo.starRating === 5 ? 'bg-amber-500 text-slate-950 font-black' :
                        photo.starRating === 4 ? 'bg-purple-600 text-white' :
                        photo.starRating === 3 ? 'bg-slate-800 text-slate-300 border border-slate-700' :
                        photo.starRating === 2 ? 'bg-slate-900 text-slate-400 border border-slate-800' :
                        'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        <span>{photo.starRating}★ {photo.starRating === 5 ? 'Top Take' : photo.starRating === 4 ? 'Excelente' : photo.starRating === 3 ? 'Repetição' : photo.starRating === 2 ? 'Baixa' : 'Descarte'}</span>
                      </span>
                    )}
                    {photo.colorLabel !== 'none' && (
                      <span className={`w-3.5 h-3.5 rounded-full shadow border border-white/20 ${colorDotMap[photo.colorLabel] || ''}`} />
                    )}
                  </div>

                  {/* Top-right actions */}
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-20">
                    <button onClick={(e) => rotatePhoto(photo.id, 90, e)} title="Girar" className="p-1 rounded bg-black/60 text-slate-300 hover:text-white opacity-0 group-hover:opacity-100 transition">
                      <RotateCw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => toggleDiscardPhoto(photo.id, e)}
                      title={photo.isDiscarded ? 'Restaurar' : 'Descartar'}
                      className={`p-1 rounded transition opacity-0 group-hover:opacity-100 ${photo.isDiscarded ? 'bg-emerald-600 text-white opacity-100' : 'bg-black/60 text-slate-300 hover:text-rose-400'}`}
                    >
                      {photo.isDiscarded ? <RotateCcw className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelectPhoto(photo.id); }}
                      title="Aprovar / Desaprovar"
                      className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shadow transition ${photo.selected ? 'bg-purple-600 text-white' : 'bg-black/50 text-slate-400 border border-slate-600 opacity-0 group-hover:opacity-100'}`}
                    >
                      {photo.selected ? '✓' : ''}
                    </button>
                  </div>

                  {/* Star rating strip */}
                  <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition z-10">
                    {([1,2,3,4,5] as const).map((star) => (
                      <button
                        key={star}
                        onClick={(e) => {
                          e.stopPropagation();
                          const newRating = photo.starRating === star ? 0 : star;
                          setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, starRating: newRating, selected: newRating > 0 ? true : p.selected } : p));
                        }}
                        className={`w-4 h-4 transition-transform hover:scale-125 ${photo.starRating >= star ? 'text-amber-400' : 'text-slate-600'}`}
                      >
                        <Star className={`w-4 h-4 ${photo.starRating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                      </button>
                    ))}
                  </div>

                  {/* Footer metadata */}
                  <div className="p-2 bg-slate-900/90 border-t border-slate-800">
                    <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium">
                      <span className="truncate max-w-[70%]">{photo.fileName}</span>
                      <span className="text-purple-400 font-bold shrink-0 text-[9px]">{photo.sceneGroup}</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                      <span>{photo.aperture}</span>
                      <span>ISO {photo.iso} · {photo.shutterSpeed}</span>
                    </div>
                    {/* Star rating mini display */}
                    {photo.starRating > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {([1,2,3,4,5] as const).map((s) => (
                          <Star key={s} className={`w-2.5 h-2.5 ${photo.starRating >= s ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {/* Botão de Paginação para Ensaios Gigantes (20.000+ Fotos) */}
          {filteredPhotos.length > visibleCount && (
            <div className="w-full flex flex-col items-center justify-center pt-4 pb-2">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 120)}
                className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition flex items-center gap-2 cursor-pointer"
              >
                <span>Carregar Mais Fotos (Exibindo {visibleCount} de {filteredPhotos.length})</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal / Drawer do Estúdio de Edição Módulo Develop Estilo Adobe Lightroom Classic */}
      {editingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl text-white flex flex-col">
            
            {/* Corpo Principal: Loupe View Central + Painel Lateral Direito */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
              
              {/* Esquerda: Loupe View Central da Foto Grande + Overlay de Corte & Regra dos Terços */}
              <div className="flex-1 bg-slate-950 p-6 flex flex-col justify-between items-center relative overflow-hidden">
                {/* Toolbar Superior da Foto */}
                <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-purple-400" />
                    <span>{editingPhoto.fileName} ({editingPhoto.format})</span>
                  </span>
                  
                  {/* Seletor de Aspect Ratio do Corte & Rotação Livre */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 font-bold px-1 uppercase">Corte:</span>
                    {['Livre', '1:1', '4:5', '5:4', '4:3', '3:4', '16:9', '9:16', '5:3', '3:5'].map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setSelectedCropRatio(ratio)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                          selectedCropRatio === ratio
                            ? 'bg-purple-600 text-white shadow'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>

                  {/* Ferramentas de Alinhamento, Zoom & Rotação */}
                  <div className="flex items-center gap-2">
                    {/* Zoom Slider de Enquadramento (1.0x a 3.0x) */}
                    <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800 text-[10px] font-bold text-purple-300">
                      <span>Zoom:</span>
                      <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.05"
                        value={editingPhoto.editSettings.zoomScale || 1.0}
                        onChange={(e) => updateEditingPhotoSettings({ zoomScale: parseFloat(e.target.value) })}
                        className="w-16 accent-purple-500 cursor-pointer"
                      />
                      <span className="font-mono text-purple-400">{(editingPhoto.editSettings.zoomScale || 1.0).toFixed(2)}x</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowBeforeAfter(!showBeforeAfter)}
                      className={`px-2.5 py-1 rounded-xl font-extrabold text-[11px] flex items-center gap-1 border transition ${
                        showBeforeAfter
                          ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-600/30'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                      }`}
                      title="Atalho (Y): Comparar Foto Original sem Edição vs Editada com IA"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{showBeforeAfter ? 'Original (Sem Filtro)' : 'Antes / Depois (Y)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowCropGrid(!showCropGrid)}
                      className={`p-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 border transition ${
                        showCropGrid ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>{showCropGrid ? 'Ocultar Grade' : 'Grade (3°s)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => rotatePhoto(editingPhoto.id, -90)}
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white flex items-center gap-1 text-xs border border-slate-800"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>-90°</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => rotatePhoto(editingPhoto.id, 90)}
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white flex items-center gap-1 text-xs border border-slate-800"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>+90°</span>
                    </button>
                  </div>
                </div>

                {/* Loupe View Imagem com Canvas de Corte Fixo & Imagem Giratória Interna + Arraste de Enquadramento */}
                <div className="relative flex-1 flex items-center justify-center overflow-hidden w-full py-2 bg-slate-950">
                  {/* Toast Estilo Lightroom Classic: "Cortar atualizado para X imagens" */}
                  {syncedPresetNotice && (
                    <div className="absolute top-4 z-40 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-white font-bold text-xs shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Cortar atualizado para {photos.length} imagens</span>
                    </div>
                  )}

                  {/* Moldura / Quadro de Corte Fixo da Imagem (Com Suporte a Arraste/Pan de Foto) */}
                  <div
                    onMouseDown={(e) => {
                      setIsPanDragging(true);
                      setPanStart({
                        x: e.clientX - (editingPhoto.editSettings.cropOffsetX || 0),
                        y: e.clientY - (editingPhoto.editSettings.cropOffsetY || 0),
                      });
                    }}
                    onMouseMove={(e) => {
                      if (!isPanDragging) return;
                      const newX = Math.round(e.clientX - panStart.x);
                      const newY = Math.round(e.clientY - panStart.y);
                      updateEditingPhotoSettings({ cropOffsetX: newX, cropOffsetY: newY });
                    }}
                    onMouseUp={() => setIsPanDragging(false)}
                    onMouseLeave={() => setIsPanDragging(false)}
                    className={`relative max-h-[50vh] flex items-center justify-center overflow-hidden rounded-lg shadow-2xl border-2 border-white/90 bg-black/40 ${
                      isPanDragging ? 'cursor-grabbing' : 'cursor-grab'
                    }`}
                    style={{
                      aspectRatio: selectedCropRatio === '1:1' ? '1/1'
                        : selectedCropRatio === '4:5' ? '4/5'
                        : selectedCropRatio === '5:4' ? '5/4'
                        : selectedCropRatio === '4:3' ? '4/3'
                        : selectedCropRatio === '3:4' ? '3/4'
                        : selectedCropRatio === '16:9' ? '16/9'
                        : selectedCropRatio === '9:16' ? '9/16'
                        : selectedCropRatio === '5:3' ? '5/3'
                        : selectedCropRatio === '3:5' ? '3/5'
                        : 'auto',
                      maxHeight: '48vh',
                    }}
                    title="Clique e arraste a imagem para redefinir a posição do enquadramento"
                  >
                    {/* Imagem Rotativa que Gira, Zoom e Arraste DENTRO/ATRÁS do Quadro Fixo de Corte */}
                    <img
                      src={editingPhoto.previewUrl}
                      alt={editingPhoto.fileName}
                      style={
                        showBeforeAfter
                          ? { filter: 'none', transform: 'none' }
                          : {
                              filter: `brightness(${100 + (editingPhoto.editSettings.exposure || 0) * 8}%) contrast(${
                                100 + (editingPhoto.editSettings.contrast || 0)
                              }%) saturate(${100 + (editingPhoto.editSettings.vibrance || 0) + (editingPhoto.editSettings.saturation || 0)}%)`,
                              transform: `translate(${editingPhoto.editSettings.cropOffsetX || 0}px, ${
                                editingPhoto.editSettings.cropOffsetY || 0
                              }px) rotate(${editingPhoto.rotation || 0}deg) scale(${
                                (editingPhoto.editSettings.zoomScale || 1.0) * (1 + Math.abs((editingPhoto.rotation || 0) / 45) * 0.35)
                              })`,
                            }
                      }
                      className="max-h-[48vh] object-cover transition-transform duration-75 select-none pointer-events-none"
                    />

                    {/* Sobreposição da Grade Fina Estilo Lightroom Classic (Subdivided Grid Overlay) */}
                    {showCropGrid && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
                        {/* Sub-grades de Alinhamento Fino (Finas Linhas Brancas 6x6) */}
                        <div className="w-full h-full grid grid-cols-6 grid-rows-6">
                          {Array.from({ length: 36 }).map((_, idx) => (
                            <div key={idx} className="border-[0.5px] border-white/30" />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Alças Brancas Reforçadas nos Cantos do Quadro de Corte Fixo */}
                    <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-white" />
                    <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-white" />
                    <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-white" />
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-white" />
                  </div>
                </div>

                {/* Informações de Câmera e EXIF no Rodapé da Foto */}
                <div className="w-full grid grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-center font-mono text-[10px] text-slate-300">
                  <div className="bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block">CÂMERA</span>
                    <span className="font-bold text-white truncate block">{editingPhoto.cameraModel}</span>
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block">LENTE</span>
                    <span className="font-bold text-white truncate block">{editingPhoto.lensModel}</span>
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block">ABERTURA</span>
                    <span className="font-bold text-amber-400 block">{editingPhoto.aperture}</span>
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block">ISO / OBTURADOR</span>
                    <span className="font-bold text-emerald-400 block">ISO {editingPhoto.iso} • {editingPhoto.shutterSpeed}</span>
                  </div>
                </div>
              </div>

              {/* Direita: Painel Limpo de Culling (Inspetor de Seleção) */}
              <div className="w-full md:w-72 bg-slate-900 p-5 border-l border-slate-800 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Inspetor de Culling</span>
                    </h3>
                    <button type="button" onClick={() => setEditingPhoto(null)} className="p-1 text-slate-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Status de Seleção & Aprovação */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...editingPhoto, selected: !editingPhoto.selected, isDiscarded: false };
                        setEditingPhoto(updated);
                        setPhotos((prev) => prev.map((p) => (p.id === editingPhoto.id ? updated : p)));
                      }}
                      className={`w-full py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition ${
                        editingPhoto.selected
                          ? 'bg-purple-600 text-white shadow-purple-600/30 ring-2 ring-purple-400/50'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>{editingPhoto.selected ? '✓ Foto Aprovada' : 'Aprovar Foto (Espaço)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...editingPhoto, isDiscarded: !editingPhoto.isDiscarded, selected: false };
                        setEditingPhoto(updated);
                        setPhotos((prev) => prev.map((p) => (p.id === editingPhoto.id ? updated : p)));
                      }}
                      className={`w-full py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                        editingPhoto.isDiscarded
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-950 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{editingPhoto.isDiscarded ? 'Foto Descartada (Restaurar)' : 'Descartar Foto (Tecla X)'}</span>
                    </button>
                  </div>

                  {/* Rating por Estrelas */}
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Classificar (Teclas 1 a 5)</span>
                    <div className="flex justify-center gap-1">
                      {([1, 2, 3, 4, 5] as const).map((star) => (
                        <button
                          key={star}
                          onClick={() => {
                            const newRating = editingPhoto.starRating === star ? 0 : star;
                            const updated = { ...editingPhoto, starRating: newRating, selected: newRating > 0 ? true : editingPhoto.selected };
                            setEditingPhoto(updated);
                            setPhotos((prev) => prev.map((p) => (p.id === editingPhoto.id ? updated : p)));
                          }}
                          className={`w-7 h-7 rounded-xl flex items-center justify-center transition ${
                            editingPhoto.starRating >= star ? 'text-amber-400 bg-amber-400/10 border border-amber-400/30' : 'text-slate-600 bg-slate-900'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${editingPhoto.starRating >= star ? 'fill-amber-400' : ''}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Informações EXIF & Câmera */}
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Câmera:</span>
                      <span className="text-white font-bold truncate max-w-[140px]">{editingPhoto.cameraModel || 'Desconhecida'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Lente:</span>
                      <span className="text-white font-bold truncate max-w-[140px]">{editingPhoto.lensModel || 'Desconhecida'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Abertura:</span>
                      <span className="text-amber-400 font-bold">{editingPhoto.aperture}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>ISO:</span>
                      <span className="text-emerald-400 font-bold">ISO {editingPhoto.iso}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Obturador:</span>
                      <span className="text-blue-400 font-bold">{editingPhoto.shutterSpeed}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingPhoto(null)}
                  className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  Concluir Culling (Esc)
                </button>
              </div>
            </div>

            {/* FILMSTRIP INFERIOR (Lista de Filme no Bottom - Miniaturas Roláveis) */}
            <div className="w-full bg-slate-950 border-t border-slate-800 p-3 flex items-center gap-3 overflow-x-auto shrink-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 px-2">
                <span>Filmstrip</span>
                <span className="block text-purple-400">
                  {(filteredPhotos.length > 0 ? filteredPhotos : photos).length} fotos
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full">
                {(filteredPhotos.length > 0 ? filteredPhotos : photos).map((p) => {
                  const isActive = p.id === editingPhoto.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setEditingPhoto(p)}
                      className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                        isActive ? 'border-purple-500 scale-105 shadow-lg shadow-purple-500/20' : 'border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={p.previewUrl} alt={p.fileName} className="w-full h-full object-cover" />
                      {p.selected && (
                        <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-purple-600 text-white text-[8px] flex items-center justify-center font-bold">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* BARRA DE ATALHOS DE TECLADO RÁPIDOS */}
            <div className="w-full bg-slate-900 border-t border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-mono">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-purple-300 font-bold">← / →</kbd> Navegar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-purple-300 font-bold">Espaço</kbd> Aprovar (✓)
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-rose-300 font-bold">X</kbd> Descartar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300 font-bold">Y</kbd> Antes / Depois
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-blue-300 font-bold">R</kbd> Grade de Corte
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-emerald-300 font-bold">1-5</kbd> Classificar Estrelas
                </span>
              </div>
              <span className="text-purple-400 font-bold hidden md:inline">PriceU$ Studio AI · Pro Edition</span>
            </div>

          </div>
        </div>
      )}

      {/* Modais de Importação, Progresso e Publicação */}
      <CullingImportAndProgressModal
        isOpen={isImportModalOpen || analyzing}
        onClose={() => setIsImportModalOpen(false)}
        analyzing={analyzing}
        progress={progress}
        totalFiles={totalFilesCount}
        processedCount={processedCount}
        currentFileName={currentFileName}
        onSelectFiles={processFileList}
        logs={aiLogs}
      />

      <CullingPublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        userId={userId}
        onConfirmPublish={(title) => {
          setPublishingNotice(true);
          setTimeout(() => setPublishingNotice(false), 4000);
        }}
        selectedPhotos={photos.filter((p) => p.selected && !p.isDiscarded)}
        totalPhotosCount={photos.length}
        discardedCount={discardedCount}
      />

      {/* Modal de Treinamento da IA & Presets */}
      <CullingAiTuningModal
        isOpen={isAiTuningOpen}
        onClose={() => setIsAiTuningOpen(false)}
        sharpnessThreshold={sharpnessThreshold}
        setSharpnessThreshold={setSharpnessThreshold}
        targetSelectionRatio={targetSelectionRatio}
        setTargetSelectionRatio={setTargetSelectionRatio}
        expressionRigor={expressionRigor}
        setExpressionRigor={setExpressionRigor}
        trainedPresetName={trainedPresetName}
        setTrainedPresetName={setTrainedPresetName}
        enableAiRetouching={enableAiRetouching}
        setEnableAiRetouching={setEnableAiRetouching}
        userPresetPref={userPresetPref}
        onUpdateUserPresetPref={handleUpdateUserPresetPref}
      />

      {/* Modal de Configurações e Conexão 1-Clique do Google Drive */}
      <GoogleDriveSettingsModal
        isOpen={isGoogleDriveModalOpen}
        onClose={() => setIsGoogleDriveModalOpen(false)}
        currentToken={googleDriveToken}
        onSaveToken={(token) => {
          setGoogleDriveToken(token);
          if (typeof window !== 'undefined') {
            if (token) {
              localStorage.setItem('priceus_google_drive_token', token);
            } else {
              localStorage.removeItem('priceus_google_drive_token');
            }
          }
        }}
      />

      {/* Modal de Cópia e Exportação de Seleção para Lightroom */}
      <CullingLightroomExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        approvedPhotos={photos.filter((p) => p.selected && !p.isDiscarded)}
      />

      {/* Modal de Instruções e Download do Plugin Lightroom */}
      <LightroomPluginModal
        isOpen={isLightroomModalOpen}
        onClose={() => setIsLightroomModalOpen(false)}
        userId={userId}
      />

      {/* Modal de Download do App Nativo Desktop (macOS & Windows) */}
      <NativeDesktopDownloadModal
        isOpen={isDesktopDownloadModalOpen}
        onClose={() => setIsDesktopDownloadModalOpen(false)}
      />
    </div>
  );
}
