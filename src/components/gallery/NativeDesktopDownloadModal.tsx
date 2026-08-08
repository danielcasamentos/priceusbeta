import React from 'react';
import { Monitor, Download, Apple, ShieldCheck, Zap, HardDrive, CheckCircle2, X } from 'lucide-react';
import { platformAdapter } from '../../services/platformAdapter';

interface NativeDesktopDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NativeDesktopDownloadModal({ isOpen, onClose }: NativeDesktopDownloadModalProps) {
  if (!isOpen) return null;

  const [downloadNotice, setDownloadNotice] = React.useState<string | null>(null);

  const handleDownload = async (platform: 'mac-arm' | 'mac-intel' | 'win') => {
    platformAdapter.addLog('info', 'SYSTEM', `Download do App Nativo solicitado para: ${platform}`);
    
    const fileMap: Record<string, { name: string; filename: string; url: string }> = {
      'mac-arm': { name: 'macOS Apple Silicon', filename: 'PriceUS_macOS_AppleSilicon.dmg', url: '/downloads/PriceUS_macOS_AppleSilicon.dmg' },
      'mac-intel': { name: 'macOS Intel', filename: 'PriceUS_macOS_Intel.dmg', url: '/downloads/PriceUS_macOS_Intel.dmg' },
      'win': { name: 'Windows', filename: 'PriceUS_Windows_x64.exe', url: '/downloads/PriceUS_Windows_x64.exe' },
    };

    const target = fileMap[platform] || fileMap['mac-arm'];

    try {
      // Verifica se o arquivo binário .dmg/.exe real existe no servidor (evita baixar HTML como .dmg)
      const res = await fetch(target.url, { method: 'HEAD' });
      const contentType = res.headers.get('content-type') || '';

      if (res.ok && !contentType.includes('text/html')) {
        const link = document.createElement('a');
        link.href = target.url;
        link.setAttribute('download', target.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setDownloadNotice(`📦 O arquivo ${target.filename} está configurado. Se o arquivo DMG já estiver publicado em uma URL externa (como Google Drive, Dropbox ou GitHub Release), você pode colá-la aqui para download direto.`);
      }
    } catch {
      setDownloadNotice(`ℹ️ O arquivo ${target.filename} estará disponível para download assim que o binário for colocado em /downloads/${target.filename} ou em uma URL de release.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        
        {/* Cabeçalho Modal */}
        <div className="p-6 bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border-b border-slate-800/80 flex items-start justify-between relative">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-600/20">
              <Monitor className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white">PriceU$ Desktop App</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  v2.0 Nativo
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Alta performance para macOS e Windows sem limite de memória do navegador.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {downloadNotice && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-200 text-xs flex items-center justify-between">
            <span>{downloadNotice}</span>
            <button onClick={() => setDownloadNotice(null)} className="text-purple-400 font-bold hover:text-white ml-2">✕</button>
          </div>
        )}

        {/* Recursos Principais */}
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-purple-400 font-bold text-xs">
                <HardDrive className="w-4 h-4" />
                <span>Zero-Copy FS</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Lê arquivos RAW direto do HD/SSD externo sem cópia de disco.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                <Zap className="w-4 h-4" />
                <span>Zero Lag GPU</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Processamento local de IA usando o chip Apple M1-M4 ou Nvidia/Intel.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Auto-Updater</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Atualizações automáticas e silenciosas em segundo plano.
              </p>
            </div>
          </div>

          {/* Opções de Download por Sistema Operacional */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
              Escolha sua Plataforma de Instalação:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* macOS Apple Silicon */}
              <button
                onClick={() => handleDownload('mac-arm')}
                className="p-4 rounded-2xl bg-slate-950 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/50 transition-all text-left group flex flex-col justify-between cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Apple className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[9px] font-bold">.DMG</span>
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">macOS Apple Silicon</h4>
                  <p className="text-[10px] text-slate-400">Chips M1, M2, M3, M4</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-extrabold text-purple-400 pt-1 group-hover:translate-x-0.5 transition-transform">
                  <Download className="w-4 h-4" />
                  <span>Baixar p/ Mac M1-M4</span>
                </div>
              </button>

              {/* macOS Intel */}
              <button
                onClick={() => handleDownload('mac-intel')}
                className="p-4 rounded-2xl bg-slate-950 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/50 transition-all text-left group flex flex-col justify-between cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Apple className="w-6 h-6 text-slate-300 group-hover:scale-110 transition-transform" />
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9px] font-bold">.DMG</span>
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">macOS Intel</h4>
                  <p className="text-[10px] text-slate-400">Macs com Processador Intel</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-extrabold text-purple-400 pt-1 group-hover:translate-x-0.5 transition-transform">
                  <Download className="w-4 h-4" />
                  <span>Baixar p/ Mac Intel</span>
                </div>
              </button>

              {/* Windows 64-bit */}
              <button
                onClick={() => handleDownload('win')}
                className="p-4 rounded-2xl bg-slate-950 hover:bg-blue-950/40 border border-slate-800 hover:border-blue-500/50 transition-all text-left group flex flex-col justify-between cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Monitor className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[9px] font-bold">.EXE</span>
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">Windows 10 / 11</h4>
                  <p className="text-[10px] text-slate-400">Versão 64-bit</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-extrabold text-blue-400 pt-1 group-hover:translate-x-0.5 transition-transform">
                  <Download className="w-4 h-4" />
                  <span>Baixar p/ Windows</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé Informativo */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Sua conta e plano de assinatura ativam o App Nativo automaticamente.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
