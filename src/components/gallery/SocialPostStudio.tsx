import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Download,
  Copy,
  Check,
  Instagram,
  RefreshCw,
  Wand2,
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Camera,
  Layers,
  SlidersHorizontal
} from 'lucide-react';
import type { CullingPhoto } from './AICullingManager';
import { generateCuratedPosts, getCleanPhotoPool } from '../../services/aiCullingEngine';

interface SocialPostStudioProps {
  photos: CullingPhoto[];
  projectTitle?: string;
}

export interface PostSlide {
  type: 'single' | 'grid_6' | 'grid_9';
  photoIds: string[];
  bgTheme: 'white' | 'black';
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
  // Pool estritamente limpo (somente fotos não borradas e com olhos abertos, priorizando as aprovadas)
  const pool = getCleanPhotoPool(photos);

  // Aprendizado de preferências do usuário
  const [prefBg, setPrefBg] = useState<'white' | 'black'>('white');

  // Toggle de Equipamento na Legenda
  const [includeEquipment, setIncludeEquipment] = useState(true);

  // Toggle para desativar grids e usar apenas fotos inteiras solo (VSCO style)
  const [allowGrids, setAllowGrids] = useState(true);

  // Rejection offsets por post para gerar fotos/layouts 100% novos ao clicar em Recusar
  const [rejectionOffsets, setRejectionOffsets] = useState<Record<number, number>>({});

  // Posts Sugeridos pela IA
  const [posts, setPosts] = useState<SuggestedPost[]>([]);
  const [activePostIndex, setActivePostIndex] = useState(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [activeCaptionIndex, setActiveCaptionIndex] = useState(0);

  // Estado de carregamento e cópia
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [copied, setCopied] = useState(false);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [slidePreviewUrl, setSlidePreviewUrl] = useState<string | null>(null);

  // Inicializar as 5 sugestões de posts com capas 100% distintas para cada post
  useEffect(() => {
    if (photos.length === 0) return;
    const curated = generateCuratedPosts(photos, prefBg, includeEquipment, allowGrids, rejectionOffsets);
    setPosts(curated);
    setActiveCaptionIndex(0);
  }, [photos, prefBg, includeEquipment, allowGrids, rejectionOffsets]);

  const currentPost = posts[activePostIndex] || posts[0];
  const currentSlide = currentPost?.slides[activeSlideIndex] || currentPost?.slides[0];
  const currentCaption = currentPost?.captions[activeCaptionIndex] || currentPost?.captions[0];

  // Renderizar o Slide Atual no Canvas sem Marca D'água PriceU$ (Resolução HD 1080x1350)
  useEffect(() => {
    if (!currentSlide || pool.length === 0) return;
    renderSlideCanvas();
  }, [currentSlide, activePostIndex, activeSlideIndex, pool]);

  const renderSlideCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resolução HD 4:5 Instagram Feed (1080x1350)
    canvas.width = 1080;
    canvas.height = 1350;

    ctx.fillStyle = currentSlide.bgTheme === 'white' ? '#ffffff' : '#0a0d14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const slidePhotos = currentSlide.photoIds
      .map((id) => pool.find((p) => p.id === id))
      .filter((p): p is CullingPhoto => Boolean(p));

    if (currentSlide.type === 'single') {
      if (slidePhotos[0]) {
        const margin = currentSlide.bgTheme === 'white' ? 48 : 0;
        await drawImageCover(
          ctx,
          slidePhotos[0],
          margin,
          margin,
          canvas.width - margin * 2,
          canvas.height - margin * 2,
          currentSlide.bgTheme === 'white' ? 12 : 0
        );
      }
    } else {
      const cols = 3;
      const rows = currentSlide.type === 'grid_6' ? 2 : 3;
      const padding = 16;
      const outerMargin = 32;

      const availableW = canvas.width - outerMargin * 2 - padding * (cols - 1);
      const availableH = canvas.height - outerMargin * 2 - padding * (rows - 1);
      const cellW = availableW / cols;
      const cellH = availableH / rows;

      for (let i = 0; i < Math.min(slidePhotos.length, cols * rows); i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const x = outerMargin + c * (cellW + padding);
        const y = outerMargin + r * (cellH + padding);

        await drawImageCover(ctx, slidePhotos[i], x, y, cellW, cellH, 12);
      }
    }

    try {
      setSlidePreviewUrl(canvas.toDataURL('image/jpeg', 0.95));
    } catch {}
  };

