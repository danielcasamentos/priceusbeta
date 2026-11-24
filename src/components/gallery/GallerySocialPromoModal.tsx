import { Camera, Instagram, X, Heart, ExternalLink } from 'lucide-react';

interface GallerySocialPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  instagramHandle?: string | null;
  photographerName?: string | null;
}

export function GallerySocialPromoModal({
  isOpen,
  onClose,
  instagramHandle,
  photographerName,
}: GallerySocialPromoModalProps) {
  if (!isOpen) return null;

  const cleanHandle = (instagramHandle || '@fotografo').trim().startsWith('@')
    ? (instagramHandle || '@fotografo').trim()
    : `@${(instagramHandle || 'fotografo').trim()}`;

  const instagramUrl = `https://instagram.com/${cleanHandle.replace('@', '')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-5 shadow-2xl text-white text-center relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 mx-auto shadow-lg">
          <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-white">
            <Instagram className="w-7 h-7" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center justify-center gap-1.5">
            <span>Marque a gente no seu Instagram!</span>
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Ao postar sua foto nas redes sociais, lembre-se de marcar o fotógrafo <strong className="text-amber-300 font-bold">{cleanHandle}</strong> {photographerName ? `(${photographerName})` : ''} para valorizar o trabalho da nossa equipe! ✨
          </p>
        </div>

        <div className="pt-2 space-y-2">
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-90 text-white font-extrabold text-sm shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Instagram className="w-4 h-4" />
            <span>Seguir {cleanHandle} no Instagram</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl text-xs text-slate-400 hover:text-white transition-colors"
          >
            Continuar Download
          </button>
        </div>
      </div>
    </div>
  );
}
