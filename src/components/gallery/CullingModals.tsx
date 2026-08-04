import { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  Globe,
  Camera,
  Layers,
  Star,
  Trash2,
  HardDrive,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Zap,
  Check,
  Copy,
  ExternalLink,
  DollarSign,
  Users,
  Instagram,
  FolderUp,
  Upload,
  FileImage,
  Sliders,
  Palette,
  SlidersHorizontal,
  Wand2,
  Terminal,
  AlertTriangle,
} from 'lucide-react';
import { CullingPhoto } from './AICullingManager';
import { GalleryService } from '../../services/galleryService';
import { NotificationService } from '../../services/notificationService';
import { scanDataTransferItems, scanFileListWithDirectory, ScannedFileItem } from '../../services/folderScanner';
import { AiLogEntry } from '../../services/groqCullingService';

interface CullingImportAndProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  analyzing: boolean;
  progress: number;
  totalFiles: number;
  processedCount: number;
  currentFileName?: string;
  onSelectFiles: (files: File[], scannedItems?: ScannedFileItem[]) => void;
  logs?: AiLogEntry[];
}

export function CullingImportAndProgressModal({
  isOpen,
  onClose,
  analyzing,
  progress,
  totalFiles,
  processedCount,
  currentFileName,
  onSelectFiles,
  logs = [],
}: CullingImportAndProgressModalProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const scannedItems = scanFileListWithDirectory(files);
      const fileList = scannedItems.map((item) => item.file);
      onSelectFiles(fileList, scannedItems);
    }
  };

  const handleOpenDirectoryPicker = () => {
    folderInputRef.current?.click();
  };

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    const scannedItems = await scanDataTransferItems(items);
    if (scannedItems.length > 0) {
      const fileList = scannedItems.map((item) => item.file);
      onSelectFiles(fileList, scannedItems);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-purple-500/30 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl text-white relative">
        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {analyzing ? 'Analisando Ensaio com IA...' : 'Importar Pasta Principal com Subpastas'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {analyzing
                  ? 'Processando RAWs, nitidez e curadoria inteligente'
                  : 'Suporta 14.000+ fotos e subpastas organizadas'}
              </p>
            </div>
          </div>
          {!analyzing && (
            <button onClick={onClose} type="button" className="p-1.5 text-slate-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {analyzing ? (
            <div className="space-y-4 py-1">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold font-mono">
                  <span className="text-purple-300">Processando: {processedCount} de {totalFiles} fotos</span>
                  <span className="text-purple-400 font-extrabold">{progress}%</span>
                </div>
                <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-emerald-400 rounded-full transition-all duration-300 shadow-lg shadow-purple-500/50"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300 truncate">
                  <span className="text-slate-500">Arquivo Atual:</span>
                  <span className="font-mono text-purple-300 truncate max-w-[240px]">{currentFileName || 'Carregando...'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">Motor de IA:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-emerald-400" /> Groq Vision AI + Laplaciano EXIF
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-purple-300 font-semibold flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin text-purple-400" /> Detecção de Foco & Subpastas
                  </span>
                </div>
              </div>

              {/* Terminal de Log da IA em Tempo Real (Mostra se Groq Vision está rodando ou estourou cota) */}
              {logs.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-[11px] font-mono max-h-52 overflow-y-auto shadow-inner">
                  <div className="flex items-center justify-between text-slate-400 font-bold border-b border-slate-800/80 pb-1.5">
                    <span className="flex items-center gap-1.5 text-purple-400">
                      <Terminal className="w-3.5 h-3.5" /> Console de Logs da IA em Tempo Real
                    </span>
                    <span className="text-[10px] text-slate-500">{logs.length} eventos</span>
                  </div>
                  {logs.map((log) => (
                    <div key={log.id} className="space-y-0.5 leading-relaxed">
                      <div className={`flex items-start gap-1.5 ${
                        log.type === 'groq_quota' ? 'text-amber-400 font-bold bg-amber-500/10 p-1 rounded' :
                        log.type === 'groq_success' ? 'text-emerald-400' :
                        log.type === 'error' ? 'text-rose-400 font-bold' :
                        log.type === 'warning' ? 'text-amber-300' :
                        log.type === 'subfolder' ? 'text-blue-400' : 'text-slate-300'
                      }`}>
                        <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                        <span>{log.message}</span>
                      </div>
                      {log.details && (
                        <div className="pl-14 text-[10px] text-slate-500 italic font-sans">{log.details}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-3xl p-8 text-center space-y-5 transition-all ${
                isDraggingOver
                  ? 'border-purple-400 bg-purple-950/30 scale-[1.01]'
                  : 'border-slate-800 bg-slate-950/60 hover:border-purple-500/50'
              }`}
            >
              <input
                type="file"
                ref={folderInputRef}
                {...({ webkitdirectory: "", directory: "" } as any)}
                multiple
                onChange={handleFolderInputChange}
                className="hidden"
              />

              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/*,.cr2,.cr3,.nef,.nrw,.arw,.srf,.sr2,.raf,.rw2,.raw,.orf,.dng,.3fr,.iiq"
                onChange={handleFolderInputChange}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-400 mx-auto flex items-center justify-center shadow-lg shadow-purple-500/20">
                <FolderUp className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Arraste a Pasta Principal do Casamento Aqui</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Escaneia todas as subpastas organizadas (ex: 01_MakingOf, 02_Cerimonia) e analisa até 14.000+ fotos sem travar.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleOpenDirectoryPicker}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FolderUp className="w-4 h-4" />
                  <span>Selecionar Pasta Principal (Subpastas Inclusas)</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenFilePicker}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Selecionar Arquivos</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface CullingAiTuningModalProps {
  isOpen: boolean;
  onClose: () => void;
  sharpnessThreshold: number;
  setSharpnessThreshold: (val: number) => void;
  targetSelectionRatio: number;
  setTargetSelectionRatio: (val: number) => void;
  expressionRigor: 'strict' | 'moderate' | 'relaxed';
  setExpressionRigor: (val: 'strict' | 'moderate' | 'relaxed') => void;
  trainedPresetName: string | null;
  setTrainedPresetName: (val: string | null) => void;
  enableAiRetouching: boolean;
  setEnableAiRetouching: (val: boolean) => void;
  userPresetPref?: any;
  onUpdateUserPresetPref?: (updates: any) => void;
}

export function CullingAiTuningModal({
  isOpen,
  onClose,
  sharpnessThreshold,
  setSharpnessThreshold,
  targetSelectionRatio,
  setTargetSelectionRatio,
  expressionRigor,
  setExpressionRigor,
  trainedPresetName,
  setTrainedPresetName,
  enableAiRetouching,
  setEnableAiRetouching,
  userPresetPref,
  onUpdateUserPresetPref,
}: CullingAiTuningModalProps) {
  const presetInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleUploadPreset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      setTrainedPresetName(cleanName);
      if (onUpdateUserPresetPref) {
        onUpdateUserPresetPref({ presetName: cleanName });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-purple-500/30 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl text-white">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Treinamento & Ponderação da IA</h3>
              <p className="text-[11px] text-slate-400">Configure o rigor de seleção, culling e ajuste de cores com seu Preset</p>
            </div>
          </div>
          <button onClick={onClose} type="button" className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs max-h-[85vh] overflow-y-auto">
          {/* 1. Treinamento de Estilo / Preset Lightroom */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-300 font-bold">
                <Palette className="w-4 h-4 text-purple-400" />
                <span>Estilo & Preset do Usuário (.xmp / .lrtemplate)</span>
              </div>
              <span className="text-[10px] font-mono bg-purple-950 px-2 py-0.5 rounded text-purple-300 border border-purple-500/30">
                {userPresetPref?.presetName || trainedPresetName || 'Signature Boho Edit'}
              </span>
            </div>

            {/* Slider de Intensidade do Preset (%) */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-slate-300 font-bold">
                <span>Intensidade do Preset no Ensaio</span>
                <span className="font-mono text-purple-400">{userPresetPref?.presetIntensity || 85}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={userPresetPref?.presetIntensity || 85}
                onChange={(e) => onUpdateUserPresetPref?.({ presetIntensity: parseInt(e.target.value) })}
                className="w-full accent-purple-500"
              />
            </div>

            <input
              type="file"
              ref={presetInputRef}
              accept=".xmp,.lrtemplate"
              onChange={handleUploadPreset}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => presetInputRef.current?.click()}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Carregar Novo Preset (.xmp)</span>
            </button>
          </div>

          {/* 2. Auto-Upright & Preto e Branco */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between cursor-pointer">
              <div className="space-y-0.5">
                <span className="font-bold text-white block">Auto-Upright (Alinhamento Automático de Horizonte)</span>
                <span className="text-[10px] text-slate-400">Corrige automaticamente verticais tortas e horizontes inclinados</span>
              </div>
              <input
                type="checkbox"
                checked={userPresetPref?.autoStraighten ?? true}
                onChange={(e) => onUpdateUserPresetPref?.({ autoStraighten: e.target.checked })}
                className="w-4 h-4 accent-purple-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between cursor-pointer pt-2 border-t border-slate-900">
              <div className="space-y-0.5">
                <span className="font-bold text-white block">Criação Automática de Cópias Preto & Branco (P&B)</span>
                <span className="text-[10px] text-slate-400">Gera cópias P&B Fine Art das fotos de maior contraste e expressão</span>
              </div>
              <input
                type="checkbox"
                checked={userPresetPref?.createBwVariants ?? true}
                onChange={(e) => onUpdateUserPresetPref?.({ createBwVariants: e.target.checked })}
                className="w-4 h-4 accent-purple-600 rounded"
              />
            </div>
          </div>

          {/* 3. Rigor de Nitidez e Foco */}
          <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex justify-between items-center text-slate-200">
              <span className="font-bold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-400" /> Rigor de Nitidez e Foco
              </span>
              <span className="font-mono font-bold text-purple-400">{sharpnessThreshold}%</span>
            </div>
            <input
              type="range"
              min="60"
              max="90"
              value={sharpnessThreshold}
              onChange={(e) => setSharpnessThreshold(parseInt(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          {/* 4. Retouching e Remoção de Imperfeições */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between cursor-pointer">
            <div className="space-y-0.5">
              <span className="font-bold text-white block">AI Retouching & Limpeza de Elementos Indesejados</span>
              <span className="text-[10px] text-slate-400">Remove imperfeições temporárias de pele e sujeiras no fundo</span>
            </div>
            <input
              type="checkbox"
              checked={enableAiRetouching}
              onChange={(e) => setEnableAiRetouching(e.target.checked)}
              className="w-4 h-4 accent-purple-600 rounded"
            />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-xl shadow-purple-600/30 transition flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <Check className="w-4 h-4" />
            <span>Salvar Configurações da IA</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface CullingPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPublish: (galleryTitle: string) => void;
  selectedPhotos: CullingPhoto[];
  totalPhotosCount: number;
  discardedCount: number;
  userId: string;
}

export function CullingPublishModal({
  isOpen,
  onClose,
  onConfirmPublish,
  selectedPhotos,
  totalPhotosCount,
  discardedCount,
  userId,
}: CullingPublishModalProps) {
  const [galleryTitle, setGalleryTitle] = useState('Novo Ensaio Editado PriceU$');
  const [packagePhotoLimit, setPackagePhotoLimit] = useState(20);
  const [pricePerExtraPhoto, setPricePerExtraPhoto] = useState(15);
  const [requireLeadCapture, setRequireLeadCapture] = useState(true);
  const [enableSocialPromo, setEnableSocialPromo] = useState(true);
  
  const [publishing, setPublishing] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setPublishing(true);

    try {
      const newGallery = await GalleryService.createGallery(userId, {
        title: galleryTitle,
        package_photo_limit: packagePhotoLimit,
        price_per_extra_photo: pricePerExtraPhoto,
        require_lead_capture: requireLeadCapture,
        enable_social_promo: enableSocialPromo,
        watermark_enabled: true,
        watermark_text: 'PriceU$',
        is_public_portfolio: true,
        allow_low_res_download: true,
        allow_high_res_download: true,
      });

      await NotificationService.notifyGalleryPublished(userId, galleryTitle, newGallery.slug);

      setPublishedSlug(newGallery.slug);
      setPublishing(false);
      onConfirmPublish(galleryTitle);
    } catch (e) {
      console.warn('Criando galeria em modo offline/demo:', e);
      const demoSlug = GalleryService.generateSlug(galleryTitle);
      setPublishedSlug(demoSlug);
      setPublishing(false);
      onConfirmPublish(galleryTitle);
    }
  };

  const galleryPublicUrl = publishedSlug ? `${window.location.origin}/g/${publishedSlug}` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(galleryPublicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl text-white">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Publicar na Galeria Online</h3>
              <p className="text-[11px] text-slate-400">Entrega de Fotos, Venda Extra & Captura de Leads</p>
            </div>
          </div>
          <button onClick={onClose} type="button" className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {publishedSlug ? (
            <div className="p-6 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-xl font-black text-white">Galeria Publicada com Sucesso!</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Suas {selectedPhotos.length} fotos foram publicadas na nova galeria online com venda de fotos extras e captura de leads configurados.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-emerald-400 truncate">{galleryPublicUrl}</span>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <a
                  href={`/g/${publishedSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Visualizar Galeria Publicada</span>
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Título da Galeria Online:</label>
                <input
                  type="text"
                  value={galleryTitle}
                  onChange={(e) => setGalleryTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
                  placeholder="Ex: Casamento Ana & Pedro"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <label className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    <span>Fotos Inclusas no Pacote:</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={packagePhotoLimit}
                    onChange={(e) => setPackagePhotoLimit(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <label className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Valor por Foto Extra (R$):</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={pricePerExtraPhoto}
                    onChange={(e) => setPricePerExtraPhoto(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <div>
                      <span className="font-bold text-white block">Capturar Visitantes (Leads)</span>
                      <span className="text-[10px] text-slate-400">Solicita Nome, E-mail e WhatsApp para acessar a galeria</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={requireLeadCapture}
                    onChange={(e) => setRequireLeadCapture(e.target.checked)}
                    className="w-4 h-4 accent-purple-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-rose-400" />
                    <div>
                      <span className="font-bold text-white block">Divulgação Instagram no Selo</span>
                      <span className="text-[10px] text-slate-400">Insere marca d'água social com seu @ nas imagens enviadas</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableSocialPromo}
                    onChange={(e) => setEnableSocialPromo(e.target.checked)}
                    className="w-4 h-4 accent-purple-600 rounded"
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-center">
                  <span className="text-[10px] text-purple-300 font-bold uppercase block">Aprovadas</span>
                  <span className="text-xl font-black text-white">{selectedPhotos.length}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Ensaio</span>
                  <span className="text-xl font-black text-white">{totalPhotosCount}</span>
                </div>
                <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-900/50 text-center">
                  <span className="text-[10px] text-rose-400 font-bold uppercase block">Descartadas</span>
                  <span className="text-xl font-black text-rose-300">{discardedCount}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={publishing || selectedPhotos.length === 0}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-xl shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {publishing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Publicando Galeria & Criando Regras...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    <span>Confirmar & Publicar na Galeria Online</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Modal de Cópia e Exportação de Seleção para Lightroom Classic
// ─────────────────────────────────────────────
interface CullingLightroomExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  approvedPhotos: CullingPhoto[];
}

export function CullingLightroomExportModal({
  isOpen,
  onClose,
  approvedPhotos,
}: CullingLightroomExportModalProps) {
  const [copied, setCopied] = useState(false);
  const [formatMode, setFormatMode] = useState<'comma' | 'space'>('comma');

  if (!isOpen) return null;

  // Formatação solicitada pelo usuário:
  // comma -> "XXX_00000.yxw, XXX_00001.yxz..."
  // space -> "XXX_00000 XXX_00001"
  const formattedText = formatMode === 'comma'
    ? approvedPhotos.map((p) => p.fileName).join(', ')
    : approvedPhotos.map((p) => p.fileName.split('.')[0]).join(' ');

  const handleCopyText = () => {
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadCsv = () => {
    const csvHeader = 'Nome do Arquivo,Cena,Rating,ISO,Abertura,Obturador\n';
    const csvRows = approvedPhotos
      .map((p) => `"${p.fileName}","${p.sceneGroup}",${p.starRating},${p.iso},${p.aperture},${p.shutterSpeed}`)
      .join('\n');
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `selecao_culling_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Copiar Seleção para o Lightroom Classic</h3>
              <p className="text-[11px] text-slate-400">
                {approvedPhotos.length} {approvedPhotos.length === 1 ? 'foto selecionada' : 'fotos selecionadas'} para filtrar no Lightroom
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-4">
          {/* Seletor de Formato */}
          <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <span className="text-xs font-bold text-slate-400 ml-2">Formato da Lista:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFormatMode('comma')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  formatMode === 'comma' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Com Extensão & Vírgula (Nome.RAW, ...)
              </button>
              <button
                type="button"
                onClick={() => setFormatMode('space')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  formatMode === 'space' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Apenas Nomes (Sem Extensão)
              </button>
            </div>
          </div>

          {/* Caixa de Texto do Código */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-purple-300">Códigos das Fotos Aprovadas:</label>
              <span className="text-[10px] text-slate-400">{approvedPhotos.length} itens</span>
            </div>
            <textarea
              readOnly
              rows={4}
              value={formattedText}
              className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500 selection:bg-purple-600/40 resize-none"
            />
          </div>

          {/* Botão Principal de Cópia em 1-Clique */}
          <button
            type="button"
            onClick={handleCopyText}
            className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-xl shadow-purple-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>✓ Códigos Copiados para a Área de Transferência!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>📋 Copiar Lista de Fotos (1-Clique)</span>
              </>
            )}
          </button>

          {/* Passo a Passo Rápido para Usar no Lightroom */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Como filtrar no Adobe Lightroom Classic:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
              <li>No Lightroom Classic, acesse o módulo <strong className="text-slate-200">Biblioteca (Library)</strong>.</li>
              <li>Pressione o atalho <strong className="text-slate-200">\ </strong> para abrir o <strong className="text-slate-200">Filtro da Biblioteca</strong>.</li>
              <li>Selecione a opção <strong className="text-purple-300">Texto (Text)</strong> e marque o operador <strong className="text-purple-300">Contém (Contains)</strong>.</li>
              <li>Cole (<strong className="text-slate-200">Cmd + V</strong> no Mac ou <strong className="text-slate-200">Ctrl + V</strong> no Windows). Pronto! As fotos aprovadas aparecerão filtradas na hora.</li>
            </ol>
          </div>

          {/* Opções Secundárias (Download CSV opcional) */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="text-slate-400 hover:text-slate-200 font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>Baixar Relatório em .CSV (Opcional)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
