import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Download,
  Instagram,
  X,
  Type,
  Palette,
  Layout,
  Sliders,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Eye,
} from 'lucide-react';
import type { CullingPhoto } from './AICullingManager';
import { getCandidateImageUrls } from './SocialPostStudio';
import { publishStoryToInstagram } from '../../services/instagramPublishService';

interface StoryArtStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: CullingPhoto[];
  projectTitle?: string;
}

const STORY_PRESET_TEMPLATES = [
  {
    id: 'promo_open',
    title: '✨ Agenda Aberta 2026',
    headline: 'AGENDA 2026 ABERTA',
    subtitle: 'Garanta a cobertura inesquecível do seu casamento com datas exclusivas.',
    cta: '🔗 LINK NA BIO PARA ORÇAMENTOS',
    font: 'serif',
    textColor: '#ffffff',
    overlayOpacity: 45,
    highlightBg: 'rgba(0,0,0,0.5)',
  },
  {
    id: 'pre_wedding',
    title: '💍 Ensaio Pré-Wedding',
    headline: 'HISTÓRIAS REAIS',
    subtitle: 'A beleza dos momentos espontâneos e a emoção de eternizar o seu amor.',
    cta: '💬 MANDE UM DIRECT',
    font: 'sans',
    textColor: '#ffffff',
    overlayOpacity: 40,
    highlightBg: 'rgba(168,85,247,0.4)',
  },
  {
    id: 'fine_art',
    title: '🖤 Editorial Fine Art',
    headline: 'ESTÉTICA & EMOÇÃO',
    subtitle: 'Fotografia com alma, luz natural e direção acolhedora para o seu dia especial.',
    cta: '👉 RESERVE SUA DATA',
    font: 'serif',
    textColor: '#fef08a',
    overlayOpacity: 55,
    highlightBg: 'rgba(0,0,0,0.65)',
  },
];

