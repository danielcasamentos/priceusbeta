import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, FileImage } from 'lucide-react';
import { FileUploadProgress } from '../../types/gallery';

interface GalleryUploaderProps {
  onUploadFiles: (files: File[]) => Promise<void>;
  progressMap: Record<string, FileUploadProgress>;
}

export function GalleryUploader({ onUploadFiles, progressMap }: GalleryUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (file.type.startsWith('image/')) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;

    setUploading(true);
    try {
      await onUploadFiles(validFiles);
    } catch (err) {
      console.error('Erro no lote de upload:', err);
    } finally {
      setUploading(false);
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

  const progressItems = Object.values(progressMap);

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="image/*"
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
              Suporta JPG, PNG, WebP, HEIC (envio simultâneo em lote)
            </p>
          </div>
        </div>
      </div>

      {/* Progresso de Envio Individual por Arquivo */}
      {progressItems.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Progresso de Envio ({progressItems.filter((i) => i.status === 'completed').length}/{progressItems.length})</span>
            {uploading && (
              <span className="text-blue-400 flex items-center space-x-1 text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processando...</span>
              </span>
            )}
          </h4>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {progressItems.map((item) => (
              <div key={item.fileId} className="p-3 rounded-xl bg-slate-800/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 truncate pr-2">
                    <FileImage className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="font-medium text-white truncate">{item.fileName}</span>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {item.status === 'completed' && (
                      <span className="text-emerald-400 flex items-center space-x-1 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Concluído</span>
                      </span>
                    )}

                    {item.status === 'error' && (
                      <span className="text-red-400 flex items-center space-x-1 font-semibold">
                        <AlertCircle className="w-4 h-4" />
                        <span>{item.errorMessage || 'Erro'}</span>
                      </span>
                    )}

                    {item.status !== 'completed' && item.status !== 'error' && (
                      <span className="text-blue-400 font-semibold">{item.progress}%</span>
                    )}
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
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
        </div>
      )}
    </div>
  );
}
