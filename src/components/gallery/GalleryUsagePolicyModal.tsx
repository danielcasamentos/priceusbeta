import { useState } from 'react';
import { ShieldCheck, X, Check, Instagram, Download, AlertCircle } from 'lucide-react';

interface GalleryUsagePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  photographerInstagram?: string | null;
  customPolicyText?: string | null;
  selectedCount?: number;
  downloading?: boolean;
}

export function GalleryUsagePolicyModal({
  isOpen,
  onClose,
  onConfirm,
  photographerInstagram,
  customPolicyText,
  selectedCount = 1,
  downloading = false,
}: GalleryUsagePolicyModalProps) {
  const [accepted, setAccepted] = useState(false);

  if (!isOpen) return null;

  const instagramHandle = photographerInstagram
    ? photographerInstagram.startsWith('@')
      ? photographerInstagram
      : `@${photographerInstagram}`
    : null;

  const defaultPolicyText = `Ao efetuar o download gratuito destas fotos em baixa resolução para divulgação em redes sociais (Instagram, TikTok, Facebook), declaro estar ciente e concordar com os seguintes termos:

1. **Crédito de Autoria Obrigatório**: Ao publicar ou compartilhar qualquer foto nas redes sociais, comprometo-me a marcar expressamente o perfil oficial do fotógrafo ${
    instagramHandle || 'no post'
  } na legenda e/ou identificação da publicação.

2. **Integridade da Marca d'Água**: A marca d'água inserida na foto tem fins de identificação de direitos autorais e divulgação comercial, sendo proibida a remoção, recorte ou ocultação da marca.

3. **Uso Pessoal e Promocional**: As fotos baixadas nesta modalidade destinam-se exclusivamente ao uso pessoal e divulgação em perfis sociais.`;

  const finalPolicyText = customPolicyText && customPolicyText.trim() ? customPolicyText : defaultPolicyText;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0a1628] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-purple-50/50 dark:bg-purple-900/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Termos de Liberação de Imagem</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Divulgação em Redes Sociais</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={downloading}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {instagramHandle && (
            <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-amber-500/10 rounded-xl border border-pink-500/20">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Instagram className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Perfil para marcação no Instagram:</span>
                <div className="font-bold text-purple-600 dark:text-purple-400 text-sm mt-0.5">{instagramHandle}</div>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line bg-gray-50 dark:bg-white/[0.02] p-4 rounded-xl border border-gray-100 dark:border-white/5">
            {finalPolicyText}
          </div>

          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              {selectedCount > 1
                ? `As ${selectedCount} fotos selecionadas serão processadas com a marca d'água de divulgação.`
                : `A foto selecionada será processada com a marca d'água de divulgação.`}
            </p>
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-gray-200 dark:hover:border-white/10">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              disabled={downloading}
              className="mt-0.5 w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 dark:border-white/20 dark:bg-[#07101f]"
            />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
              Li e concordo com os termos de liberação de imagem e me comprometo a marcar o fotógrafo ao postar.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.01] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={downloading}
            className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={!accepted || downloading}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white rounded-xl transition-all shadow-md ${
              accepted && !downloading
                ? 'bg-purple-600 hover:bg-purple-700 active:scale-95'
                : 'bg-gray-300 dark:bg-white/10 text-gray-400 cursor-not-allowed shadow-none'
            }`}
          >
            {downloading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Aceitar & Baixar Fotos
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