export function StoryArtStudioModal({
  isOpen,
  onClose,
  photos,
  projectTitle,
}: StoryArtStudioModalProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [headline, setHeadline] = useState('AGENDA 2026 ABERTA');
  const [subtitle, setSubtitle] = useState('Garanta a memória do seu casamento com registros inesquecíveis.');
  const [ctaText, setCtaText] = useState('🔗 CLIQUE NO LINK DA BIO');
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans' | 'mono'>('serif');
  const [textColor, setTextColor] = useState('#ffffff');
  const [overlayOpacity, setOverlayOpacity] = useState(45);
  const [textPosition, setTextPosition] = useState<'center' | 'bottom' | 'top'>('center');
  const [isPublishingStory, setIsPublishingStory] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePhoto = photos[selectedPhotoIndex] || photos[0];

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof STORY_PRESET_TEMPLATES[0]) => {
    setHeadline(preset.headline);
    setSubtitle(preset.subtitle);
    setCtaText(preset.cta);
    setFontFamily(preset.font as any);
    setTextColor(preset.textColor);
    setOverlayOpacity(preset.overlayOpacity);
  };

  const renderStoryCanvas = async (): Promise<string | null> => {
    if (!activePhoto) return null;
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = 1080;
    canvas.height = 1920;

    // 1. Draw Background Image
    const candidates = getCandidateImageUrls(activePhoto.previewUrl);
    let imgLoaded = false;

    for (const url of candidates) {
      const ok = await new Promise<boolean>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          // Cover 9:16 crop
          const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
          const x = (canvas.width - img.width * scale) / 2;
          const y = (canvas.height - img.height * scale) / 2;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          resolve(true);
        };
        img.onerror = () => resolve(false);
        img.src = url;
      });
      if (ok) {
        imgLoaded = true;
        break;
      }
    }

    if (!imgLoaded) {
      ctx.fillStyle = '#111b21';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Dark Overlay
    ctx.fillStyle = `rgba(0, 0, 0, ${overlayOpacity / 100})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Draw Typography & Texts
    const fontPrimary =
      fontFamily === 'serif'
        ? '"Cinzel", "Playfair Display", "Times New Roman", serif'
        : fontFamily === 'mono'
        ? '"Courier New", monospace'
        : '"Inter", "Montserrat", sans-serif';

    let baseY = textPosition === 'top' ? 450 : textPosition === 'bottom' ? 1300 : 960;

    // Headline
    if (headline.trim()) {
      ctx.textAlign = 'center';
      ctx.fillStyle = textColor;
      ctx.font = `bold 64px ${fontPrimary}`;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
      ctx.fillText(headline.toUpperCase(), canvas.width / 2, baseY - 60);
    }

    // Subtitle
    if (subtitle.trim()) {
      ctx.font = `32px "Inter", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 10;

      // Word wrap
      const maxWidth = 860;
      const words = subtitle.split(' ');
      let line = '';
      let lineY = baseY + 20;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, canvas.width / 2, lineY);
          line = words[n] + ' ';
          lineY += 45;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, canvas.width / 2, lineY);
    }

    // CTA Badge Button
    if (ctaText.trim()) {
      const ctaY = baseY + 180;
      ctx.font = `bold 28px "Inter", sans-serif`;
      const textMetrics = ctx.measureText(ctaText);
      const btnW = textMetrics.width + 60;
      const btnH = 64;
      const btnX = (canvas.width - btnW) / 2;

      // Pill button
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(btnX, ctaY - 44, btnW, btnH, 32);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#111b21';
      ctx.shadowBlur = 0;
      ctx.fillText(ctaText, canvas.width / 2, ctaY);
    }

    return canvas.toDataURL('image/jpeg', 0.95);
  };

  const handleDownloadStoryHD = async () => {
    const dataUrl = await renderStoryCanvas();
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `story_art_${Date.now()}.jpg`;
    a.click();
    setToast('✨ Story baixado em 1080x1920 HD!');
    setTimeout(() => setToast(null), 3000);
  };

  const handlePublishStoryDirect = async () => {
    setIsPublishingStory(true);
    try {
      const targetAccountId = import.meta.env.VITE_INSTAGRAM_ACCOUNT_ID || '1078116504671958';
      const photoUrl = activePhoto?.previewUrl;
      if (!photoUrl) throw new Error('Foto não selecionada');

      const res = await publishStoryToInstagram(targetAccountId, photoUrl);
      if (res.success) {
        setToast('🎉 Story publicado diretamente no Instagram!');
        setTimeout(() => setToast(null), 4000);
      } else {
        throw new Error(res.error || 'Erro ao publicar no Instagram');
      }
    } catch (err: any) {
      alert(`Erro na publicação: ${err.message || 'Verifique as permissões'}`);
    } finally {
      setIsPublishingStory(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <canvas ref={canvasRef} className="hidden" />

      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-top">
          <Check className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      <div className="w-full max-w-5xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Criador de Artes para Stories (9:16 HD)</h3>
              <p className="text-xs text-slate-400">Personalize títulos elegantes, ofertas, avisos de agenda e publique direto no Instagram.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Esquerda: Editor & Controles (7 colunas) */}
          <div className="lg:col-span-7 space-y-4 text-xs">
            {/* Presets Rápidos */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Modelos Prontos de Alta Conversão:</label>
              <div className="grid grid-cols-3 gap-2">
                {STORY_PRESET_TEMPLATES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleApplyPreset(p)}
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-purple-950/60 border border-slate-800 hover:border-purple-500 text-left transition space-y-1"
                  >
                    <span className="font-bold text-white block truncate">{p.title}</span>
                    <span className="text-[10px] text-slate-400 block line-clamp-1">{p.headline}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs de Texto */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Título Principal (Headline):</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Ex: AGENDA 2026 ABERTA"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 font-bold text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Subtítulo / Descrição da Oferta:</label>
                <textarea
                  rows={2}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Ex: Garanta sua data com condição especial de lançamento..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Botão de Chamada (CTA):</label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Ex: 🔗 CLIQUE NO LINK DA BIO"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 font-bold text-white outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Configurações de Estilo & Tipografia */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Estilo de Fonte:</label>
                <div className="flex gap-1.5">
                  {[
                    { id: 'serif', label: 'Elegante (Serif)' },
                    { id: 'sans', label: 'Moderna (Sans)' },
                    { id: 'mono', label: 'Minimalista' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFontFamily(f.id as any)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
                        fontFamily === f.id ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Escurecimento do Fundo ({overlayOpacity}%):</label>
                <input
                  type="range"
                  min={10}
                  max={80}
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>
            </div>

            {/* Seletor de Foto da Galeria */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Escolha a Foto de Fundo do Ensaio:</label>
              <div className="flex items-center gap-2 overflow-x-auto p-2 bg-slate-950 rounded-2xl border border-slate-800">
                {photos.slice(0, 15).map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPhotoIndex(idx)}
                    className={`w-14 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition ${
                      selectedPhotoIndex === idx ? 'border-purple-500 ring-2 ring-purple-500/40' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={p.previewUrl} alt={`Foto ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Direita: Preview Vertical 9:16 (5 colunas) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-between space-y-4">
            {/* Visualizador 9:16 Realtime */}
            <div className="w-[240px] aspect-[9/16] rounded-2xl overflow-hidden relative shadow-2xl border border-slate-800 bg-black flex flex-col justify-center items-center text-center p-4 select-none">
              {/* Background Photo */}
              {activePhoto?.previewUrl && (
                <img
                  src={activePhoto.previewUrl}
                  alt="Story Preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* Dark Overlay */}
              <div
                className="absolute inset-0 bg-black transition-opacity"
                style={{ opacity: overlayOpacity / 100 }}
              />

              {/* Typography Preview */}
              <div className="relative z-10 space-y-2 px-1">
                {headline.trim() && (
                  <h4
                    className="font-extrabold text-lg text-white drop-shadow-md tracking-wider leading-tight"
                    style={{
                      fontFamily: fontFamily === 'serif' ? 'serif' : 'sans-serif',
                      color: textColor,
                    }}
                  >
                    {headline}
                  </h4>
                )}

                {subtitle.trim() && (
                  <p className="text-[10px] text-white/90 leading-relaxed font-sans drop-shadow">
                    {subtitle}
                  </p>
                )}

                {ctaText.trim() && (
                  <div className="pt-2">
                    <span className="inline-block px-3 py-1.5 rounded-full bg-white text-slate-950 font-extrabold text-[9px] shadow-lg">
                      {ctaText}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="w-full space-y-2">
              <button
                onClick={handleDownloadStoryHD}
                className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Arte do Story (1080x1920 HD)</span>
              </button>

              <button
                onClick={handlePublishStoryDirect}
                disabled={isPublishingStory}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-90 text-white font-extrabold text-xs shadow-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isPublishingStory ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Publicando no Story...</span>
                  </>
                ) : (
                  <>
                    <Instagram className="w-4 h-4" />
                    <span>Postar Direto no Instagram Story</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
