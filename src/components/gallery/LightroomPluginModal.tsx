import { useState } from 'react';
import { X, Download, Copy, Check, Key, Zap, CheckCircle2, ArrowRight } from 'lucide-react';

interface LightroomPluginModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export function LightroomPluginModal({ isOpen, onClose, userId }: LightroomPluginModalProps) {
  const [copiedToken, setCopiedToken] = useState(false);
  const apiToken = `pu_lr_${userId ? userId.substring(0, 12) : 'studio_key_2026'}_x9`;

  if (!isOpen) return null;

  const handleCopyToken = () => {
    navigator.clipboard.writeText(apiToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Plugin Oficial Lightroom Classic</h3>
              <p className="text-[11px] text-slate-400">Exportação direta do Lightroom para o PriceU$</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-5">
          {/* Passo 1: Token de API */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Key className="w-3.5 h-3.5" />
                <span>Passo 1: Seu Token de API de Autenticação</span>
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800 font-mono text-xs text-slate-200">
              <span className="truncate">{apiToken}</span>
              <button
                onClick={handleCopyToken}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 ml-2"
              >
                {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedToken ? 'Copiado!' : 'Copiar Token'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">Cole este token nas configurações do Plugin no Lightroom.</p>
          </div>

          {/* Passo 2: Download do Plugin */}
          <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-3">
            <h4 className="text-xs font-bold text-purple-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Download className="w-3.5 h-3.5" />
              <span>Passo 2: Baixar Pacote do Plugin (.lrplugin)</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              O plugin em formato Lua oficial SDK da Adobe para sincronizar ensaios com o PriceU$ e Google Drive.
            </p>
            <a
              href="/downloads/PriceUS.lrplugin.zip"
              download="PriceUS.lrplugin.zip"
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Pacote Plugin Lightroom (.zip)</span>
            </a>
          </div>

          {/* Passo 3: Instruções */}
          <div className="space-y-2 text-xs text-slate-300 bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <h4 className="font-bold text-white mb-1">Como Instalar no Lightroom Classic:</h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px]">
              <li>Abra o Adobe Lightroom Classic no seu computador.</li>
              <li>Acesse <strong className="text-slate-200">Arquivo &gt; Gerenciador de Plug-ins (Plugin Manager)</strong>.</li>
              <li>Clique no botão <strong className="text-slate-200">Adicionar</strong> e selecione a pasta baixada <strong className="text-purple-300">PriceUS.lrplugin</strong>.</li>
              <li>Ao exportar qualquer ensaio, selecione <strong className="text-slate-200">PriceU$ Galerias Online</strong> como destino!</li>
            </ol>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