  /** Desenha a foto aplicando Rotação EXIF e Edições de Cor (Exposure, Contrast, Vibrance) */
  const drawImageCover = (
    ctx: CanvasRenderingContext2D,
    photo: CullingPhoto,
    x: number,
    y: number,
    w: number,
    h: number,
    radius = 0
  ): Promise<void> => {
    return new Promise((resolve) => {
      const src = photo?.previewUrl;
      // Ignora URLs expiradas (blob:) ou SVG placeholders para evitar erros net::ERR_FILE_NOT_FOUND no console
      if (!src || src.startsWith('blob:') || src.startsWith('data:image/svg')) {
        ctx.fillStyle = currentSlide?.bgTheme === 'white' ? '#f1f5f9' : '#1e293b';
        ctx.fillRect(x, y, w, h);
        resolve();
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.save();

        // 1. Recorte com cantos arredondados se houver raio
        if (radius > 0) {
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, radius);
          ctx.clip();
        }

        // 2. Aplicar Filtros de Cores e Edições Lightroom (Exposure, Contrast, Vibrance)
        const edit = photo.editSettings;
        if (edit) {
          const exposureEv = edit.exposure || 0;
          const contrastPct = 100 + (edit.contrast || 0);
          const vibrancePct = 100 + (edit.vibrance || 0);
          const brightnessPct = Math.max(20, Math.min(200, 100 + exposureEv * 20));
          ctx.filter = `brightness(${brightnessPct}%) contrast(${contrastPct}%) saturate(${vibrancePct}%)`;
        }

        // 3. Aplicar Rotação EXIF (0°, 90°, 180°, 270°)
        const rotation = photo.rotation || 0;
        const centerX = x + w / 2;
        const centerY = y + h / 2;

        if (rotation !== 0) {
          ctx.translate(centerX, centerY);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.translate(-centerX, -centerY);
        }

        const isSwapped = rotation === 90 || rotation === 270;
        const naturalW = isSwapped ? img.height : img.width;
        const naturalH = isSwapped ? img.width : img.height;

        const imgAspect = naturalW / naturalH;
        const boxAspect = w / h;
        let drawW = w;
        let drawH = h;
        let drawX = x;
        let drawY = y;

        if (imgAspect > boxAspect) {
          drawW = h * imgAspect;
          drawX = x - (drawW - w) / 2;
        } else {
          drawH = w / imgAspect;
          drawY = y - (drawH - h) / 2;
        }

        if (isSwapped) {
          ctx.drawImage(img, centerX - drawH / 2, centerY - drawW / 2, drawH, drawW);
        } else {
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
        }

        ctx.restore();
        resolve();
      };
      img.onerror = () => {
        ctx.fillStyle = currentSlide?.bgTheme === 'white' ? '#f1f5f9' : '#1e293b';
        ctx.fillRect(x, y, w, h);
        resolve();
      };
      img.src = src;
    });
  };

  // Aprendizado de Aprovação de Post
  const handleApprovePost = (postIndex: number) => {
    setPosts((prev) =>
      prev.map((p, idx) => (idx === postIndex ? { ...p, approved: true, rejected: false } : p))
    );
    if (currentSlide?.bgTheme) {
      setPrefBg(currentSlide.bgTheme);
    }
  };

  // Recusar Post -> Re-selecionar FOTOS DIFERENTES da Galeria e Mudar Layout
  const handleRejectPost = (postIndex: number) => {
    setRejectionOffsets((prev) => ({
      ...prev,
      [postIndex]: (prev[postIndex] || 0) + 1,
    }));
    setActiveSlideIndex(0);
  };

  // Aprendizado de Aprovação/Recusa de Legenda Específica
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

  const handleRejectCaption = async (captionId: string) => {
    setPosts((prev) =>
      prev.map((post, pIdx) => {
        if (pIdx !== activePostIndex) return post;
        return {
          ...post,
          captions: post.captions.map((cap) =>
            cap.id === captionId ? { ...cap, rejected: true, approved: false } : cap
          ),
        };
      })
    );
    // Dispara geração no Groq IA para substituir a legenda recusada
    await handleRegenerateSingleCaptionWithGroq(captionId);
  };

  // Regenerar 1 legenda no Groq IA se o usuário recusar
  const handleRegenerateSingleCaptionWithGroq = async (targetCaptionId: string) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) return;

    setGeneratingCaption(true);
    const cameraUsed = pool[0]?.cameraModel || 'Canon EOS R6 Mark II';
    const lensUsed = pool[0]?.lensModel || 'RF 50mm f/1.2L USM';
    const iso = pool[0]?.iso || 400;
    const aperture = pool[0]?.aperture || 'f/1.8';
    const shutter = pool[0]?.shutterSpeed || '1/1250s';

    const equipSnippet = includeEquipment
      ? `\n\n📸 Equipamento: ${cameraUsed} + ${lensUsed} | ISO ${iso} • ${aperture} • ${shutter}`
      : '';

    const prompt = `Você é um Copywriter especialista no mercado de fotografia de casamentos e ensaios premium.
O usuário recusou a legenda anterior. Crie UMA NOVA LEGENDA COMPLETAMENTE DIFERENTE e altamente engajadora para o Instagram.

Informações do ensaio:
- Título: "${projectTitle || 'Ensaio Fotográfico Principal'}"
- Formato: "${currentPost?.title || 'Post Especial'}"
${equipSnippet}

Requisitos da nova legenda:
1. Comece com 1 frase forte e impactante.
2. 2 a 3 parágrafos curtos envolventes com emojis adequados.
3. Inclua a chamada para ação (CTA) para o link na bio.
4. Adicione 10 a 15 hashtags virais de fotografia.

Responda APENAS com o texto da legenda final pronto para postar, sem comentários.`;

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
          max_tokens: 600,
        }),
      });

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || 'Nova legenda gerada pela IA.';

      setPosts((prev) =>
        prev.map((post, pIdx) => {
          if (pIdx !== activePostIndex) return post;
          return {
            ...post,
            captions: post.captions.map((cap) =>
              cap.id === targetCaptionId ? { ...cap, text, rejected: false, approved: true } : cap
            ),
          };
        })
      );
    } catch {
      // Graceful fallback
    } finally {
      setGeneratingCaption(false);
    }
  };

  const handleCopyCurrentCaption = () => {
    if (!currentCaption) return;
    navigator.clipboard.writeText(currentCaption.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadSlide = () => {
    if (!slidePreviewUrl) return;
    const a = document.createElement('a');
    a.href = slidePreviewUrl;
    a.download = `post_${activePostIndex + 1}_slide_${activeSlideIndex + 1}.jpg`;
    a.click();
  };

  return (
    <div className="mt-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-6">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header do Estúdio Social */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg shadow-purple-600/30">
            <Instagram className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span>Sugestões de Posts Virais & Legendas Inteligentes (IA Groq)</span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                5+ Sugestões · 5 Legendas por Post
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Zero marcas d'água · Aprendizado da IA com aprovação/recusa · Molduras Clean · Dados do Equipamento opcionais.
            </p>
          </div>
        </div>

        {/* Alternador de Fundo & Toggle de Equipamento */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-950 p-2 rounded-2xl border border-slate-800 shrink-0">
          {/* Toggle para incluir Equipamento na Legenda */}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300 px-2 select-none">
            <input
              type="checkbox"
              checked={includeEquipment}
              onChange={(e) => setIncludeEquipment(e.target.checked)}
              className="w-4 h-4 rounded accent-purple-600 bg-slate-900 border-slate-700"
            />
            <Camera className="w-3.5 h-3.5 text-purple-400" />
            <span>Incluir Equipamento</span>
          </label>

          <span className="text-slate-700 text-xs">|</span>

          {/* Toggle para Desativar Grids e Usar Apenas Fotos Solo (VSCO Style) */}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300 px-2 select-none">
            <input
              type="checkbox"
              checked={allowGrids}
              onChange={(e) => setAllowGrids(e.target.checked)}
              className="w-4 h-4 rounded accent-purple-600 bg-slate-900 border-slate-700"
            />
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Permitir Grids (6 e 9 fotos)</span>
          </label>

          <span className="text-slate-700 text-xs">|</span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPrefBg('white')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                prefBg === 'white' ? 'bg-white text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              ☀️ Branco Clean
            </button>
            <button
              onClick={() => setPrefBg('black')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                prefBg === 'black' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              🌙 Preto Editorial
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Seleção das 5+ Sugestões de Posts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {posts.map((post, idx) => {
          const isActive = idx === activePostIndex;
          return (
            <button
              key={post.id}
              onClick={() => {
                setActivePostIndex(idx);
                setActiveSlideIndex(0);
                setActiveCaptionIndex(0);
              }}
              className={`p-3 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                isActive
                  ? 'bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/40 shadow-lg'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                  <span className={post.approved ? 'text-emerald-400 font-extrabold' : 'text-purple-300'}>
                    {post.approved ? '✓ APROVADO' : `SUGESTÃO #${idx + 1}`}
                  </span>
                  <span className="text-amber-400 flex items-center gap-0.5">
                    <TrendingUp className="w-2.5 h-2.5" />
                    {post.predictedEngagement}%
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white line-clamp-2">{post.title}</h4>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{post.description}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1 font-bold text-slate-300">
                  <Layers className="w-3 h-3 text-purple-400" />
                  {post.slides.length} {post.slides.length === 1 ? 'Slide' : 'Slides'}
                </span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  5 Legendas
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Área Principal de Visualização do Post Selecionado */}
      {currentPost && (
        <div className="bg-slate-950 rounded-3xl border border-slate-800 p-6 space-y-6">
          {/* Barra de Status do Post + Aprendizado da IA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black text-xs border border-amber-500/30 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-amber-400" />
                  Previsão de Engajamento: {currentPost.predictedEngagement}%
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs border border-purple-500/30">
                  {currentPost.badgeText}
                </span>
              </div>
              <h3 className="text-base font-black text-white mt-1">{currentPost.title}</h3>
              <p className="text-xs text-slate-400">{currentPost.description}</p>
            </div>

            {/* Aprendizado da IA do Post */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleApprovePost(activePostIndex)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  currentPost.approved
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>{currentPost.approved ? 'Aprovado!' : 'Aprovar Sugestão'}</span>
              </button>

              <button
                onClick={() => handleRejectPost(activePostIndex)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 text-xs font-bold transition flex items-center gap-1.5"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span>Recusar (Gerar Outro)</span>
              </button>
            </div>
          </div>

          {/* Grid de Conteúdo: Visualizador de Slide à esquerda, Seletor das 5 Legendas à direita */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Esquerda: Visualizador de Slide 4:5 sem Marca d'água */}
            <div className="lg:col-span-6 flex flex-col items-center space-y-3">
              <div className="relative w-full max-w-sm aspect-[4/5] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center">
                {slidePreviewUrl ? (
                  <img src={slidePreviewUrl} alt="Slide Preview" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Gerando slide em alta qualidade...</span>
                  </div>
                )}

                {/* Setas do Carrossel */}
                {currentPost.slides.length > 1 && (
                  <>
                    <button
                      disabled={activeSlideIndex === 0}
                      onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 hover:bg-black text-white disabled:opacity-30 transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={activeSlideIndex === currentPost.slides.length - 1}
                      onClick={() => setActiveSlideIndex((prev) => Math.min(currentPost.slides.length - 1, prev + 1))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 hover:bg-black text-white disabled:opacity-30 transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              {/* Controles do Slide + Botão Download */}
              <div className="w-full max-w-sm flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-300">
                  Slide {activeSlideIndex + 1} de {currentPost.slides.length} ({currentSlide?.type.toUpperCase()})
                </span>

                <button
                  onClick={handleDownloadSlide}
                  disabled={!slidePreviewUrl}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Slide ({activeSlideIndex + 1})</span>
                </button>
              </div>

              {/* Seletor de Miniaturas de Slides */}
              {currentPost.slides.length > 1 && (
                <div className="w-full max-w-sm flex items-center gap-2 overflow-x-auto p-2 bg-slate-900 rounded-xl border border-slate-800">
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
                      Slide {sIdx + 1} ({s.type === 'single' ? '1 Foto' : s.type === 'grid_6' ? 'Grid 6' : 'Grid 9'})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Direita: 5 Opções de Legendas com Aprendizado & IA Groq */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Wand2 className="w-4 h-4 text-purple-400" />
                    <span>5 Legendas Sugeridas pela IA (Escolha a Ideal)</span>
                  </span>
                  <span className="text-[10px] text-purple-300 font-mono">
                    Groq IA (llama-3.3-70b)
                  </span>
                </div>

                {/* Tabs das 5 Sugestões de Legenda por Post */}
                <div className="grid grid-cols-1 gap-1.5">
                  {currentPost.captions.map((cap, cIdx) => {
                    const isSelected = cIdx === activeCaptionIndex;
                    return (
                      <div
                        key={cap.id}
                        onClick={() => setActiveCaptionIndex(cIdx)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-purple-950/80 border-purple-500 text-white shadow'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
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
                            className={`p-1 rounded-lg text-xs transition ${
                              cap.approved ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-emerald-400'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleRejectCaption(cap.id)}
                            title="Recusar e Gerar Nova Legenda com IA"
                            className={`p-1 rounded-lg text-xs transition ${
                              cap.rejected ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-rose-400'
                            }`}
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Exibição da Legenda Selecionada + Botão Copiar */}
              {currentCaption && (
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2 relative">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-bold text-purple-300">
                      {currentCaption.title} {currentCaption.approved && '✓ (Aprovada por você)'}
                    </span>
                    <button
                      onClick={handleCopyCurrentCaption}
                      className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow transition"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copiado!' : 'Copiar Legenda'}</span>
                    </button>
                  </div>

                  <textarea
                    readOnly
                    rows={9}
                    value={currentCaption.text}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-sans focus:outline-none resize-none"
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
