import { useState, useRef } from 'react';
import { X, Download, Copy, CheckCircle2, QrCode, ExternalLink } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

interface GalleryQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  galleryTitle: string;
  galleryUrl: string;
  photographerName?: string;
}

export function GalleryQrCodeModal({
  isOpen,
  onClose,
  galleryTitle,
  galleryUrl,
  photographerName,
}: GalleryQrCodeModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(galleryUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleDownloadQrCode = () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;

    // Criar um canvas temporário em alta resolução para impressão de eventos
    const downloadCanvas = document.createElement('canvas');
    const size = 1000;
    const padding = 80;
    downloadCanvas.width = size;
    downloadCanvas.height = size + 200;
    const ctx = downloadCanvas.getContext('2d');
    if (!ctx) return;

    // Fundo Branco Clean
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);

    // Desenhar o QR Code centralizado
    ctx.drawImage(canvas, padding, padding, size - padding * 2, size - padding * 2);

    // Adicionar Texto da Galeria e Branding
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(galleryTitle, size / 2, size + 20);

    ctx.fillStyle = '#64748B';
    ctx.font = '24px sans-serif';
    const subText = photographerName ? `Fotografia por ${photographerName}` : 'Acesse as fotos em tempo real!';
    ctx.fillText(subText, size / 2, size + 70);

    // Download PNG
    const link = document.createElement('a');
    link.download = `qrcode_${galleryTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
    link.href = downloadCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl space-y-6 p-6 sm:p-8 text-center my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2 text-left">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">QR Code da Galeria</h3>
              <p className="text-xs text-slate-400">Para eventos e entregas em tempo real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card do QR Code com Design para Eventos */}
        <div className="p-6 rounded-2xl bg-white text-slate-900 shadow-xl space-y-4 max-w-xs mx-auto border border-slate-200">
          <div ref={qrRef} className="flex justify-center p-2 bg-white rounded-xl">
            <QRCodeCanvas
              value={galleryUrl}
              size={220}
              level="H"
              includeMargin={true}
            />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-sm font-black text-slate-900 tracking-tight leading-tight">{galleryTitle}</p>
            <p className="text-[11px] font-semibold text-slate-500">
              {photographerName ? `Fotografia por ${photographerName}` : 'Escaneie para ver as fotos'}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Imprima ou exponha este QR Code durante o evento para que os convidados acessem a galeria instantaneamente no celular.
        </p>

        {/* Botões de Ação */}
        <div className="space-y-3">
          <button
            onClick={handleDownloadQrCode}
            className="w-full py-3.5 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Baixar QR Code para Impressão (PNG)</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCopyLink}
              className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center justify-center space-x-1.5 border border-slate-700"
            >
              {copiedLink ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copiar Link</span>
                </>
              )}
            </button>

            <a
              href={galleryUrl}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center justify-center space-x-1.5 border border-slate-700"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>Abrir Link</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
