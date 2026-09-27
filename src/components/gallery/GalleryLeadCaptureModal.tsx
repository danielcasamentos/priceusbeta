import { useState } from 'react';
import { User, Mail, Phone, ArrowRight, ShieldCheck, Sparkles, Images } from 'lucide-react';

interface GalleryLeadCaptureModalProps {
  isOpen: boolean;
  galleryTitle: string;
  photographerName?: string;
  enableFaceRecognition?: boolean;
  onSubmitLead: (data: {
    name: string;
    email: string;
    whatsapp: string;
    intent?: 'face_search' | 'full_gallery';
  }) => void;
}

export function GalleryLeadCaptureModal({
  isOpen,
  galleryTitle,
  photographerName,
  enableFaceRecognition = false,
  onSubmitLead,
}: GalleryLeadCaptureModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  if (!isOpen) return null;

  const handleAction = (intent: 'face_search' | 'full_gallery') => {
    if (!name.trim()) return;
    onSubmitLead({
      name: name.trim(),
      email: email.trim(),
      whatsapp: whatsapp.trim(),
      intent,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl text-white">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Bem-vindo(a) à Galeria!</h2>
          <p className="text-xs text-slate-400">
            <strong className="text-slate-200">{galleryTitle}</strong>
            {photographerName ? ` • ${photographerName}` : ''}
          </p>
          <p className="text-xs text-slate-300">
            Preencha seus dados para acessar e escolher suas fotos:
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAction(enableFaceRecognition ? 'face_search' : 'full_gallery');
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Seu Nome Completo *</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Ana Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span>Seu E-mail</span>
            </label>
            <input
              type="email"
              placeholder="ex: ana@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp / Celular com DDD</span>
            </label>
            <input
              type="text"
              placeholder="(11) 99999-8888"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {enableFaceRecognition ? (
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleAction('face_search')}
                disabled={!name.trim()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-purple-200" />
                <span>Encontrar Minhas Fotos (Selfie)</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction('full_gallery')}
                disabled={!name.trim()}
                className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-medium text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Images className="w-3.5 h-3.5 text-slate-400" />
                <span>Ver Galeria Completa</span>
              </button>
            </div>
          ) : (
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>Acessar Galeria</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
