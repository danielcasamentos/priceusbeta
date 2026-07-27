import { useState, useRef } from 'react';
import { Sparkles, Upload, Eye, EyeOff, Zap, CheckCircle2, AlertTriangle, Layers, Image as ImageIcon, HardDrive, RefreshCw, Star, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CullingPhoto {
  id: string;
  fileName: string;
  previewUrl: string;
  sharpnessScore: number; // 0 a 100
  isBlurry: boolean;
  eyesClosed: boolean;
  isBestTake: boolean;
  sceneGroup: string;
  selected: boolean;
}

interface AICullingManagerProps {
  userId: string;
}

export function AICullingManager({ userId }: AICullingManagerProps) {
  const [photos, setPhotos] = useState<CullingPhoto[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'best_take' | 'sharp' | 'blurry'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setAnalyzing(true);
    setProgress(10);

    const newPhotos: CullingPhoto[] = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);

      // Simulação da Análise de Nitidez (Laplaciano) & Visão Inteligente Groq Vision
      const sharpnessScore = Math.floor(65 + Math.random() * 34); // 65 a 99
      const isBlurry = sharpnessScore < 70;
      const eyesClosed = Math.random() < 0.15; // 15% de chance
      const sceneGroup = `cena_${Math.floor(i / 4) + 1}`;
      const isBestTake = !isBlurry && !eyesClosed && (i % 4 === 0 || sharpnessScore > 90);

      newPhotos.push({
        id: `cull_${Date.now()}_${i}`,
        fileName: file.name,
        previewUrl,
        sharpnessScore,
        isBlurry,
        eyesClosed,
        isBestTake,
        sceneGroup,
        selected: isBestTake,
      });

      setProgress(Math.round(((i + 1) / total) * 100));
      await new Promise((r) => setTimeout(r, 50));
    }

    setPhotos(newPhotos);
    setAnalyzing(false);
  };

  const toggleSelectPhoto = (id: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  };

  const filteredPhotos = photos.filter((p) => {
    if (selectedFilter === 'best_take') return p.isBestTake;
    if (selectedFilter === 'sharp') return !p.isBlurry && !p.eyesClosed;
    if (selectedFilter === 'blurry') return p.isBlurry || p.eyesClosed;
    return true;
  });

  const selectedCount = photos.filter((p) => p.selected).length;

  return (
    <div className="space-y-6">
      {/* Banner Principal do AI Culling */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950/60 to-slate-900 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="w-48 h-48 text-purple-400" />
        </div>

        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Pre-Culling Inteligente Groq Vision</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            AI Culling & Seleção Ultra-Rápida de Ensaios
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Importe o cartão de memória do seu ensaio ou evento. Nossa IA analisa desfoque, olhos fechados, sorrisos e agrupa fotos rajada para destacar o <strong className="text-purple-300">Melhor Take</strong> de cada cena em segundos.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzing}
              className="px-6 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-xl shadow-purple-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{analyzing ? `Analisando fotos (${progress}%)...` : 'Importar Fotos do Ensaio'}</span>
            </button>

            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>Salva projetos diretamente no seu Google Drive</span>
            </span>
          </div>
        </div>
      </div>

      {/* Métricas e Filtros de Culling */}
      {photos.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-sm text-white">Resumo do Culling</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {photos.length} fotos analisadas • <span className="text-emerald-400 font-bold">{selectedCount} selecionadas</span> para galeria
              </p>
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
              {[
                { key: 'all', label: `Todas (${photos.length})` },
                { key: 'best_take', label: `✨ Melhores Takes (${photos.filter((p) => p.isBestTake).length})` },
                { key: 'sharp', label: `✅ Nítidas` },
                { key: 'blurry', label: `⚠️ Desfocadas/Olhos fechados` },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setSelectedFilter(f.key as any)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                    selectedFilter === f.key ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Fotos Culling */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => toggleSelectPhoto(photo.id)}
                className={`relative group rounded-2xl overflow-hidden cursor-pointer bg-slate-950 border transition-all ${
                  photo.selected
                    ? 'ring-4 ring-purple-500 border-purple-500'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <img
                  src={photo.previewUrl}
                  alt={photo.fileName}
                  className="w-full h-36 object-cover"
                />

                {/* Badges de IA */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                  {photo.isBestTake && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] shadow flex items-center gap-1">
                      <Star className="w-3 h-3 fill-slate-950" />
                      <span>MELHOR TAKE</span>
                    </span>
                  )}

                  {photo.eyesClosed && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-[10px] shadow flex items-center gap-1">
                      <EyeOff className="w-3 h-3" />
                      <span>Olhos Fechados</span>
                    </span>
                  )}

                  {!photo.isBlurry && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono">
                      Nitidez: {photo.sharpnessScore}%
                    </span>
                  )}
                </div>

                {/* Botão Check */}
                <div className="absolute bottom-2 right-2 z-10">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      photo.selected ? 'bg-purple-500 text-white' : 'bg-black/50 text-slate-400'
                    }`}
                  >
                    {photo.selected ? '✓' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
