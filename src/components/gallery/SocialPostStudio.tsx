import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Download,
  Copy,
  Check,
  Instagram,
  Wand2,
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Layers,
  RefreshCw,
  LayoutGrid,
  Sun,
  Moon,
  RotateCcw,
  X,
  Plus,
  Trash2,
  Type,
  Palette,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Image as ImageIcon,
  Archive,
  BookmarkCheck,
  Edit3,
  Send,
  Calendar,
} from 'lucide-react';
import type { CullingPhoto } from './AICullingManager';
import {
  generateCuratedPosts,
  getCleanPhotoPool,
  generateSmartCaptions,
  generateArtCopyOptions,
  ArtCopyPreset,
  SuggestedPost,
  PostSlide,
  SmartCaption,
} from '../../services/aiCullingEngine';
import {
  fetchConnectedInstagramAccounts,
  publishSinglePhotoToInstagram,
  publishCarouselToInstagram,
  publishStoryToInstagram,
  uploadSlideBlobToPublicUrl,
  InstagramAccountInfo,
} from '../../services/instagramPublishService';
import { InstagramConnectionModal } from '../instagram/InstagramConnectionModal';

export interface ApprovedPostItem {
  id: string;
  createdAt: string;
  title: string;
  format: 'feed' | 'story';
  slides: PostSlide[];
  caption: string;
  hashtags: string[];
  coverPreviewUrl: string;
  status: 'ready' | 'published';
  publishedAt?: string;
  instagramPostId?: string;
}

interface SocialPostStudioProps {
  photos: CullingPhoto[];
  projectTitle?: string;
}

export function getCandidateImageUrls(primaryUrl?: string | null): string[] {
  if (!primaryUrl) return [];
  const urls: string[] = [];

  const addUrl = (u?: string | null) => {
    if (u && !urls.includes(u)) urls.push(u);
  };

  addUrl(primaryUrl);

  // Extrair ID do Google Drive se existir na URL
  let driveId: string | null = null;
  if (primaryUrl.includes('googleusercontent.com/d/')) {
    driveId = primaryUrl.split('/d/')[1]?.split('=')[0]?.split('?')[0] || null;
  } else if (primaryUrl.includes('drive.google.com') || primaryUrl.includes('docs.google.com')) {
    const match = primaryUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) driveId = match[1];
  }

  if (driveId) {
    addUrl(`https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`);
    addUrl(`https://drive.google.com/thumbnail?id=${driveId}&sz=w800`);
    addUrl(`https://lh3.googleusercontent.com/d/${driveId}=w1200`);
    addUrl(`https://lh3.googleusercontent.com/d/${driveId}=w800`);
    addUrl(`https://drive.google.com/uc?export=view&id=${driveId}`);
    addUrl(`https://docs.google.com/uc?id=${driveId}`);
  }

  return urls;
}

export function StudioImage({
  src,
  alt = 'Foto',
  className = 'w-full h-full object-cover',
  loading = 'lazy',
}: {
  src?: string;
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}) {
  const candidateUrls = React.useMemo(() => getCandidateImageUrls(src), [src]);
  const [index, setIndex] = React.useState(0);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setIndex(0);
    setHasError(false);
  }, [src]);

  const currentUrl = candidateUrls[index];

  if (!currentUrl || hasError) {
    return (
      <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-slate-500 text-xs p-2 text-center">
        <ImageIcon className="w-6 h-6 mb-1 opacity-50 text-purple-400" />
        <span className="truncate max-w-full text-[10px]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={currentUrl}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => {
        if (index + 1 < candidateUrls.length) {
          setIndex((prev) => prev + 1);
        } else {
          setHasError(true);
        }
      }}
    />
  );
}

export interface ArtOverlayConfig {
  enabled: boolean;
  headline: string;
  subtitle: string;
  cta: string;
  fontFamily: 'serif' | 'sans' | 'script';
  textColor: string;
  textPosition: 'top' | 'center' | 'bottom';
  textAlign: 'center' | 'left';
  overlayOpacity: number; // 0 a 80
}

export interface PostSlide {
  type: 'single' | 'grid_6' | 'grid_9';
  photoIds: string[];
  bgTheme?: 'white' | 'black';
  hasWhiteBorder?: boolean;
  artOverlay?: ArtOverlayConfig;
}

export interface CaptionOption {
  id: string;
  title: string;
  tone: 'emotional' | 'technical' | 'minimal' | 'storytelling' | 'sales';
  text: string;
  approved?: boolean;
  rejected?: boolean;
}

export interface SuggestedPost {
  id: string;
  title: string;
  badgeText: string;
  predictedEngagement: number; // 0-100%
  description: string;
  slides: PostSlide[];
  approved?: boolean;
  rejected?: boolean;
  captions: CaptionOption[];
}

