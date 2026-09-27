import { useState } from 'react';
import { X, CheckCircle2, QrCode, CreditCard, Sparkles, AlertCircle, Copy, Check, Loader2, ExternalLink } from 'lucide-react';
import { Gallery, GalleryPhoto } from '../../types/gallery';
import { GalleryService } from '../../services/galleryService';
import { createExtraPhotosCheckout } from '../../services/photoSalesService';

interface GalleryProofingCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  gallery: Gallery;
  selectedPhotos: GalleryPhoto[];
  visitorName?: string;
  visitorEmail?: string;
  onConfirmSelection: () => void;
}

export function GalleryProofingCheckoutModal({
  isOpen,
  onClose,
  gallery,
  selectedPhotos,
  visitorName,
  visitorEmail,
  onConfirmSelection,
}: GalleryProofingCheckoutModalProps) {
  const [copiedPix, setCopiedPix] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [isLoadingStripe, setIsLoadingStripe] = useState(false);

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

  const handleStripeCheckout = async () => {
    if (extraDetails.totalPrice <= 0) return;
    setIsLoadingStripe(true);
    try {
      const res = await createExtraPhotosCheckout({
        galleryId: gallery.id,
        extraCount: extraDetails.extraCount,
        totalAmount: extraDetails.totalPrice,
        visitorName,
        visitorEmail,
      });
      if (res.url) {
        window.location.href = res.url;
      } else {
        alert(res.error || 'Não foi possível iniciar o pagamento com cartão no momento.');
      }
    } catch (err: any) {
      alert('Erro ao conectar ao checkout: ' + (err?.message || 'Tente novamente'));
    } finally {
      setIsLoadingStripe(false);
    }
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
                  <span>{packageLimit > 0 ? 'Fotos extras ao pacote:' : 'Fotos para compra:'}</span>
                  <span>{packageLimit > 0 ? `+${extraDetails.extraCount}` : extraDetails.extraCount} foto(s)</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>{packageLimit > 0 ? 'Valor unitário foto extra:' : 'Valor unitário por foto:'}</span>
                  <span>R$ {extraDetails.unitPrice.toFixed(2)}</span>
                </div>

                {extraDetails.discountApplied && (
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Desconto progressivo em lote aplicado automaticamente!</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-base font-black text-emerald-400 pt-2 border-t border-slate-800">
                  <span>{packageLimit > 0 ? 'Valor das Fotos Extras:' : 'Valor Total do Pedido:'}</span>
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
            <div className="space-y-3">
              {/* Opção 1: Cartão de Crédito via Stripe Checkout */}
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-400" />
                    <span>Cartão de Crédito Online (Stripe)</span>
                  </h4>
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
                    Automático
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Pague com cartão de forma segura via Stripe. Repasse direto com taxa de 10% da plataforma.
                </p>
                <button
                  onClick={handleStripeCheckout}
                  disabled={isLoadingStripe}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  {isLoadingStripe ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gerando Checkout Seguro...</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      <span>Pagar R$ {extraDetails.totalPrice.toFixed(2)} com Cartão</span>
                    </>
                  )}
                </button>
              </div>

              {/* Opção 2: PIX Direto */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-amber-400" />
                  <span>Pagamento Alternativo via PIX</span>
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Para pagar via chave Pix no valor total de <strong className="text-emerald-400">R$ {extraDetails.totalPrice.toFixed(2)}</strong>:
                </p>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200">
                  <span className="truncate">Chave PIX: {pixKey}</span>
                  <button
                    onClick={handleCopyPix}
                    className="px-2.5 py-1 bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
                  >
                    {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
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
