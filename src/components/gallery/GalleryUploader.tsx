import React, { useState, useRef, useMemo } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, FileImage, RotateCw, ChevronDown, ChevronUp } from 'lucide-react';
import { FileUploadProgress } from '../../types/gallery';

interface GalleryUploaderProps {
  onUploadFiles: (files: File[]) => Promise<void>;
  progressMap: Record<string, FileUploadProgress>;
}

export function GalleryUploader({ onUploadFiles, progressMap }: GalleryUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSelectedFilesRef = useRef<File[]>([]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processSelectedFiles = async (files: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;

    lastSelectedFilesRef.current = validFiles;
    setUploading(true);
    try {
      await onUploadFiles(validFiles);
    } catch (err) {
      console.error('Erro no lote de upload:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleRetryFailed = async () => {
    const failedNames = new Set(
      Object.values(progressMap)
        .filter((item) => item.status === 'error')
        .map((item) => item.fileName)
    );

    const filesToRetry = lastSelectedFilesRef.current.filter((file) => failedNames.has(file.name));
    if (filesToRetry.length > 0) {
      setUploading(true);
      try {
        await onUploadFiles(filesToRetry);
      } catch (err) {
        console.error('Erro ao retentar upload:', err);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processSelectedFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processSelectedFiles(e.target.files);
    }
  };

  const progressItems = useMemo(() => Object.values(progressMap), [progressMap]);

  const stats = useMemo(() => {
    const total = progressItems.length;
    const completed = progressItems.filter((i) => i.status === 'completed').length;
    const error = progressItems.filter((i) => i.status === 'error').length;
    const inProgress = progressItems.filter((i) => i.status !== 'completed' && i.status !== 'error').length;
    const overallPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, error, inProgress, overallPercent };
  }, [progressItems]);

  // Lista otimizada: prioriza itens com erro e em andamento para visualização rápida sem sobrecarregar o DOM
  const displayItems = useMemo(() => {
    if (showAllDetails || progressItems.length <= 30) {
      return progressItems;
    }
    const errorsAndActive = progressItems.filter((i) => i.status === 'error' || (i.status !== 'completed' && i.status !== 'error'));
    const someCompleted = progressItems.filter((i) => i.status === 'completed').slice(-10);
    return [...errorsAndActive, ...someCompleted];
  }, [progressItems, showAllDetails]);

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${
          uploading
            ? 'border-slate-800 bg-slate-900/30 opacity-75 cursor-not-allowed'
            : isDragging
            ? 'border-blue-500 bg-blue-500/10 scale-[1.01] cursor-pointer'
            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900 cursor-pointer'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp"
          disabled={uploading}
          className="hidden"
        />

        <div className="flex flex-col items-center space-y-3">
          <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <p className="text-base font-semibold text-white">
              Arraste e solte fotos aqui ou <span className="text-blue-400">clique para selecionar</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              ⚡ Envio paralelo ultrarrápido (4x) • Fotos já enviadas são detectadas e ignoradas automaticamente
            </p>
          </div>
        </div>
      </div>

      {/* Painel Global de Progresso */}
      {stats.total > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Progresso do Lote ({stats.completed}/{stats.total} fotos)</span>
                {uploading && (
                  <span className="text-blue-400 flex items-center space-x-1 text-xs font-normal">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enviando em paralelo...</span>
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {stats.completed} concluídas • {stats.inProgress} em fila/processando {stats.error > 0 && `• ${stats.error} com erro`}
              </p>
            </div>

            {stats.error > 0 && !uploading && (
              <button
                type="button"
                onClick={handleRetryFailed}
                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center space-x-1.5 transition-all self-start sm:self-auto"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Reenviar {stats.error} foto(s) com erro</span>
              </button>
            )}
          </div>

          {/* Barra Geral de Progresso */}
          <div className="space-y-1.5">
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  stats.error > 0 && stats.completed === 0
                    ? 'bg-red-500'
                    : stats.completed === stats.total
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                }`}
                style={{ width: `${stats.overallPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>{stats.overallPercent}% concluído</span>
              <span>{stats.total - stats.completed} restantes</span>
            </div>
          </div>

          {/* Lista de Arquivos com Rolagem */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {displayItems.map((item) => (
              <div key={item.fileId} className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 truncate pr-2">
                    <FileImage className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="font-medium text-white truncate text-[11px]">{item.fileName}</span>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {item.status === 'completed' && (
                      <span className="text-emerald-400 flex items-center space-x-1 text-[11px] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Concluído</span>
                      </span>
                    )}

                    {item.status === 'error' && (
                      <span className="text-red-400 flex items-center space-x-1 text-[11px] font-semibold" title={item.errorMessage}>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[150px]">{item.errorMessage || 'Erro'}</span>
                      </span>
                    )}

                    {item.status !== 'completed' && item.status !== 'error' && (
                      <span className="text-blue-400 font-semibold text-[11px]">{item.progress}%</span>
                    )}
                  </div>
                </div>

                {/* Barra Individual */}
                <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      item.status === 'completed'
                        ? 'bg-emerald-500'
                        : item.status === 'error'
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {progressItems.length > 30 && (
            <button
              type="button"
              onClick={() => setShowAllDetails(!showAllDetails)}
              className="w-full py-1.5 text-center text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center justify-center space-x-1 transition-colors"
            >
              <span>{showAllDetails ? 'Ocultar detalhes de fotos concluídas' : `Ver lista completa (${progressItems.length} fotos)`}</span>
              {showAllDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