export function SocialPostStudio({ photos, projectTitle }: SocialPostStudioProps) {
  const [dislikedPhotoIds, setDislikedPhotoIds] = useState<string[]>([]);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Modal de escolha manual de foto
  const [selectingPhotoId, setSelectingPhotoId] = useState<string | null>(null);
  const [modalPhotoSearch, setModalPhotoSearch] = useState('');

  const pool = getCleanPhotoPool(photos, dislikedPhotoIds);

  const [prefBg, setPrefBg] = useState<'white' | 'black'>('white');
  const [allowGrids, setAllowGrids] = useState(true);
  const [rejectionOffsets, setRejectionOffsets] = useState<Record<number, number>>({});

  // Posts Sugeridos pela IA
  const [posts, setPosts] = useState<SuggestedPost[]>([]);
  const [activePostIndex, setActivePostIndex] = useState(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [activeCaptionIndex, setActiveCaptionIndex] = useState(0);

  // Palavras-chave para IA
  const [captionKeywords, setCaptionKeywords] = useState('');
  const [generatingGroq, setGeneratingGroq] = useState(false);
  const [generatingArtCopies, setGeneratingArtCopies] = useState(false);
  const [artPresets, setArtPresets] = useState<ArtCopyPreset[]>([]);
  const [copied, setCopied] = useState(false);

  // Formato do Post: Feed (4:5) vs Story (9:16)
  const [postFormat, setPostFormat] = useState<'feed' | 'story'>('feed');

  // Instagram Connection & Direct Publish Flow
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showInstagramPublishModal, setShowInstagramPublishModal] = useState(false);
  const [isPublishingInstagram, setIsPublishingInstagram] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState<InstagramAccountInfo | null>(null);
  const [publishSuccessUrl, setPublishSuccessUrl] = useState<string | null>(null);

  // Drawer de Edição de Arte do Slide
  const [showArtDrawer, setShowArtDrawer] = useState(false);

  // Modo de Visualização: Estúdio de Criação vs Estoque de Posts Aprovados
  const [activeViewMode, setActiveViewMode] = useState<'studio' | 'vault'>('studio');
  const [vaultFilter, setVaultFilter] = useState<'all' | 'feed' | 'story' | 'ready' | 'published'>('all');
  const [approvedVault, setApprovedVault] = useState<ApprovedPostItem[]>(() => {
    try {
      const saved = localStorage.getItem(`priceus_approved_posts_${projectTitle || 'default'}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const updateApprovedVault = (newVault: ApprovedPostItem[]) => {
    setApprovedVault(newVault);
    try {
      localStorage.setItem(`priceus_approved_posts_${projectTitle || 'default'}`, JSON.stringify(newVault));
    } catch (e) {
      console.warn('Erro ao salvar estoque no localStorage:', e);
    }
  };

  // Canvas invisível para download em alta resolução
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initializedPhotosCountRef = useRef<number>(0);
  const swapHistoryRef = useRef<string[]>([]);

  // Checar conexão salva do Instagram ao iniciar
  const checkInstagramStatus = async () => {
    try {
      const token = localStorage.getItem('priceus_instagram_token') || import.meta.env.VITE_INSTAGRAM_ACCESS_TOKEN;
      if (token) {
        const accounts = await fetchConnectedInstagramAccounts(token);
        if (accounts.length > 0) {
          setConnectedAccount(accounts[0]);
        }
      }
    } catch {
      setConnectedAccount(null);
    }
  };

  useEffect(() => {
    checkInstagramStatus();
  }, []);

  useEffect(() => {
    if (photos.length === 0) return;
    const shouldReinit =
      initializedPhotosCountRef.current !== photos.length || Object.keys(rejectionOffsets).length > 0;
    if (shouldReinit) {
      const curated = generateCuratedPosts(photos, prefBg, allowGrids, rejectionOffsets);
      setPosts(curated);
      setActiveCaptionIndex(0);
      initializedPhotosCountRef.current = photos.length;
    }
  }, [photos.length, prefBg, allowGrids, rejectionOffsets]);

  const currentPost = posts[activePostIndex] || posts[0];
  const currentSlide = currentPost?.slides[activeSlideIndex] || currentPost?.slides[0];
  const currentCaption = currentPost?.captions[activeCaptionIndex] || currentPost?.captions[0];

  const getPhotoById = (id: string): CullingPhoto | undefined => {
    return photos.find((p) => p.id === id) || pool.find((p) => p.id === id);
  };

  // ➕ Adicionar Foto Solo ao Post (até 20 fotos no feed)
  const handleAddSingleSlide = () => {
    if (!currentPost) return;
    if (currentPost.slides.length >= 20) {
      alert('O Instagram permite no máximo 20 fotos por post no carrossel.');
      return;
    }

    const currentUsedIds = new Set(currentPost.slides.flatMap((s) => s.photoIds));
    const nextPhoto =
      photos.find((p) => !p.isDiscarded && !currentUsedIds.has(p.id)) ||
      photos.find((p) => !p.isDiscarded) ||
      photos[0];

    if (!nextPhoto) return;

    const newSlide: PostSlide = {
      type: 'single',
      photoIds: [nextPhoto.id],
      bgTheme: 'white',
    };

    setPosts((prev) =>
      prev.map((p, idx) => {
        if (idx !== activePostIndex) return p;
        return {
          ...p,
          slides: [...p.slides, newSlide],
        };
      })
    );

    setActiveSlideIndex(currentPost.slides.length);
    setFeedbackToast('📸 Nova foto adicionada ao carrossel!');
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  // ➕ Adicionar Grade (Grid) ao Post (6 ou 9 fotos)
  const handleAddGridSlide = (type: 'grid_6' | 'grid_9', hasWhiteBorder = false) => {
    if (!currentPost) return;
    if (currentPost.slides.length >= 20) {
      alert('O Instagram permite no máximo 20 lâminas por carrossel.');
      return;
    }

    const count = type === 'grid_6' ? 6 : 9;
    const currentUsedIds = new Set(currentPost.slides.flatMap((s) => s.photoIds));
    let candidates = photos.filter((p) => !p.isDiscarded && !currentUsedIds.has(p.id));

    if (candidates.length < count) {
      candidates = photos.filter((p) => !p.isDiscarded);
    }

    const selectedIds = candidates.slice(0, count).map((p) => p.id);

    const newSlide: PostSlide = {
      type,
      photoIds: selectedIds,
      bgTheme: hasWhiteBorder ? 'white' : 'white',
      hasWhiteBorder,
    };

    setPosts((prev) =>
      prev.map((p, idx) => {
        if (idx !== activePostIndex) return p;
        return {
          ...p,
          slides: [...p.slides, newSlide],
        };
      })
    );

    setActiveSlideIndex(currentPost.slides.length);
    setFeedbackToast(`🖼️ Grade de ${count} fotos adicionada!`);
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  // 🗑️ Remover Slide do Post
  const handleRemoveSlide = (slideIndexToRemove: number) => {
    if (!currentPost || currentPost.slides.length <= 1) {
      alert('O post precisa ter pelo menos 1 foto.');
      return;
    }

    setPosts((prev) =>
      prev.map((p, idx) => {
        if (idx !== activePostIndex) return p;
        const newSlides = p.slides.filter((_, sIdx) => sIdx !== slideIndexToRemove);
        return {
          ...p,
          slides: newSlides,
        };
      })
    );

    if (activeSlideIndex >= currentPost.slides.length - 1) {
      setActiveSlideIndex(Math.max(0, currentPost.slides.length - 2));
    }
  };

  // ✨ Atualizar Arte / Tipografia do Slide Ativo
  const handleUpdateArtOverlay = (updates: Partial<ArtOverlayConfig>) => {
    if (!currentPost) return;

    setPosts((prev) =>
      prev.map((p, pIdx) => {
        if (pIdx !== activePostIndex) return p;
        return {
          ...p,
          slides: p.slides.map((s, sIdx) => {
            if (sIdx !== activeSlideIndex) return s;
            const currentArt: ArtOverlayConfig = s.artOverlay || {
              enabled: true,
              headline: 'AGENDA 2026 ABERTA',
              subtitle: 'Garanta a cobertura inesquecível do seu casamento.',
              cta: '🔗 LINK NA BIO',
              fontFamily: 'serif',
              textColor: '#ffffff',
              textPosition: 'center',
              textAlign: 'center',
              overlayOpacity: 45,
            };
            return {
              ...s,
              artOverlay: {
                ...currentArt,
                ...updates,
              },
            };
          }),
        };
      })
    );
  };

  // 🤖 Gerar Textos de Arte com IA (Groq / Gemini)
  const handleGenerateArtCopiesWithAI = async () => {
    setGeneratingArtCopies(true);
    try {
      const copies = await generateArtCopyOptions(projectTitle || '', captionKeywords);
      setArtPresets(copies);
      if (copies.length > 0) {
        handleUpdateArtOverlay({
          enabled: true,
          headline: copies[0].headline,
          subtitle: copies[0].subtitle,
          cta: copies[0].cta,
        });
      }
      setFeedbackToast('✨ Textos de alta conversão gerados pela IA!');
      setTimeout(() => setFeedbackToast(null), 3000);
    } catch {
      //
    } finally {
      setGeneratingArtCopies(false);
    }
  };

  // Efetua a troca de foto no slide
  const executePhotoSwap = (oldPhotoId: string, newPhotoId: string) => {
    setPosts((prev) =>
      prev.map((post, pIdx) => {
        if (pIdx !== activePostIndex) return post;
        return {
          ...post,
          slides: post.slides.map((slide, sIdx) => {
            if (sIdx !== activeSlideIndex) return slide;
            return {
              ...slide,
              photoIds: slide.photoIds.map((id) => (id === oldPhotoId ? newPhotoId : id)),
            };
          }),
        };
      })
    );
    setSelectingPhotoId(null);
    setFeedbackToast('✨ Foto substituída com sucesso!');
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  // Substituição Automática com IA (Garante rotação dinâmica sem repetir as mesmas fotos)
  const handleAutoReplacePhoto = (targetPhotoId: string) => {
    const currentPostPhotoIds = new Set(
      currentPost?.slides.flatMap((s) => s.photoIds) || []
    );

    // 1. Filtrar fotos não descartadas, não utilizadas no post atual e não vistas recentemente na troca
    let candidates = photos.filter(
      (p) =>
        !p.isDiscarded &&
        p.id !== targetPhotoId &&
        !currentPostPhotoIds.has(p.id) &&
        !swapHistoryRef.current.includes(p.id)
    );

    // 2. Se esgotou as fotos não vistas, reiniciar o histórico de troca mantendo apenas exclusão do post
    if (candidates.length === 0) {
      swapHistoryRef.current = [];
      candidates = photos.filter(
        (p) => !p.isDiscarded && p.id !== targetPhotoId && !currentPostPhotoIds.has(p.id)
      );
    }

    // 3. Fallback se o post usar quase todas as fotos
    if (candidates.length === 0) {
      candidates = photos.filter((p) => !p.isDiscarded && p.id !== targetPhotoId);
    }

    if (candidates.length > 0) {
      // Priorizar fotos com melhor pontuação (isBestTake / selected) ou pegar aleatoriamente do pool
      const prioritized = candidates.filter((p) => p.isBestTake || p.selected);
      const chosenPool = prioritized.length > 0 ? prioritized : candidates;
      const nextPhoto = chosenPool[Math.floor(Math.random() * chosenPool.length)];

      if (nextPhoto) {
        swapHistoryRef.current.push(nextPhoto.id);
        if (targetPhotoId) swapHistoryRef.current.push(targetPhotoId);
        executePhotoSwap(targetPhotoId, nextPhoto.id);
        setFeedbackToast('🤖 A IA selecionou uma nova foto da galeria!');
        setTimeout(() => setFeedbackToast(null), 2500);
      }
    }
  };

  // Aprovar Post Atual e Salvar no Estoque de Conteúdo (com aprendizado da IA)
  const handleApproveAndSaveToVault = () => {
    if (!currentPost) return;

    const coverPhotoId = currentPost.slides[0]?.photoIds[0];
    const coverPhoto = coverPhotoId ? getPhotoById(coverPhotoId) : undefined;
    const coverUrl = coverPhoto?.previewUrl || '';

    const newApprovedItem: ApprovedPostItem = {
      id: `approved_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      title: currentPost.theme || `Post ${approvedVault.length + 1}`,
      format: postFormat,
      slides: JSON.parse(JSON.stringify(currentPost.slides)),
      caption: currentCaption?.text || '',
      hashtags: currentCaption?.hashtags || [],
      coverPreviewUrl: coverUrl,
      status: 'ready',
    };

    const updated = [newApprovedItem, ...approvedVault];
    updateApprovedVault(updated);

    // Salvar aprendizado da IA (fine-tuning local de preferências)
    try {
      const learned = {
        preferredFormat: postFormat,
        preferredGrids: currentPost.slides.some((s) => s.type !== 'single'),
        preferredFontFamily: currentSlide?.artOverlay?.fontFamily || 'serif',
        preferredOverlayOpacity: currentSlide?.artOverlay?.overlayOpacity || 35,
        totalApproved: updated.length,
        lastApprovedAt: new Date().toISOString(),
      };
      localStorage.setItem('priceus_ai_learned_preferences', JSON.stringify(learned));
    } catch {
      // ignore
    }

    setFeedbackToast('✨ Post e artes aprovados e salvos no Estoque de Conteúdo!');
    setTimeout(() => setFeedbackToast(null), 3500);

    // Avança para o próximo rascunho de post da curadoria
    if (activePostIndex < posts.length - 1) {
      setActivePostIndex(activePostIndex + 1);
      setActiveSlideIndex(0);
    }
  };

  // Reabrir Post do Estoque no Estúdio de Criação
  const handleEditVaultItem = (item: ApprovedPostItem) => {
    const reconstitutedPost: SuggestedPost = {
      id: item.id,
      theme: item.title,
      badgeText: item.format === 'story' ? 'Story Aprovado' : 'Feed Aprovado',
      slides: item.slides,
      captions: [
        {
          id: 'c1',
          tone: 'editorial',
          title: 'Legenda Aprovada',
          text: item.caption,
          hashtags: item.hashtags,
        },
      ],
      predictedEngagement: 96,
    };

    setPosts((prev) => [reconstitutedPost, ...prev.filter((p) => p.id !== item.id)]);
    setActivePostIndex(0);
    setActiveSlideIndex(0);
    setActiveCaptionIndex(0);
    setPostFormat(item.format);
    setActiveViewMode('studio');

    setFeedbackToast('🎨 Post reaberto no Estúdio de Criação!');
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  // Excluir Post do Estoque
  const handleDeleteVaultItem = (id: string) => {
    const updated = approvedVault.filter((p) => p.id !== id);
    updateApprovedVault(updated);
    setFeedbackToast('🗑️ Post removido do estoque.');
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  // Regerar Post Inteiro com a IA
  const handleDislikePost = (postIndex: number) => {
    const post = posts[postIndex];
    if (!post) return;

    const postPhotoIds = post.slides.flatMap((s) => s.photoIds);
    setDislikedPhotoIds((prev) => [...new Set([...prev, ...postPhotoIds.slice(0, 3)])]);
    setRejectionOffsets((prev) => ({
      ...prev,
      [postIndex]: (prev[postIndex] || 0) + 12,
    }));

    setFeedbackToast('🔄 Post regerado pela IA com novas fotos!');
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Download HD do Slide Atual
  const handleDownloadSlideHD = async () => {
    if (!currentSlide || photos.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1080;
    canvas.height = postFormat === 'story' ? 1920 : 1350;

    const slidePhotos = currentSlide.photoIds
      .map((id) => getPhotoById(id))
      .filter((p): p is CullingPhoto => Boolean(p));

    const drawImgOnCanvas = async (photo: CullingPhoto, x: number, y: number, w: number, h: number): Promise<boolean> => {
      // 1. Se for blob ou data url, renderiza direto sem risco
      if (photo.previewUrl?.startsWith('blob:') || photo.previewUrl?.startsWith('data:')) {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.save();
            ctx.drawImage(img, x, y, w, h);
            ctx.restore();
            resolve(true);
          };
          img.onerror = () => resolve(false);
          img.src = photo.previewUrl;
        });
      }

      const candidates = getCandidateImageUrls(photo.previewUrl);
      for (const url of candidates) {
        // Tentar via fetch CORS para criar ObjectURL limpo (impede canvas tainting)
        try {
          const res = await fetch(url, { mode: 'cors' });
          if (res.ok) {
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            const success = await new Promise<boolean>((resolve) => {
              const img = new Image();
              img.onload = () => {
                ctx.save();
                ctx.drawImage(img, x, y, w, h);
                ctx.restore();
                URL.revokeObjectURL(objectUrl);
                resolve(true);
              };
              img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(false);
              };
              img.src = objectUrl;
            });
            if (success) return true;
          }
        } catch {
          // continuar para método direto
        }

        // Tentar direto com crossOrigin anonymous
        try {
          const success = await new Promise<boolean>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              ctx.save();
              ctx.drawImage(img, x, y, w, h);
              ctx.restore();
              resolve(true);
            };
            img.onerror = () => resolve(false);
            img.src = url;
          });
          if (success) return true;
        } catch {
          // próximo candidato
        }
      }
      return false;
    };

    if (currentSlide.type === 'single' && slidePhotos[0]) {
      await drawImgOnCanvas(slidePhotos[0], 0, 0, canvas.width, canvas.height);
    } else if (currentSlide.type === 'grid_6' && slidePhotos.length > 0) {
      const cols = 2;
      const rows = 3;
      const hasBorder = currentSlide.hasWhiteBorder;
      const pad = hasBorder ? 12 : 0;
      const margin = hasBorder ? 20 : 0;

      if (hasBorder) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const availW = canvas.width - margin * 2 - pad * (cols - 1);
      const availH = canvas.height - margin * 2 - pad * (rows - 1);
      const cellW = availW / cols;
      const cellH = availH / rows;

      for (let i = 0; i < Math.min(slidePhotos.length, 6); i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const x = margin + c * (cellW + pad);
        const y = margin + r * (cellH + pad);
        await drawImgOnCanvas(slidePhotos[i], x, y, cellW, cellH);
      }
    } else if (slidePhotos.length > 0) {
      // Grade 3x3 (9 fotos)
      const cols = 3;
      const rows = 3;
      const hasBorder = currentSlide.hasWhiteBorder;
      const pad = hasBorder ? 10 : 0;
      const margin = hasBorder ? 16 : 0;

      if (hasBorder) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const availW = canvas.width - margin * 2 - pad * (cols - 1);
      const availH = canvas.height - margin * 2 - pad * (rows - 1);
      const cellW = availW / cols;
      const cellH = availH / rows;

      for (let i = 0; i < Math.min(slidePhotos.length, 9); i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const x = margin + c * (cellW + pad);
        const y = margin + r * (cellH + pad);
        await drawImgOnCanvas(slidePhotos[i], x, y, cellW, cellH);
      }
    }

    // Se houver Arte / Tipografia sobreposta
    const art = currentSlide.artOverlay;
    if (art && art.enabled) {
      ctx.fillStyle = `rgba(0,0,0,${art.overlayOpacity / 100})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const fontPrimary =
        art.fontFamily === 'serif'
          ? '"Cinzel", "Playfair Display", "Times New Roman", serif'
          : art.fontFamily === 'script'
          ? '"Brush Script MT", cursive'
          : '"Inter", "Montserrat", sans-serif';

      let baseY =
        art.textPosition === 'top'
          ? canvas.height * 0.25
          : art.textPosition === 'bottom'
          ? canvas.height * 0.75
          : canvas.height * 0.5;

      if (art.headline.trim()) {
        ctx.textAlign = 'center';
        ctx.fillStyle = art.textColor || '#ffffff';
        ctx.font = `bold 62px ${fontPrimary}`;
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 18;
        ctx.fillText(art.headline.toUpperCase(), canvas.width / 2, baseY - 50);
      }

      if (art.subtitle.trim()) {
        ctx.font = `32px "Inter", sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.shadowBlur = 10;
        ctx.fillText(art.subtitle, canvas.width / 2, baseY + 20);
      }

      if (art.cta.trim()) {
        const ctaY = baseY + 140;
        ctx.font = `bold 28px "Inter", sans-serif`;
        const textMetrics = ctx.measureText(art.cta);
        const btnW = textMetrics.width + 60;
        const btnH = 64;
        const btnX = (canvas.width - btnW) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(btnX, ctaY - 44, btnW, btnH, 32);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#0f172a';
        ctx.shadowBlur = 0;
        ctx.fillText(art.cta, canvas.width / 2, ctaY);
      }
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.download = `post_${activePostIndex + 1}_slide_${activeSlideIndex + 1}_${postFormat}.jpg`;
    link.href = dataUrl;
    link.click();

    setFeedbackToast('✨ Slide baixado em Alta Resolução!');
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Renderiza um slide no canvas e faz upload público em alta velocidade para o Instagram baixar
  const renderSlideToPublicUrl = async (slide: PostSlide, slideIndex: number): Promise<string> => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('Canvas não inicializado');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Contexto 2D não disponível');

    canvas.width = 1080;
    canvas.height = postFormat === 'story' ? 1920 : 1350;

    const slidePhotos = slide.photoIds
      .map((id) => getPhotoById(id))
      .filter((p): p is CullingPhoto => Boolean(p));

    const drawImgOnCanvas = async (photo: CullingPhoto, x: number, y: number, w: number, h: number): Promise<boolean> => {
      // 1. Se for blob ou data url, renderiza direto sem risco
      if (photo.previewUrl?.startsWith('blob:') || photo.previewUrl?.startsWith('data:')) {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.save();
            ctx.drawImage(img, x, y, w, h);
            ctx.restore();
            resolve(true);
          };
          img.onerror = () => resolve(false);
          img.src = photo.previewUrl;
        });
      }

      const candidates = getCandidateImageUrls(photo.previewUrl);
      for (const url of candidates) {
        // Tentar via fetch CORS para criar ObjectURL limpo (impede canvas tainting)
        try {
          const res = await fetch(url, { mode: 'cors' });
          if (res.ok) {
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            const success = await new Promise<boolean>((resolve) => {
              const img = new Image();
              img.onload = () => {
                ctx.save();
                ctx.drawImage(img, x, y, w, h);
                ctx.restore();
                URL.revokeObjectURL(objectUrl);
                resolve(true);
              };
              img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(false);
              };
              img.src = objectUrl;
            });
            if (success) return true;
          }
        } catch {
          // continuar para método direto
        }

        // Tentar direto com crossOrigin anonymous
        try {
          const success = await new Promise<boolean>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              ctx.save();
              ctx.drawImage(img, x, y, w, h);
              ctx.restore();
              resolve(true);
            };
            img.onerror = () => resolve(false);
            img.src = url;
          });
          if (success) return true;
        } catch {
          // próximo candidato
        }
      }
      return false;
    };

    if (slide.type === 'single' && slidePhotos[0]) {
      await drawImgOnCanvas(slidePhotos[0], 0, 0, canvas.width, canvas.height);
    } else if (slide.type === 'grid_6' && slidePhotos.length > 0) {
      const cols = 2;
      const rows = 3;
      const cellW = canvas.width / cols;
      const cellH = canvas.height / rows;
      for (let i = 0; i < Math.min(slidePhotos.length, 6); i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        await drawImgOnCanvas(slidePhotos[i], c * cellW, r * cellH, cellW, cellH);
      }
    } else if (slidePhotos.length > 0) {
      const cols = 3;
      const rows = 3;
      const cellW = canvas.width / cols;
      const cellH = canvas.height / rows;
      for (let i = 0; i < Math.min(slidePhotos.length, 9); i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        await drawImgOnCanvas(slidePhotos[i], c * cellW, r * cellH, cellW, cellH);
      }
    }

    // Camada de Arte / Tipografia
    const art = slide.artOverlay;
    if (art && art.enabled) {
      ctx.fillStyle = `rgba(0,0,0,${art.overlayOpacity / 100})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const fontPrimary =
        art.fontFamily === 'serif'
          ? '"Cinzel", "Playfair Display", "Times New Roman", serif'
          : art.fontFamily === 'script'
          ? '"Brush Script MT", cursive'
          : '"Inter", "Montserrat", sans-serif';

      let baseY =
        art.textPosition === 'top'
          ? canvas.height * 0.25
          : art.textPosition === 'bottom'
          ? canvas.height * 0.75
          : canvas.height * 0.5;

      if (art.headline.trim()) {
        ctx.textAlign = 'center';
        ctx.fillStyle = art.textColor || '#ffffff';
        ctx.font = `bold 62px ${fontPrimary}`;
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 18;
        ctx.fillText(art.headline.toUpperCase(), canvas.width / 2, baseY - 50);
      }

      if (art.subtitle.trim()) {
        ctx.font = `32px "Inter", sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.shadowBlur = 10;
        ctx.fillText(art.subtitle, canvas.width / 2, baseY + 20);
      }

      if (art.cta.trim()) {
        const ctaY = baseY + 140;
        ctx.font = `bold 28px "Inter", sans-serif`;
        const textMetrics = ctx.measureText(art.cta);
        const btnW = textMetrics.width + 60;
        const btnH = 64;
        const btnX = (canvas.width - btnW) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(btnX, ctaY - 44, btnW, btnH, 32);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#0f172a';
        ctx.shadowBlur = 0;
        ctx.fillText(art.cta, canvas.width / 2, ctaY);
      }
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Erro ao exportar canvas'))), 'image/jpeg', 0.95);
    });

    return await uploadSlideBlobToPublicUrl(blob, slideIndex);
  };

  // Publicação Direta no Instagram com Upload Público em Tempo Real
  const handleExecuteInstagramPublish = async () => {
    if (!currentPost) return;
    setIsPublishingInstagram(true);
    try {
      const accountId = connectedAccount?.id || import.meta.env.VITE_INSTAGRAM_ACCOUNT_ID || '4703114263265678';
      const captionText = currentCaption?.text || '';

      setFeedbackToast('🚀 Preparando imagens para o Instagram...');

      // Renderizar e enviar cada slide individualmente para a nuvem pública
      const publicUrls: string[] = [];
      for (let i = 0; i < currentPost.slides.length; i++) {
        const slideUrl = await renderSlideToPublicUrl(currentPost.slides[i], i);
        publicUrls.push(slideUrl);
      }

      if (publicUrls.length === 0) {
        throw new Error('Nenhuma lâmina gerada para publicação.');
      }

      setFeedbackToast('📲 Enviando para a sua conta do Instagram...');

      let res;
      if (postFormat === 'story') {
        res = await publishStoryToInstagram(accountId, publicUrls[0]);
      } else if (publicUrls.length === 1) {
        res = await publishSinglePhotoToInstagram(accountId, publicUrls[0], captionText);
      } else {
        res = await publishCarouselToInstagram(accountId, publicUrls.slice(0, 20), captionText);
      }

      if (res.success) {
        setPublishSuccessUrl(`https://instagram.com`);
        setFeedbackToast('🎉 Post publicado no Instagram com sucesso!');
        setTimeout(() => setFeedbackToast(null), 4000);
      } else {
        throw new Error(res.error || 'Erro ao publicar');
      }
    } catch (err: any) {
      alert(`Erro na publicação: ${err.message}`);
    } finally {
      setIsPublishingInstagram(false);
    }
  };

  // Publicar Post do Estoque Diretamente no Instagram
  const handlePublishVaultItem = async (item: ApprovedPostItem) => {
    setIsPublishingInstagram(true);
    try {
      const accountId = connectedAccount?.id || import.meta.env.VITE_INSTAGRAM_ACCOUNT_ID || '4703114263265678';
      setFeedbackToast('🚀 Preparando imagens do post aprovado...');

      const publicUrls: string[] = [];
      for (let i = 0; i < item.slides.length; i++) {
        const slideUrl = await renderSlideToPublicUrl(item.slides[i], i);
        publicUrls.push(slideUrl);
      }

      if (publicUrls.length === 0) {
        throw new Error('Nenhuma lâmina gerada para publicação.');
      }

      setFeedbackToast('📲 Enviando para a sua conta do Instagram...');

      let res;
      if (item.format === 'story') {
        res = await publishStoryToInstagram(accountId, publicUrls[0]);
      } else if (publicUrls.length === 1) {
        res = await publishSinglePhotoToInstagram(accountId, publicUrls[0], item.caption);
      } else {
        res = await publishCarouselToInstagram(accountId, publicUrls.slice(0, 20), item.caption);
      }

      if (res.success) {
        const updated = approvedVault.map((p) =>
          p.id === item.id ? { ...p, status: 'published' as const, publishedAt: new Date().toISOString(), instagramPostId: res.postId } : p
        );
        updateApprovedVault(updated);

        setPublishSuccessUrl('https://instagram.com');
        setFeedbackToast('🎉 Post do Estoque publicado no Instagram!');
        setTimeout(() => setFeedbackToast(null), 4000);
      } else {
        throw new Error(res.error || 'Erro ao publicar');
      }
    } catch (err: any) {
      alert(`Erro na publicação: ${err.message}`);
    } finally {
      setIsPublishingInstagram(false);
    }
  };

  // Download de Todos os Slides de um Post do Estoque em HD
  const handleDownloadVaultItem = async (item: ApprovedPostItem) => {
    setFeedbackToast(`📥 Gerando ${item.slides.length} slides em Alta Resolução...`);
    try {
      for (let i = 0; i < item.slides.length; i++) {
        const canvas = canvasRef.current;
        if (!canvas) continue;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        canvas.width = 1080;
        canvas.height = item.format === 'story' ? 1920 : 1350;

        const slide = item.slides[i];
        const slidePhotos = slide.photoIds
          .map((id) => getPhotoById(id))
          .filter((p): p is CullingPhoto => Boolean(p));

        const drawImg = async (photo: CullingPhoto, x: number, y: number, w: number, h: number) => {
          if (photo.previewUrl?.startsWith('blob:') || photo.previewUrl?.startsWith('data:')) {
            return new Promise((resolve) => {
              const img = new Image();
              img.onload = () => {
                ctx.save();
                ctx.drawImage(img, x, y, w, h);
                ctx.restore();
                resolve(true);
              };
              img.onerror = () => resolve(false);
              img.src = photo.previewUrl;
            });
          }
          const candidates = getCandidateImageUrls(photo.previewUrl);
          for (const url of candidates) {
            try {
              const res = await fetch(url, { mode: 'cors' });
              if (res.ok) {
                const blob = await res.blob();
                const objUrl = URL.createObjectURL(blob);
                const ok = await new Promise<boolean>((resolve) => {
                  const img = new Image();
                  img.onload = () => {
                    ctx.save();
                    ctx.drawImage(img, x, y, w, h);
                    ctx.restore();
                    URL.revokeObjectURL(objUrl);
                    resolve(true);
                  };
                  img.onerror = () => {
                    URL.revokeObjectURL(objUrl);
                    resolve(false);
                  };
                  img.src = objUrl;
                });
                if (ok) return true;
              }
            } catch {
              // fallback
            }
          }
        };

        if (slide.type === 'single' && slidePhotos[0]) {
          await drawImg(slidePhotos[0], 0, 0, canvas.width, canvas.height);
        } else if (slide.type === 'grid_6') {
          const cols = 2;
          const rows = 3;
          const cellW = canvas.width / cols;
          const cellH = canvas.height / rows;
          for (let k = 0; k < Math.min(slidePhotos.length, 6); k++) {
            await drawImg(slidePhotos[k], (k % cols) * cellW, Math.floor(k / cols) * cellH, cellW, cellH);
          }
        } else if (slidePhotos.length > 0) {
          const cols = 3;
          const rows = 3;
          const cellW = canvas.width / cols;
          const cellH = canvas.height / rows;
          for (let k = 0; k < Math.min(slidePhotos.length, 9); k++) {
            await drawImg(slidePhotos[k], (k % cols) * cellW, Math.floor(k / cols) * cellH, cellW, cellH);
          }
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const link = document.createElement('a');
        link.download = `${item.title.replace(/\s+/g, '_')}_slide_${i + 1}_${item.format}.jpg`;
        link.href = dataUrl;
        link.click();
        await new Promise((r) => setTimeout(r, 200));
      }
      setFeedbackToast('✨ Todos os slides foram baixados com sucesso!');
      setTimeout(() => setFeedbackToast(null), 3000);
    } catch {
      alert('Erro ao baixar slides');
    }
  };

  const handleCopyCurrentCaption = () => {
    if (!currentCaption) return;
    navigator.clipboard.writeText(currentCaption.text);
    setCopied(true);
    setFeedbackToast('📋 Legenda copiada!');
    setTimeout(() => {
      setCopied(false);
      setFeedbackToast(null);
    }, 2500);
  };

  const filteredVault = approvedVault.filter((p) => {
    if (vaultFilter === 'feed') return p.format === 'feed';
    if (vaultFilter === 'story') return p.format === 'story';
    if (vaultFilter === 'ready') return p.status === 'ready';
    if (vaultFilter === 'published') return p.status === 'published';
    return true;
  });

  return (
    <div className="w-full space-y-5 select-none font-sans">
      <canvas ref={canvasRef} className="hidden" />

      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-purple-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-top">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* ══ HEADER MASTER COM ABAS (ESTÚDIO vs ESTOQUE DE POSTS) ══════════════ */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Esquerda: Título e Seletor de Modo */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
              <Instagram className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>Estúdio Social PriceU$</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                  IA & Instagram Graph API
                </span>
              </h2>
              <p className="text-xs text-slate-400">Banco de Conteúdo, Feed 4:5, Stories 9:16 e Artes de Alta Conversão</p>
            </div>
          </div>

          {/* Abas Principais: Estúdio de Criação vs Estoque de Posts */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveViewMode('studio')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeViewMode === 'studio'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-pink-300" />
              <span>Estúdio de Criação</span>
            </button>

            <button
              onClick={() => setActiveViewMode('vault')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeViewMode === 'vault'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-amber-300" />
              <span>Estoque de Posts</span>
              {approvedVault.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold">
                  {approvedVault.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Direita: Formato (no modo Studio) e Conexão Instagram */}
        <div className="flex items-center gap-3">
          {activeViewMode === 'studio' && (
            <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                onClick={() => setPostFormat('feed')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  postFormat === 'feed'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>📱 Feed (4:5)</span>
              </button>
              <button
                onClick={() => setPostFormat('story')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  postFormat === 'story'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🚀 Stories (9:16)</span>
              </button>
            </div>
          )}

          {connectedAccount ? (
            <button
              onClick={() => setShowInstagramPublishModal(true)}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-90 text-white font-extrabold text-xs shadow-lg shadow-pink-500/20 flex items-center gap-2 transition cursor-pointer"
            >
              <Instagram className="w-4 h-4" />
              <span>Publicar (@{connectedAccount.username})</span>
            </button>
          ) : (
            <button
              onClick={() => setShowConnectionModal(true)}
              className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center gap-2 transition cursor-pointer"
            >
              <Instagram className="w-4 h-4 text-rose-400" />
              <span>Conectar Instagram</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODO 1: ESTOQUE DE POSTS & ARTES APROVADAS (BANCO DE CONTEÚDO)
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeViewMode === 'vault' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Barra de Filtros do Estoque */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xl">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-purple-400" />
              <span className="text-slate-300 font-bold">Banco de Conteúdo Pronto:</span>
              <span className="text-slate-400">
                {approvedVault.length} post{approvedVault.length === 1 ? '' : 's'} no estoque desta galeria
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                onClick={() => setVaultFilter('all')}
                className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
                  vaultFilter === 'all' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos ({approvedVault.length})
              </button>
              <button
                onClick={() => setVaultFilter('feed')}
                className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
                  vaultFilter === 'feed' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                📱 Feed ({approvedVault.filter((p) => p.format === 'feed').length})
              </button>
              <button
                onClick={() => setVaultFilter('story')}
                className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
                  vaultFilter === 'story' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                🚀 Stories ({approvedVault.filter((p) => p.format === 'story').length})
              </button>
              <button
                onClick={() => setVaultFilter('ready')}
                className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
                  vaultFilter === 'ready' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                🟢 Prontos ({approvedVault.filter((p) => p.status === 'ready').length})
              </button>
              <button
                onClick={() => setVaultFilter('published')}
                className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
                  vaultFilter === 'published' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                ✅ Publicados ({approvedVault.filter((p) => p.status === 'published').length})
              </button>
            </div>
          </div>

          {/* Grid de Cards dos Posts Aprovados */}
          {filteredVault.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-3xl bg-purple-950/60 border border-purple-500/30 text-purple-400 mx-auto flex items-center justify-center shadow-lg">
                <Archive className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-white">Nenhum post no estoque ainda</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Crie e personalize seus posts no <b>Estúdio de Criação</b> e clique em <b>"Aprovar e Salvar no Estoque"</b> para guardar posts completos prontos para publicação.
                </p>
              </div>
              <button
                onClick={() => setActiveViewMode('studio')}
                className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg transition inline-flex items-center gap-2 cursor-pointer"
              >
                <Palette className="w-4 h-4" />
                <span>Ir para o Estúdio de Criação</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredVault.map((item) => (
                <VaultPostCard
                  key={item.id}
                  post={item}
                  onPublish={handlePublishVaultItem}
                  onDownload={handleDownloadVaultItem}
                  onEdit={handleEditVaultItem}
                  onDelete={handleDeleteVaultItem}
                  isPublishing={isPublishingInstagram}
                  getPhotoById={getPhotoById}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODO 2: ESTÚDIO DE CRIAÇÃO (EDITOR INTERATIVO & CURADORIA IA)
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeViewMode === 'studio' && (
        <div className="space-y-5">
          {/* ══ BARRA DE CURADORIA DA IA & REGENERAÇÃO ═══════════════════════════ */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-slate-300">
                <b className="text-white">Curadoria Inteligente da IA:</b> 5 conceitos prontos de alto engajamento.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleApproveAndSaveToVault}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-extrabold flex items-center gap-2 transition shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Aprovar e Salvar no Estoque</span>
              </button>

              <button
                onClick={() => handleDislikePost(activePostIndex)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-purple-950 text-purple-300 font-bold flex items-center gap-1.5 transition border border-purple-500/30 cursor-pointer"
                title="Recalcula a curadoria trazendo novas fotos da galeria"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
                <span>Regerar Post com Outras Fotos</span>
              </button>
            </div>
          </div>

      {/* ══ CARDS DE SELEÇÃO DOS 5 CONCEITOS SUGERIDOS PELA IA ═══════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {posts.map((post, idx) => {
          const isActive = idx === activePostIndex;
          const coverPhotoId = post.slides[0]?.photoIds[0];
          const coverPhoto = coverPhotoId ? getPhotoById(coverPhotoId) : photos[0];

          return (
            <button
              key={post.id}
              onClick={() => {
                setActivePostIndex(idx);
                setActiveSlideIndex(0);
                setActiveCaptionIndex(0);
              }}
              className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between overflow-hidden group cursor-pointer ${
                isActive
                  ? 'bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/40 shadow-xl'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-extrabold text-white truncate max-w-[130px]">
                    Post #{idx + 1}
                  </span>
                  <span className="text-emerald-400 font-extrabold flex items-center gap-0.5 text-[10px]">
                    <TrendingUp className="w-3 h-3" />
                    {post.predictedEngagement}%
                  </span>
                </div>

                <div className="w-full h-24 rounded-xl overflow-hidden bg-slate-900 relative">
                  {coverPhoto && <StudioImage src={coverPhoto.previewUrl} alt="Capa" />}
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-bold text-white">
                    {post.slides.length} {post.slides.length === 1 ? 'Foto' : 'Lâminas'}
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 line-clamp-1">{post.badgeText}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ══ CONSTRUTOR & NAVEGADOR DE SLIDES DO POST ATIVO ═════════════════════ */}
      {currentPost && (
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs text-white">Lâminas do Post ({currentPost.slides.length}/20):</span>
              <span className="text-[11px] text-slate-400">Clique para navegar ou adicionar mais fotos e grades</span>
            </div>

            {/* Ações de Adicionar Foto ou Grade */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddSingleSlide}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-purple-400" />
                <span>+ Foto Solo</span>
              </button>

              <button
                onClick={() => handleAddGridSlide('grid_6', false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-pink-400" />
                <span>+ Grade 6 Seamless</span>
              </button>

              <button
                onClick={() => handleAddGridSlide('grid_9', false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Grade 9 Seamless</span>
              </button>
            </div>
          </div>

          {/* Fita de Miniaturas dos Slides */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
            {currentPost.slides.map((slide, sIdx) => {
              const isSelected = sIdx === activeSlideIndex;
              const firstPhotoId = slide.photoIds[0];
              const photo = firstPhotoId ? getPhotoById(firstPhotoId) : undefined;

              return (
                <div
                  key={sIdx}
                  onClick={() => setActiveSlideIndex(sIdx)}
                  className={`relative shrink-0 w-20 aspect-[4/5] rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group ${
                    isSelected
                      ? 'border-purple-500 ring-2 ring-purple-500/40 shadow-lg scale-105'
                      : 'border-slate-800 opacity-65 hover:opacity-100'
                  }`}
                >
                  {photo ? (
                    <StudioImage src={photo.previewUrl} alt={`Slide ${sIdx + 1}`} />
                  ) : (
                    <div className="w-full h-full bg-slate-950 flex items-center justify-center text-slate-500 text-[10px]">
                      Foto
                    </div>
                  )}

                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-extrabold text-white">
                    #{sIdx + 1}
                  </div>

                  {slide.type !== 'single' && (
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-purple-600/90 text-[8px] font-bold text-white">
                      {slide.type === 'grid_6' ? '6 Fotos' : '9 Fotos'}
                    </div>
                  )}

                  {/* Botão de Excluir Slide */}
                  {currentPost.slides.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSlide(sIdx);
                      }}
                      className="absolute top-1 right-1 p-1 rounded-md bg-rose-600/90 hover:bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition shadow"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ ÁREA PRINCIPAL: VISUALIZADOR DO SLIDE & EDITOR DE TEXTOS ═════════ */}
      {currentSlide && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Esquerda: Visualizador Pixel-Perfect do Slide (7 colunas) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col items-center justify-center space-y-4">
              {/* O Container do Canvas em 4:5 ou 9:16 */}
              <div
                className={`w-full max-w-[360px] rounded-2xl overflow-hidden relative shadow-2xl border border-slate-800 bg-black flex flex-col justify-center items-center select-none ${
                  postFormat === 'story' ? 'aspect-[9/16]' : 'aspect-[4/5]'
                }`}
              >
                {/* 1. Foto Solo */}
                {currentSlide.type === 'single' && (
                  <div
                    onClick={() => currentSlide.photoIds[0] && setSelectingPhotoId(currentSlide.photoIds[0])}
                    className="w-full h-full relative cursor-pointer group"
                  >
                    {currentSlide.photoIds[0] && (
                      <StudioImage
                        src={getPhotoById(currentSlide.photoIds[0])?.previewUrl}
                        alt="Slide Solo"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <span className="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs shadow flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Trocar Foto</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* 2. Grade 6 Fotos Seamless */}
                {currentSlide.type === 'grid_6' && (
                  <div className="w-full h-full grid grid-cols-2 grid-rows-3 gap-0 bg-black">
                    {currentSlide.photoIds.slice(0, 6).map((id, pIdx) => {
                      const p = getPhotoById(id);
                      return (
                        <div
                          key={pIdx}
                          onClick={() => setSelectingPhotoId(id)}
                          className="w-full h-full relative overflow-hidden group/cell cursor-pointer border border-slate-950 hover:border-purple-500 transition-all"
                        >
                          {p && <StudioImage src={p.previewUrl} alt={`Grade ${pIdx + 1}`} />}
                          {/* Hover action overlay */}
                          <div className="absolute inset-0 bg-black/65 opacity-0 group-hover/cell:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectingPhotoId(id);
                              }}
                              className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[9px] flex items-center gap-1 shadow"
                              title="Trocar esta foto"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAutoReplacePhoto(id);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-950 text-purple-300 font-bold text-[9px] flex items-center gap-1 shadow border border-purple-500/40"
                              title="Trocar com IA"
                            >
                              <Wand2 className="w-3 h-3 text-amber-300" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. Grade 9 Fotos Seamless */}
                {currentSlide.type === 'grid_9' && (
                  <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-0 bg-black">
                    {currentSlide.photoIds.slice(0, 9).map((id, pIdx) => {
                      const p = getPhotoById(id);
                      return (
                        <div
                          key={pIdx}
                          onClick={() => setSelectingPhotoId(id)}
                          className="w-full h-full relative overflow-hidden group/cell cursor-pointer border border-slate-950 hover:border-purple-500 transition-all"
                        >
                          {p && <StudioImage src={p.previewUrl} alt={`Grade ${pIdx + 1}`} />}
                          {/* Hover action overlay */}
                          <div className="absolute inset-0 bg-black/65 opacity-0 group-hover/cell:opacity-100 transition-opacity flex items-center justify-center gap-1 p-0.5 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectingPhotoId(id);
                              }}
                              className="p-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-bold text-[8px] flex items-center gap-0.5 shadow"
                              title="Trocar foto"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAutoReplacePhoto(id);
                              }}
                              className="p-1 rounded-md bg-slate-800 hover:bg-purple-950 text-purple-300 font-bold text-[8px] flex items-center gap-0.5 shadow border border-purple-500/40"
                              title="IA"
                            >
                              <Wand2 className="w-2.5 h-2.5 text-amber-300" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 4. Camada de Arte / Tipografia Sobreposta */}
                {currentSlide.artOverlay && currentSlide.artOverlay.enabled && (
                  <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-4 z-10">
                    <div
                      className="absolute inset-0 bg-black transition-opacity"
                      style={{ opacity: currentSlide.artOverlay.overlayOpacity / 100 }}
                    />
                    <div className="relative z-10 space-y-2 px-1">
                      {currentSlide.artOverlay.headline && (
                        <h4
                          className="font-extrabold text-base sm:text-lg text-white drop-shadow-lg tracking-wider leading-tight"
                          style={{
                            fontFamily:
                              currentSlide.artOverlay.fontFamily === 'serif' ? 'serif' : 'sans-serif',
                            color: currentSlide.artOverlay.textColor || '#ffffff',
                          }}
                        >
                          {currentSlide.artOverlay.headline}
                        </h4>
                      )}

                      {currentSlide.artOverlay.subtitle && (
                        <p className="text-[10px] text-white/95 leading-relaxed font-sans drop-shadow">
                          {currentSlide.artOverlay.subtitle}
                        </p>
                      )}

                      {currentSlide.artOverlay.cta && (
                        <div className="pt-2">
                          <span className="inline-block px-3 py-1.5 rounded-full bg-white text-slate-950 font-extrabold text-[9px] shadow-lg">
                            {currentSlide.artOverlay.cta}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Botões de Ação do Slide */}
              <div className="w-full max-w-[360px] grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => currentSlide.photoIds[0] && setSelectingPhotoId(currentSlide.photoIds[0])}
                  className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] transition flex items-center justify-center gap-1 cursor-pointer border border-slate-700"
                  title="Escolher outra foto manualmente"
                >
                  <RotateCcw className="w-3 h-3 text-purple-400" />
                  <span>Trocar Foto</span>
                </button>

                <button
                  onClick={() => currentSlide.photoIds[0] && handleAutoReplacePhoto(currentSlide.photoIds[0])}
                  className="py-2 rounded-xl bg-slate-800 hover:bg-purple-950/80 text-purple-300 font-bold text-[11px] transition flex items-center justify-center gap-1 cursor-pointer border border-purple-500/30"
                  title="A IA escolhe a melhor foto substituta"
                >
                  <Wand2 className="w-3 h-3 text-amber-300" />
                  <span>IA Trocar</span>
                </button>

                <button
                  onClick={() => setShowArtDrawer(!showArtDrawer)}
                  className={`py-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    currentSlide.artOverlay?.enabled
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Arte</span>
                </button>

                <button
                  onClick={handleDownloadSlideHD}
                  className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] transition flex items-center justify-center gap-1 cursor-pointer border border-slate-700"
                >
                  <Download className="w-3 h-3" />
                  <span>Baixar HD</span>
                </button>
              </div>
            </div>
          </div>

          {/* Direita: Editor de Textos & IA de Vendas (5 colunas) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Drawer de Edição de Arte do Slide */}
            {showArtDrawer ? (
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="font-extrabold text-xs text-white">Criador de Arte do Slide</span>
                  </div>
                  <button
                    onClick={() => handleUpdateArtOverlay({ enabled: !currentSlide.artOverlay?.enabled })}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                      currentSlide.artOverlay?.enabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {currentSlide.artOverlay?.enabled ? 'Ativado' : 'Desativado'}
                  </button>
                </div>

                {/* Botão de Gerar com IA */}
                <button
                  onClick={handleGenerateArtCopiesWithAI}
                  disabled={generatingArtCopies}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {generatingArtCopies ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span>Gerar Ideias de Títulos & CTAs com IA</span>
                </button>

                {/* Modelos Prontos */}
                {artPresets.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400">Sugestões da IA:</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {artPresets.map((p) => (
                        <button
                          key={p.id}
                          onClick={() =>
                            handleUpdateArtOverlay({
                              enabled: true,
                              headline: p.headline,
                              subtitle: p.subtitle,
                              cta: p.cta,
                            })
                          }
                          className="p-2 rounded-xl bg-slate-950 hover:bg-purple-950/60 border border-slate-800 hover:border-purple-500 text-left text-[10px] text-slate-300 truncate transition"
                        >
                          <span className="font-bold text-white block">{p.category}</span>
                          <span className="text-[9px] text-slate-400 block truncate">{p.headline}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inputs de Texto */}
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Título (Headline):</label>
                    <input
                      type="text"
                      value={currentSlide.artOverlay?.headline || ''}
                      onChange={(e) => handleUpdateArtOverlay({ headline: e.target.value, enabled: true })}
                      placeholder="Ex: AGENDA 2026 ABERTA"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-bold outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Subtítulo / Oferta:</label>
                    <textarea
                      rows={2}
                      value={currentSlide.artOverlay?.subtitle || ''}
                      onChange={(e) => handleUpdateArtOverlay({ subtitle: e.target.value, enabled: true })}
                      placeholder="Ex: Garanta a memória do seu casamento..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-purple-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Botão de Ação (CTA):</label>
                    <input
                      type="text"
                      value={currentSlide.artOverlay?.cta || ''}
                      onChange={(e) => handleUpdateArtOverlay({ cta: e.target.value, enabled: true })}
                      placeholder="Ex: 🔗 LINK NA BIO"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-bold outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Estilo e Escurecimento */}
                <div className="space-y-2.5 pt-2 border-t border-slate-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300">Escurecer Fundo:</span>
                    <span className="text-purple-400 font-bold">{currentSlide.artOverlay?.overlayOpacity || 45}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={currentSlide.artOverlay?.overlayOpacity || 45}
                    onChange={(e) => handleUpdateArtOverlay({ overlayOpacity: Number(e.target.value), enabled: true })}
                    className="w-full accent-purple-600"
                  />
                </div>
              </div>
            ) : (
              /* Legendas & Copywriting Viral */
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-purple-400" />
                    <span className="font-extrabold text-xs text-white">Legendas Geradas pela IA</span>
                  </div>
                  <button
                    onClick={handleCopyCurrentCaption}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                {/* 5 Variações de Legendas */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {currentPost.captions.map((cap, cIdx) => (
                    <button
                      key={cap.id}
                      onClick={() => setActiveCaptionIndex(cIdx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                        cIdx === activeCaptionIndex
                          ? 'bg-purple-600 text-white shadow'
                          : 'bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{cap.title.split('.')[0] || `V${cIdx + 1}`}</span>
                    </button>
                  ))}
                </div>

                <textarea
                  rows={8}
                  value={currentCaption?.text || ''}
                  onChange={(e) => {
                    if (!currentCaption) return;
                    setPosts((prev) =>
                      prev.map((p, pIdx) => {
                        if (pIdx !== activePostIndex) return p;
                        return {
                          ...p,
                          captions: p.captions.map((c, cIdx) =>
                            cIdx === activeCaptionIndex ? { ...c, text: e.target.value } : c
                          ),
                        };
                      })
                    );
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                />
              </div>
            )}
          </div>
        </div>
      )}
        </div>
      )}

      {/* ══ MODAL DE CONEXÃO DO INSTAGRAM ═════════════════════════════════════ */}
      <InstagramConnectionModal
        isOpen={showConnectionModal}
        onClose={() => {
          setShowConnectionModal(false);
          checkInstagramStatus();
        }}
        onConnected={(acc) => setConnectedAccount(acc)}
      />

      {/* ══ MODAL DE PUBLICAÇÃO DIRETA NO INSTAGRAM ═══════════════════════════ */}
      {showInstagramPublishModal && currentPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5 text-white relative">
            <button
              onClick={() => setShowInstagramPublishModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                <Instagram className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Publicar no Instagram</h3>
                <p className="text-xs text-slate-400">
                  {postFormat === 'story'
                    ? '🚀 Publicação nos Stories (9:16)'
                    : `📱 Carrossel com ${currentPost.slides.length} lâminas`}
                </p>
              </div>
            </div>

            {/* Resumo */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-bold">Conta de Destino:</span>
                <span className="text-purple-400 font-bold">@{connectedAccount?.username || 'sua_conta'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-bold">Formato:</span>
                <span className="text-white font-bold uppercase">{postFormat === 'story' ? 'Story (9:16)' : 'Feed (4:5)'}</span>
              </div>
            </div>

            {/* Sucesso */}
            {publishSuccessUrl ? (
              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-center space-y-2">
                <p className="text-emerald-300 font-bold text-sm">🎉 Publicação enviada com sucesso!</p>
                <p className="text-xs text-slate-300">Seu post já está no Instagram.</p>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleExecuteInstagramPublish}
                  disabled={isPublishingInstagram}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-90 text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 transition cursor-pointer"
                >
                  {isPublishingInstagram ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Publicando no Instagram...</span>
                    </>
                  ) : (
                    <>
                      <Instagram className="w-4 h-4" />
                      <span>Confirmar e Publicar Agora</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ MODAL DE TROCA MANUAL / SUGESTÕES DA IA ════════════════════════ */}
      {selectingPhotoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col text-white relative">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="font-extrabold text-sm text-white">Substituir Foto do Slide</h3>
                  <p className="text-[11px] text-slate-400">Sugestões inteligentes da IA e todas as fotos da galeria</p>
                </div>
              </div>
              <button
                onClick={() => setSelectingPhotoId(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Botão de Substituição Rápida pela IA */}
              <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-white block">Quer que a IA escolha?</span>
                  <span className="text-[11px] text-purple-300">A IA analisa o enquadramento e escolhe a melhor foto para você</span>
                </div>
                <button
                  onClick={() => {
                    handleAutoReplacePhoto(selectingPhotoId);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Escolher com IA</span>
                </button>
              </div>

              {/* Grid de Fotos */}
              <div className="space-y-2">
                <span className="font-bold text-xs text-slate-300">Escolha uma foto da galeria:</span>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[360px] overflow-y-auto p-1">
                  {photos.filter((p) => !p.isDiscarded).map((p) => {
                    const isCurrent = p.id === selectingPhotoId;
                    return (
                      <button
                        key={p.id}
                        onClick={() => executePhotoSwap(selectingPhotoId, p.id)}
                        className={`aspect-[4/5] rounded-xl overflow-hidden border-2 transition relative group cursor-pointer ${
                          isCurrent ? 'border-purple-500 ring-2 ring-purple-500/40' : 'border-slate-800 hover:border-purple-400'
                        }`}
                      >
                        <StudioImage src={p.previewUrl} alt="Opção de foto" />
                        {isCurrent && (
                          <div className="absolute inset-0 bg-purple-900/60 flex items-center justify-center">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Card Individual de Post Aprovado no Estoque com Navegador de Lâminas e Ações Rápidas
 */
function VaultPostCard({
  post,
  onPublish,
  onDownload,
  onEdit,
  onDelete,
  isPublishing,
  getPhotoById,
}: {
  post: ApprovedPostItem;
  onPublish: (post: ApprovedPostItem) => void;
  onDownload: (post: ApprovedPostItem) => void;
  onEdit: (post: ApprovedPostItem) => void;
  onDelete: (id: string) => void;
  isPublishing: boolean;
  getPhotoById: (id: string) => CullingPhoto | undefined;
}) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const currentSlide = post.slides[activeSlide] || post.slides[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(post.caption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  return (
    <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition">
      {/* Header do Card */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
              post.format === 'story'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
            }`}
          >
            {post.format === 'story' ? '🚀 Story 9:16' : '📱 Feed 4:5'}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {new Date(post.createdAt).toLocaleDateString('pt-BR')}
          </span>
        </div>

        <div>
          {post.status === 'published' ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>Publicado</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30 flex items-center gap-1">
              <BookmarkCheck className="w-3 h-3" />
              <span>No Estoque</span>
            </span>
          )}
        </div>
      </div>

      {/* Visualizador de Slide do Card com Navegação */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-inner group select-none ${
          post.format === 'story' ? 'aspect-[9/16]' : 'aspect-[4/5]'
        }`}
      >
        {currentSlide && (
          <>
            {currentSlide.type === 'single' && currentSlide.photoIds[0] && (
              <StudioImage src={getPhotoById(currentSlide.photoIds[0])?.previewUrl} alt="Slide" />
            )}
            {currentSlide.type === 'grid_6' && (
              <div className="w-full h-full grid grid-cols-2 grid-rows-3 gap-0 bg-black">
                {currentSlide.photoIds.slice(0, 6).map((id, idx) => (
                  <div key={idx} className="w-full h-full relative overflow-hidden">
                    <StudioImage src={getPhotoById(id)?.previewUrl} alt={`Grid ${idx}`} />
                  </div>
                ))}
              </div>
            )}
            {currentSlide.type === 'grid_9' && (
              <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-0 bg-black">
                {currentSlide.photoIds.slice(0, 9).map((id, idx) => (
                  <div key={idx} className="w-full h-full relative overflow-hidden">
                    <StudioImage src={getPhotoById(id)?.previewUrl} alt={`Grid ${idx}`} />
                  </div>
                ))}
              </div>
            )}

            {/* Arte Overlay */}
            {currentSlide.artOverlay?.enabled && (
              <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-3 z-10">
                <div
                  className="absolute inset-0 bg-black"
                  style={{ opacity: currentSlide.artOverlay.overlayOpacity / 100 }}
                />
                <div className="relative z-10 space-y-1">
                  {currentSlide.artOverlay.headline && (
                    <h5 className="font-extrabold text-xs text-white drop-shadow uppercase tracking-wider">
                      {currentSlide.artOverlay.headline}
                    </h5>
                  )}
                  {currentSlide.artOverlay.subtitle && (
                    <p className="text-[10px] text-slate-200 drop-shadow line-clamp-1">
                      {currentSlide.artOverlay.subtitle}
                    </p>
                  )}
                  {currentSlide.artOverlay.cta && (
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-white text-slate-950 font-bold text-[9px] shadow">
                      {currentSlide.artOverlay.cta}
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Controles de Slide Anterior / Próximo se houver mais de 1 */}
        {post.slides.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveSlide((prev) => (prev > 0 ? prev - 1 : post.slides.length - 1));
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white opacity-0 group-hover:opacity-100 transition z-20 shadow cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveSlide((prev) => (prev < post.slides.length - 1 ? prev + 1 : 0));
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white opacity-0 group-hover:opacity-100 transition z-20 shadow cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 inset-x-0 flex justify-center items-center gap-1 z-20">
              {post.slides.map((_, idx) => (
                <span
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === activeSlide ? 'w-4 bg-purple-400' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur text-[10px] font-bold text-white z-20">
          {activeSlide + 1}/{post.slides.length} {post.slides.length === 1 ? 'Foto' : 'Lâminas'}
        </div>
      </div>

      {/* Mini Fita de Slides */}
      {post.slides.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {post.slides.map((s, idx) => {
            const fPhoto = s.photoIds[0] ? getPhotoById(s.photoIds[0]) : undefined;
            return (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className={`shrink-0 w-8 h-10 rounded-lg overflow-hidden border transition relative cursor-pointer ${
                  idx === activeSlide ? 'border-purple-500 ring-1 ring-purple-500' : 'border-slate-800 opacity-60'
                }`}
              >
                {fPhoto && <StudioImage src={fPhoto.previewUrl} alt={`Slide ${idx + 1}`} />}
              </button>
            );
          })}
        </div>
      )}

      {/* Legenda Aprovada com Botão de Copiar */}
      {post.caption && (
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300">Legenda Aprovada</span>
            <button
              onClick={handleCopy}
              className="text-purple-400 hover:text-purple-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
            >
              {copiedCaption ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCaption ? 'Copiada!' : 'Copiar'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{post.caption}</p>
        </div>
      )}

      {/* Ações do Card */}
      <div className="space-y-2 pt-1">
        <button
          onClick={() => onPublish(post)}
          disabled={isPublishing}
          className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-90 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
        >
          <Instagram className="w-3.5 h-3.5" />
          <span>Publicar no Instagram Agora</span>
        </button>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onDownload(post)}
            className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
            title="Baixar todos os slides em JPEG HD"
          >
            <Download className="w-3 h-3 text-emerald-400" />
            <span>Baixar HD</span>
          </button>
          <button
            onClick={() => onEdit(post)}
            className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
            title="Reabrir no Estúdio de Criação"
          >
            <Edit3 className="w-3 h-3 text-purple-400" />
            <span>Editar</span>
          </button>
          <button
            onClick={() => onDelete(post.id)}
            className="py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-300 text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
            title="Remover do estoque"
          >
            <Trash2 className="w-3 h-3" />
            <span>Excluir</span>
          </button>
        </div>
      </div>
    </div>
  );
}
