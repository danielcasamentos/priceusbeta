import { useState } from 'react';
import { X, CheckCircle2, QrCode, CreditCard, Sparkles, AlertCircle, Copy, Check } from 'lucide-react';
import { Gallery, GalleryPhoto } from '../../types/gallery';
import { GalleryService } from '../../services/galleryService';

interface GalleryProofingCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  gallery: Gallery;
  selectedPhotos: GalleryPhoto[];
  visitorName?: string;
  onConfirmSelection: () => void;
}

export function GalleryProofingCheckoutModal({
  isOpen,
  onClose,
  gallery,
  selectedPhotos,
  visitorName,
  onConfirmSelection,
}: GalleryProofingCheckoutModalProps) {
  const [copiedPix, setCopiedPix] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  if (!isOpen) return null;

  const totalSelected = selectedPhotos.length;
  const packageLimit = gallery.package_photo_limit || 0;
  const extraDetails = GalleryService.calculateExtraPhotosPrice(gallery, totalSelected);

  const pixKey = "12.345.678/0001-90"; // Exemplo de chave PIX do estúdio

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleFinalize = () => {
    onConfirmSelection();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl text-white my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Aprovação da Seleção de Fotos</span>
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
          {/* Resumo da Seleção */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold border-b border-slate-800 pb-2">
              <span>Total de fotos selecionadas:</span>
              <span className="text-sm font-bold text-white">{totalSelected} foto(s)</span>
            </div>

            {packageLimit > 0 && (
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Fotos inclusas no seu pacote:</span>
                <span className="font-semibold text-slate-200">{packageLimit} foto(s)</span>
              </div>
            )}

            {extraDetails.extraCount > 0 ? (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs text-amber-300 font-bold">
                  <span>Fotos extras ao pacote:</span>
                  <span>+{extraDetails.extraCount} foto(s)</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Valor unitário foto extra:</span>
                  <span>R$ {extraDetails.unitPrice.toFixed(2)}</span>
                </div>

                {extraDetails.discountApplied && (
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Desconto progressivo em lote aplicado automaticamente!</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-base font-black text-emerald-400 pt-2 border-t border-slate-800">
                  <span>Valor das Fotos Extras:</span>
                  <span>R$ {extraDetails.totalPrice.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-medium text-center">
                ✨ Sua seleção está 100% dentro do limite do seu pacote contratado!
              </div>
            )}
          </div>

          {/* Se houver extras para pagar */}
          {extraDetails.extraCount > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>Pagamento Instantâneo via PIX</span>
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Para liberar a aprovação das fotos extras e liberação dos downloads sem marca d'água, realize o Pix no valor total de <strong className="text-emerald-400">R$ {extraDetails.totalPrice.toFixed(2)}</strong>.
              </p>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200">
                <span className="truncate">Chave PIX: {pixKey}</span>
                <button
                  onClick={handleCopyPix}
                  className="px-2.5 py-1 bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 ml-2"
                >
                  {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="pt-2 space-y-2">
            <button
              onClick={handleFinalize}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Concluir e Enviar Seleção ao Fotógrafo</span>
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-2xl text-xs text-slate-400 hover:text-white transition-colors"
            >
              Continuar Escolhendo Fotos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
