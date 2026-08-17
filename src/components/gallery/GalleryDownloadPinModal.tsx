import React, { useState } from 'react';
import { Lock, KeyRound, ArrowRight, X, AlertCircle } from 'lucide-react';

interface GalleryDownloadPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  expectedPin: string;
  onSuccess: () => void;
  galleryTitle?: string;
  photographerName?: string;
}

export function GalleryDownloadPinModal({
  isOpen,
  onClose,
  expectedPin,
  onSuccess,
  galleryTitle = 'Galeria',
  photographerName,
}: GalleryDownloadPinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setLoading(true);
    setError(false);

    // Comparação do PIN (case-insensitive ou exato)
    if (pin.trim().toLowerCase() === expectedPin.trim().toLowerCase()) {
      setTimeout(() => {
        setLoading(false);
        onSuccess();
        onClose();
      }, 300);
    } else {
      setTimeout(() => {
        setLoading(false);
        setError(true);
      }, 300);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ícone */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        {/* Títulos */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
            Acesso Restrito ao Download
          </span>
          <h3 className="text-xl font-black text-white tracking-tight">
            Senha de Download
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            {photographerName ? `${photographerName} definiu` : 'Esta galeria possui'} uma senha de segurança para autorizar o download das fotos.
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="Digite a senha ou PIN..."
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(false);
                }}
                className={`w-full px-4 py-3.5 rounded-2xl bg-slate-950 border text-center font-mono text-base font-bold text-white placeholder-slate-600 focus:outline-none transition-all tracking-wider ${
                  error
                    ? 'border-rose-500 ring-2 ring-rose-500/30'
                    : 'border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                }`}
              />
              <KeyRound className="w-4 h-4 text-slate-600 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>

            {error && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Senha ou PIN incorreto. Tente novamente.</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!pin.trim() || loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>{loading ? 'Verificando...' : 'Liberar Downloads'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[10px] text-slate-500">
          Galeria: <span className="text-slate-400 font-semibold">{galleryTitle}</span>
        </p>
      </div>
    </div>
  );
}
