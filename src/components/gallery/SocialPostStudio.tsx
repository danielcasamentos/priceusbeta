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
  Image as ImageIcon,
} from 'lucide-react';
import type { CullingPhoto } from './AICullingManager';
import { generateCuratedPosts, getCleanPhotoPool } from '../../services/aiCullingEngine';

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

export interface PostSlide {
  type: 'single' | 'grid_9';
  photoIds: string[];
  bgTheme: 'white';
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
  // Aprendizado da IA: IDs de fotos que o usuário recusou individualmente
  const [dislikedPhotoIds, setDislikedPhotoIds] = useState<string[]>([]);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Modal de escolha manual ou automática para troca de foto
  const [selectingPhotoId, setSelectingPhotoId] = useState<string | null>(null);
  const [modalPhotoSearch, setModalPhotoSearch] = useState('');

  // Pool limpo da galeria ativa desconsiderando fotos recusadas
  const pool = getCleanPhotoPool(photos, dislikedPhotoIds);

  // Aprendizado / Preferências de visualização
  const [prefBg, setPrefBg] = useState<'white' | 'black'>('white');
  const [allowGrids, setAllowGrids] = useState(true);

  // Shuffling de fotos ao recusar um post inteiro
  const [rejectionOffsets, setRejectionOffsets] = useState<Record<number, number>>({});

