import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldAlert } from 'lucide-react';

interface GalleryPasswordModalProps {
  isOpen: boolean;
  galleryTitle: string;
  photographerName?: string;
  onVerifyPassword: (password: string) => Promise<boolean>;
}

export function GalleryPasswordModal({
  isOpen,
  galleryTitle,
  photographerName,
  onVerifyPassword,
}: GalleryPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setVerifying(true);
    setError(false);
    try {
      const isValid = await onVerifyPassword(password.trim());
      if (!isValid) {
        setError(true);
      }
    } catch (err) {
      setError(true);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-8 text-center shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">{galleryTitle}</h2>
          {photographerName && (
            <p className="text-xs text-slate-400 font-medium">por {photographerName}</p>
          )}
          <p className="text-xs text-slate-400">
            Esta galeria é protegida por senha. Digite a senha para visualizar e baixar as fotos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <input
              type="password"
              required
              autoFocus
              placeholder="Digite a senha de acesso"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              className={`w-full px-5 py-3.5 rounded-2xl bg-slate-950 border text-white placeholder-slate-500 text-sm text-center focus:outline-none transition-colors ${
                error ? 'border-red-500/80 focus:border-red-500' : 'border-slate-800 focus:border-amber-500'
              }`}
            />
            {error && (
              <p className="text-xs text-red-400 font-medium flex items-center justify-center space-x-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Senha incorreta. Tente novamente.</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={verifying}
            className="w-full py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{verifying ? 'Verificando...' : 'Acessar Galeria'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