  // Posts Sugeridos pela IA
  const [posts, setPosts] = useState<SuggestedPost[]>([]);
  const [activePostIndex, setActivePostIndex] = useState(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [activeCaptionIndex, setActiveCaptionIndex] = useState(0);

  // Palavras-chave personalizadas pelo fotógrafo para direcionar o tom/conteúdo da IA
  const [captionKeywords, setCaptionKeywords] = useState('');

  // Estado de carregamento do Groq IA e cópia
  const [generatingGroq, setGeneratingGroq] = useState(false);
  const [copied, setCopied] = useState(false);

  // Canvas invisível para download em alta resolução (1080x1350)
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Flag para evitar que re-renderizações da galeria pai apaguem trocas manuais feitas pelo fotógrafo
  const initializedPhotosCountRef = useRef<number>(0);

  useEffect(() => {
    if (photos.length === 0) return;
    const shouldReinit = initializedPhotosCountRef.current !== photos.length || Object.keys(rejectionOffsets).length > 0;
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

  // Helper para buscar foto pelo ID
  const getPhotoById = (id: string): CullingPhoto | undefined => {
    return photos.find((p) => p.id === id) || pool.find((p) => p.id === id);
  };

  // Efetua a troca de foto no slide atual e salva a alteração permanentemente no post
  const executePhotoSwap = (oldPhotoId: string, newPhotoId: string, isDislike = true) => {
    if (isDislike) {
      setDislikedPhotoIds((prev) => [...new Set([...prev, oldPhotoId])]);
    }

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
    setFeedbackToast('✨ Foto substituída e mantida no post!');
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Substituição Automática pela IA (Escolhe a melhor foto disponível)
  const handleAutoReplacePhoto = (targetPhotoId: string) => {
    const currentPostPhotoIds = new Set(
      currentPost?.slides.flatMap((s) => s.photoIds) || []
    );

    const candidate = photos.find(
      (p) => !p.isDiscarded && !dislikedPhotoIds.includes(p.id) && p.id !== targetPhotoId && !currentPostPhotoIds.has(p.id)
    ) || photos.find((p) => !p.isDiscarded && p.id !== targetPhotoId && !currentPostPhotoIds.has(p.id));

    if (!candidate) {
      setFeedbackToast('Todas as fotos disponíveis já estão em uso no post.');
      setTimeout(() => setFeedbackToast(null), 3000);
      return;
    }

    executePhotoSwap(targetPhotoId, candidate.id, true);
  };

  // Aprendizado de Aprovação de Post Completo
  const handleApprovePost = (postIndex: number) => {
    setPosts((prev) =>
      prev.map((p, idx) => (idx === postIndex ? { ...p, approved: true, rejected: false } : p))
    );
    if (currentSlide?.bgTheme) {
      setPrefBg(currentSlide.bgTheme);
    }
  };

  // Recusar Post Completo -> Re-arranjar fotos e composição
  const handleRejectPost = (postIndex: number) => {
    setRejectionOffsets((prev) => ({
      ...prev,
      [postIndex]: (prev[postIndex] || 0) + 1,
    }));
    setActiveSlideIndex(0);
  };

  // Aprovar legenda
  const handleApproveCaption = (captionId: string) => {
    setPosts((prev) =>
      prev.map((post, pIdx) => {
        if (pIdx !== activePostIndex) return post;
        return {
          ...post,
          captions: post.captions.map((cap) =>
            cap.id === captionId ? { ...cap, approved: true, rejected: false } : cap
          ),
        };
      })
    );
  };

  // Editar texto da legenda manualmente
  const handleEditCaptionText = (captionId: string, newText: string) => {
    setPosts((prev) =>
      prev.map((post, pIdx) => {
        if (pIdx !== activePostIndex) return post;
        return {
          ...post,
          captions: post.captions.map((cap) =>
            cap.id === captionId ? { ...cap, text: newText } : cap
          ),
        };
      })
    );
  };

  // Recusar legenda -> Chama Groq IA para substituir por uma nova versão estilizada
  const handleRejectCaption = async (captionId: string) => {
    await handleGenerateGroqCaptions(true, captionId);
  };

  // Gerar ou Substituir Legendas via Groq LLM API (com suporte a palavras-chave e fallback robusto)
  const handleGenerateGroqCaptions = async (singleReplace = false, targetCaptionId?: string) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    const titleStr = projectTitle || 'Ensaio Fotográfico Exclusivo';
    const postTypeStr = currentPost?.title || 'Post Especial';
    const keywordsInstruction = captionKeywords.trim()
      ? `\n- Palavras-chave / Temas Obrigatórios do Fotógrafo: "${captionKeywords.trim()}"`
      : '';

    setGeneratingGroq(true);

    const coverPhotoId = currentPost?.slides[0]?.photoIds[0];
    const coverPhoto = coverPhotoId ? getPhotoById(coverPhotoId) : photos[0];

    if (!apiKey) {
      // Fallback sem API key: gera com motor de templates inteligente incorporando keywords
      if (singleReplace && targetCaptionId) {
        const fallbacks = generateSmartCaptions(coverPhoto, captionKeywords);
        const randomFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        setPosts((prev) =>
          prev.map((post, pIdx) => {
            if (pIdx !== activePostIndex) return post;
            return {
              ...post,
              captions: post.captions.map((cap) =>
                cap.id === targetCaptionId
                  ? { ...cap, text: randomFallback.text, rejected: false, approved: false }
                  : cap
              ),
            };
          })
        );
        setFeedbackToast('✨ Nova variação de legenda gerada com sucesso!');
        setTimeout(() => setFeedbackToast(null), 3000);
      } else {
        const newCaptions = generateSmartCaptions(coverPhoto, captionKeywords);
        setPosts((prev) =>
          prev.map((post, pIdx) => (pIdx === activePostIndex ? { ...post, captions: newCaptions } : post))
        );
        setFeedbackToast('✨ 5 legendas atualizadas com base nas palavras-chave!');
        setTimeout(() => setFeedbackToast(null), 3000);
      }
      setGeneratingGroq(false);
      return;
    }

    const prompt = `Você é um Copywriter especialista de elite no mercado de fotografia de casamentos e ensaios premium no Instagram.
Gere ${singleReplace ? '1 NOVA LEGENDA ÚNICA' : '5 OPÇÕES DE LEGENDAS ALTAMENTE ENGAJADORAS'} para o Instagram.

Informações do Ensaio:
- Título do Projeto: "${titleStr}"
- Tipo de Post: "${postTypeStr}"${keywordsInstruction}

Requisitos obrigatórios:
1. SEM MENCIONAR EQUIPAMENTOS, LENTES OU DADOS TÉCNICOS DE CÂMERA.
2. Foque 100% na emoção, estética editorial, narrativa e conexão com o cliente.${captionKeywords.trim() ? ` Incorpore a essência de: ${captionKeywords.trim()}.` : ''}
3. Cada legenda deve ter:
   - 1 Frase de impacto inicial (Hook).
   - 2 a 3 parágrafos curtos e poéticos com emojis elegantes.
   - Chamada para Ação (CTA) convidando para ver o portfólio no link da bio ou enviar Direct.
   - 8 a 12 Hashtags estratégicas de fotografia.
${
  singleReplace
    ? 'Responda APENAS com o texto da legenda pronta, sem json e sem aspas extras.'
    : `Retorne exatamente 5 legendas no formato JSON:
[
  { "title": "1. Emocional & Poética", "text": "..." },
  { "title": "2. Editorial & Atemporal", "text": "..." },
  { "title": "3. Minimalista & Chic", "text": "..." },
  { "title": "4. Storytelling & Sentimento", "text": "..." },
  { "title": "5. Foco em Vendas & Agendamento", "text": "..." }
]`
}`;

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.85,
          max_tokens: 1200,
        }),
      });

      const data = await res.json();
      const contentText = data.choices?.[0]?.message?.content || '';

      if (singleReplace && targetCaptionId) {
        if (contentText.trim()) {
          setPosts((prev) =>
            prev.map((post, pIdx) => {
              if (pIdx !== activePostIndex) return post;
              return {
                ...post,
                captions: post.captions.map((cap) =>
                  cap.id === targetCaptionId
                    ? { ...cap, text: contentText.trim(), rejected: false, approved: false }
                    : cap
                ),
              };
            })
          );
          setFeedbackToast('✨ Nova versão da legenda gerada com sucesso!');
          setTimeout(() => setFeedbackToast(null), 3000);
        } else {
          // Fallback se a resposta vier vazia
          const fallbacks = generateSmartCaptions(coverPhoto, captionKeywords);
          const randomFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
          setPosts((prev) =>
            prev.map((post, pIdx) => {
              if (pIdx !== activePostIndex) return post;
              return {
                ...post,
                captions: post.captions.map((cap) =>
                  cap.id === targetCaptionId
                    ? { ...cap, text: randomFallback.text, rejected: false, approved: false }
                    : cap
                ),
              };
            })
          );
        }
      } else {
        try {
          const jsonMatch = contentText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const newCaptions: CaptionOption[] = parsed.map((item: any, idx: number) => ({
              id: `cap_groq_${Date.now()}_${idx}`,
              title: item.title || `Legenda IA #${idx + 1}`,
              tone: 'emotional',
              text: item.text,
            }));

            setPosts((prev) =>
              prev.map((post, pIdx) => (pIdx === activePostIndex ? { ...post, captions: newCaptions } : post))
            );
            setFeedbackToast('✨ 5 novas legendas geradas com sucesso!');
            setTimeout(() => setFeedbackToast(null), 3000);
          } else if (contentText.trim()) {
            setPosts((prev) =>
              prev.map((post, pIdx) => {
                if (pIdx !== activePostIndex) return post;
                const caps = [...post.captions];
                if (caps[activeCaptionIndex]) {
                  caps[activeCaptionIndex] = { ...caps[activeCaptionIndex], text: contentText.trim() };
                }
                return { ...post, captions: caps };
              })
            );
          }
        } catch {
          const newCaptions = generateSmartCaptions(coverPhoto, captionKeywords);
          setPosts((prev) =>
            prev.map((post, pIdx) => (pIdx === activePostIndex ? { ...post, captions: newCaptions } : post))
          );
        }
      }
    } catch (err) {
      console.error('Erro ao chamar Groq IA:', err);
      // Fallback gracioso em caso de erro de rede ou quota
      if (singleReplace && targetCaptionId) {
        const fallbacks = generateSmartCaptions(coverPhoto, captionKeywords);
        const randomFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        setPosts((prev) =>
          prev.map((post, pIdx) => {
            if (pIdx !== activePostIndex) return post;
            return {
              ...post,
              captions: post.captions.map((cap) =>
                cap.id === targetCaptionId
                  ? { ...cap, text: randomFallback.text, rejected: false, approved: false }
                  : cap
              ),
            };
          })
        );
        setFeedbackToast('✨ Nova variação gerada via IA interna!');
        setTimeout(() => setFeedbackToast(null), 3000);
      } else {
        const newCaptions = generateSmartCaptions(coverPhoto, captionKeywords);
        setPosts((prev) =>
          prev.map((post, pIdx) => (pIdx === activePostIndex ? { ...post, captions: newCaptions } : post))
        );
        setFeedbackToast('✨ 5 legendas atualizadas!');
        setTimeout(() => setFeedbackToast(null), 3000);
      }
    } finally {
      setGeneratingGroq(false);
    }
  };

  const handleCopyCurrentCaption = () => {
    if (!currentCaption) return;
    navigator.clipboard.writeText(currentCaption.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Renderizar e Baixar Slide em Alta Resolução (1080x1350 HD Full Bleed para foto solo)
  const handleDownloadSlideHD = async () => {
    if (!currentSlide || photos.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1080;
    canvas.height = 1350;

    const slidePhotos = currentSlide.photoIds
      .map((id) => getPhotoById(id))
      .filter((p): p is CullingPhoto => Boolean(p));

    const drawImgOnCanvas = async (photo: CullingPhoto, x: number, y: number, w: number, h: number, radius = 0): Promise<void> => {
      const candidates = getCandidateImageUrls(photo.previewUrl);
      if (candidates.length === 0) return;

      for (const url of candidates) {
        const success = await new Promise<boolean>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.save();
            if (radius > 0) {
              ctx.beginPath();
              ctx.roundRect(x, y, w, h, radius);
              ctx.clip();
            }
            ctx.drawImage(img, x, y, w, h);
            ctx.restore();
            resolve(true);
          };
          img.onerror = () => {
            // Tenta carregar sem crossOrigin como fallback se for mesmo domínio ou blob
            const imgFallback = new Image();
            imgFallback.onload = () => {
              ctx.save();
              if (radius > 0) {
                ctx.beginPath();
                ctx.roundRect(x, y, w, h, radius);
                ctx.clip();
              }
              ctx.drawImage(imgFallback, x, y, w, h);
              ctx.restore();
              resolve(true);
            };
            imgFallback.onerror = () => resolve(false);
            imgFallback.src = url;
          };
          img.src = url;
        });

        if (success) return;
      }
    };

    if (currentSlide.type === 'single' && slidePhotos[0]) {
      // Foto solo: 100% full bleed sem margens, cantos retos (radius = 0), sem contornos
      await drawImgOnCanvas(slidePhotos[0], 0, 0, canvas.width, canvas.height, 0);
    } else if (slidePhotos.length > 0) {
      // Grade 3x3 (9 fotos): Fundo 100% branco, cantos retos (radius = 0), sem contornos
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cols = 3;
      const rows = 3;
      const padding = 12;
      const outerMargin = 20;

      const availableW = canvas.width - outerMargin * 2 - padding * (cols - 1);
      const availableH = canvas.height - outerMargin * 2 - padding * (rows - 1);
      const cellW = availableW / cols;
      const cellH = availableH / rows;

      for (let i = 0; i < Math.min(slidePhotos.length, 9); i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const x = outerMargin + c * (cellW + padding);
        const y = outerMargin + r * (cellH + padding);
        await drawImgOnCanvas(slidePhotos[i], x, y, cellW, cellH, 0);
      }
    }

    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `post_${activePostIndex + 1}_slide_${activeSlideIndex + 1}.jpg`;
      a.click();
    } catch (e) {
      console.error('Erro ao exportar canvas:', e);
    }
  };

  return (
    <div className="mt-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-6">
      <canvas ref={canvasRef} className="hidden" />

      {/* Toast Feedback de Substituição de Foto */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-purple-600 text-white font-bold text-xs shadow-2xl border border-purple-400/30 animate-fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Modal de Escolha de Troca de Foto (IA ou Seleção Manual da Galeria) */}
      {selectingPhotoId && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 animate-scale-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Substituir Foto do Slide</h3>
                  <p className="text-xs text-slate-400">Escolha a substituição automática pela IA ou selecione uma foto específica da galeria ({photos.length} fotos).</p>
                </div>
              </div>

              <button
                onClick={() => setSelectingPhotoId(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Opção 1: Troca Automática pela IA */}
            <button
              onClick={() => handleAutoReplacePhoto(selectingPhotoId)}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/50 to-pink-900/50 hover:from-purple-900 hover:to-pink-900 border border-purple-500/40 text-left transition flex items-center justify-between group shadow-lg shrink-0 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-600 text-white shadow-md">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-amber-200 transition">
                    ✨ Substituir Automaticamente com IA
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    A IA escolhe o próximo melhor clique da galeria que ainda não foi usado no post.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-purple-300 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Opção 2: Grade de Seleção Manual com Busca */}
            <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Ou escolha qualquer foto da galeria:
                </span>
                <input
                  type="text"
                  placeholder="Buscar por nome do arquivo (ex: DSC_001)..."
                  value={modalPhotoSearch}
                  onChange={(e) => setModalPhotoSearch(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 w-64"
                />
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 overflow-y-auto p-1 flex-1 max-h-[340px]">
                {photos
                  .filter((p) => !modalPhotoSearch.trim() || p.fileName.toLowerCase().includes(modalPhotoSearch.toLowerCase()))
                  .map((p) => {
                    const isCurrent = p.id === selectingPhotoId;
                    return (
                      <button
                        key={p.id}
                        disabled={isCurrent}
                        onClick={() => executePhotoSwap(selectingPhotoId, p.id, false)}
                        title={p.fileName}
                        className={`aspect-square rounded-xl overflow-hidden border relative group transition-all cursor-pointer ${
                          isCurrent
                            ? 'border-purple-500 ring-2 ring-purple-500/50 opacity-40 cursor-not-allowed'
                            : 'border-slate-800 hover:border-purple-400 hover:scale-105 shadow-md bg-slate-950'
                        }`}
                      >
                        {p.previewUrl ? (
                          <StudioImage src={p.previewUrl} alt={p.fileName} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[9px] text-slate-500 p-1 text-center truncate">
                            {p.fileName}
                          </div>
                        )}
                        {isCurrent && (
                          <div className="absolute inset-0 bg-slate-950/75 flex items-center justify-center text-[10px] font-bold text-purple-300">
                            Atual
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header do Gerador de Posts */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg shadow-purple-600/30">
            <Instagram className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span>Posts Virais & Legendas de Alta Conversão</span>
              <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30 inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>IA Groq LLM</span>
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Curadoria inteligente · Substituição de foto salva no post · Fotos solo sem bordas.
            </p>
          </div>
        </div>

        {/* Opções de Moldura para Grids */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300 px-3 select-none">
            <input
              type="checkbox"
              checked={allowGrids}
              onChange={(e) => setAllowGrids(e.target.checked)}
              className="w-4 h-4 rounded accent-purple-600 bg-slate-900 border-slate-700"
            />
            <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
            <span>Permitir Grade 3x3 (9 Fotos · Fundo Branco)</span>
          </label>
        </div>
      </div>

      {/* Cards de Seleção dos 5 Posts Sugeridos */}
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
              className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between overflow-hidden group ${
                isActive
                  ? 'bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/40 shadow-xl'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              <div className="space-y-2.5">
                {/* Miniatura Real da Capa do Post */}
                <div className="aspect-[4/3] rounded-none overflow-hidden bg-slate-900 border border-slate-800 relative">
                  {coverPhoto?.previewUrl ? (
                    <StudioImage
                      src={coverPhoto.previewUrl}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">
                      Foto da Capa
                    </div>
                  )}

                  <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-none bg-slate-950/80 text-amber-400 text-[10px] font-black backdrop-blur-sm border border-slate-800 flex items-center gap-0.5">
                    <TrendingUp className="w-2.5 h-2.5" />
                    {post.predictedEngagement}%
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                    <span className={post.approved ? 'text-emerald-400 font-black' : 'text-purple-300'}>
                      {post.approved ? '✓ APROVADO' : `SUGESTÃO #${idx + 1}`}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{post.title}</h4>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1 font-bold text-slate-300">
                  <Layers className="w-3 h-3 text-purple-400" />
                  {post.slides.length} {post.slides.length === 1 ? 'Slide' : 'Slides'}
                </span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-none bg-slate-800 text-slate-300 font-mono">
                  5 Legendas
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Área do Post Selecionado */}
      {currentPost && (
        <div className="bg-slate-950 rounded-3xl border border-slate-800 p-6 space-y-6">
          {/* Header do Post Selecionado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black text-xs border border-amber-500/30 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-amber-400" />
                  Engajamento Previsto: {currentPost.predictedEngagement}%
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs border border-purple-500/30">
                  {currentPost.badgeText}
                </span>
              </div>
              <h3 className="text-base font-black text-white mt-1">{currentPost.title}</h3>
            </div>

            {/* Ações de Aprovar / Recusar Post Completo */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleApprovePost(activePostIndex)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  currentPost.approved
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>{currentPost.approved ? 'Aprovado!' : 'Aprovar Post'}</span>
              </button>

              <button
                onClick={() => handleRejectPost(activePostIndex)}
                title="Recusar e trocar a seleção inteira de fotos deste post"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 text-xs font-bold transition flex items-center gap-1.5"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span>Recusar Post Inteiro</span>
              </button>
            </div>
          </div>

          {/* Grid: Preview do Slide na Esquerda | 5 Legendas na Direita */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Esquerda: Visualizador Instantâneo do Slide em DOM/CSS 4:5 */}
            <div className="lg:col-span-5 flex flex-col items-center space-y-4">
              <div
                className="relative w-full max-w-[340px] aspect-[4/5] rounded-none overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 group"
              >
                {/* Visualização de Slide Único (Foto Inteira Solo 4:5) */}
                {currentSlide?.type === 'single' && (
                  <div className="w-full h-full relative rounded-none">
                    {(() => {
                      const photoId = currentSlide.photoIds[0];
                      const photo = photoId ? getPhotoById(photoId) : undefined;
                      return photo?.previewUrl ? (
                        <>
                          <StudioImage
                            src={photo.previewUrl}
                            alt="Slide Solo"
                            className="w-full h-full object-cover rounded-none"
                          />
                          <button
                            onClick={() => setSelectingPhotoId(photo.id)}
                            title="Trocar esta foto por outra da galeria ou automática"
                            className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-slate-950/85 hover:bg-purple-600 text-white font-bold text-xs shadow-lg backdrop-blur-sm border border-slate-700/80 transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                            <span>Trocar Foto</span>
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                          Foto indisponível
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Visualização de Slide Grade 3x3 (9 Fotos - Fundo Branco, Sem Cantos Arredondados, Sem Contornos) */}
                {currentSlide?.type === 'grid_9' && (
                  <div className="w-full h-full p-2 grid grid-cols-3 grid-rows-3 gap-1 bg-white rounded-none border-0">
                    {currentSlide.photoIds.slice(0, 9).map((id, pIdx) => {
                      const p = getPhotoById(id);
                      return (
                        <div key={pIdx} className="w-full h-full rounded-none overflow-hidden bg-white border-0 relative group/cell">
                          {p?.previewUrl ? (
                            <>
                              <StudioImage src={p.previewUrl} alt={`Grid 9 - ${pIdx}`} className="w-full h-full object-cover rounded-none border-0" />
                              <button
                                onClick={() => setSelectingPhotoId(p.id)}
                                title="Trocar apenas esta foto da grade"
                                className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover/cell:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1 p-1 text-center cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3 text-amber-400" />
                                <span>Trocar</span>
                              </button>
                            </>
                          ) : (
                            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">Foto {pIdx + 1}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Setas do Carrossel */}
                {currentPost.slides.length > 1 && (
                  <>
                    <button
                      disabled={activeSlideIndex === 0}
                      onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/80 hover:bg-slate-950 text-white disabled:opacity-20 transition shadow"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={activeSlideIndex === currentPost.slides.length - 1}
                      onClick={() => setActiveSlideIndex((prev) => Math.min(currentPost.slides.length - 1, prev + 1))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/80 hover:bg-slate-950 text-white disabled:opacity-20 transition shadow"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              {/* Botão de Download do Slide */}
              <div className="w-full max-w-[340px] flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-300">
                  Slide {activeSlideIndex + 1} de {currentPost.slides.length}
                </span>

                <button
                  onClick={handleDownloadSlideHD}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Slide (HD)</span>
                </button>
              </div>

              {/* Seletor de Miniaturas de Slides */}
              {currentPost.slides.length > 1 && (
                <div className="w-full max-w-[340px] flex items-center gap-1.5 overflow-x-auto p-1.5 bg-slate-900 rounded-xl border border-slate-800">
                  {currentPost.slides.map((s, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => setActiveSlideIndex(sIdx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition ${
                        sIdx === activeSlideIndex
                          ? 'bg-purple-600 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Slide {sIdx + 1} ({s.type === 'single' ? 'Foto' : 'Grade 3x3'})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Direita: 5 Opções de Legendas da IA Groq */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Wand2 className="w-4 h-4 text-purple-400" />
                    <span>5 Legendas Geradas pela IA (Escolha a Ideal)</span>
                  </span>

                  <button
                    onClick={() => handleGenerateGroqCaptions(false)}
                    disabled={generatingGroq}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 border border-purple-500/50 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md shadow-purple-600/20"
                  >
                    {generatingGroq ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    <span>{generatingGroq ? 'Gerando com IA...' : 'Re-gerar 5 com IA'}</span>
                  </button>
                </div>

                {/* Direcionar com Palavras-chave */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-purple-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Palavras-chave & Contexto para a IA:</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Pressione Enter ou clique em Re-gerar</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Casamento ao ar livre, pôr do sol, noiva emocionada, vagas abertas 2026..."
                    value={captionKeywords}
                    onChange={(e) => setCaptionKeywords(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleGenerateGroqCaptions(false);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                  />
                  {/* Sugestões Rápidas de Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {[
                      '🌅 Pôr do Sol Dourado',
                      '💍 Votos Emocionantes',
                      '🌿 Campo & Rústico',
                      '✨ Editorial & Elegante',
                      '🖤 P&B Atemporal',
                      '📅 Agenda 2026 Aberta',
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const cleanTag = tag.replace(/^[^\s]+\s/, '');
                          setCaptionKeywords((prev) => (prev ? `${prev}, ${cleanTag}` : cleanTag));
                        }}
                        className="px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-purple-900/60 hover:text-purple-200 text-[10px] font-medium text-slate-400 border border-slate-700/60 transition cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Abas das 5 Opções de Legenda */}
                <div className="space-y-1.5">
                  {currentPost.captions.map((cap, cIdx) => {
                    const isSelected = cIdx === activeCaptionIndex;
                    return (
                      <div
                        key={cap.id}
                        onClick={() => setActiveCaptionIndex(cIdx)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-purple-950/80 border-purple-500 text-white shadow-md'
                            : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <span className="text-xs font-bold flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${cap.approved ? 'bg-emerald-400' : isSelected ? 'bg-purple-400' : 'bg-slate-600'}`} />
                          {cap.title}
                        </span>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleApproveCaption(cap.id)}
                            title="Gostei desta legenda"
                            className={`p-1.5 rounded-lg text-xs transition ${
                              cap.approved ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-emerald-400'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRejectCaption(cap.id)}
                            title="Recusar e Gerar Nova Variação com IA"
                            className={`p-1.5 rounded-lg text-xs transition ${
                              cap.rejected ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-rose-400'
                            }`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Caixa da Legenda Selecionada + Botão Copiar */}
              {currentCaption && (
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-300 flex items-center gap-1.5">
                      <span>{currentCaption.title}</span>
                      {currentCaption.approved && (
                        <span className="text-emerald-400 text-[10px] font-bold">✓ (Aprovada por você)</span>
                      )}
                      <span className="text-slate-500 text-[10px] font-normal">(Você pode editar o texto abaixo)</span>
                    </span>

                    <button
                      onClick={handleCopyCurrentCaption}
                      className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copiado!' : 'Copiar Legenda'}</span>
                    </button>
                  </div>

                  <textarea
                    rows={10}
                    value={currentCaption.text}
                    onChange={(e) => handleEditCaptionText(currentCaption.id, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl p-3.5 text-xs text-slate-200 font-sans focus:outline-none resize-none leading-relaxed"
                  />
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
