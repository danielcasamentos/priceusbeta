import { X, Download, Zap, CheckCircle2 } from 'lucide-react';

interface LightroomPluginModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export function LightroomPluginModal({ isOpen, onClose }: LightroomPluginModalProps) {
  if (!isOpen) return null;

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
          {/* Passo 1: Download do Plugin */}
          <div className="p-5 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-3">
            <h4 className="text-xs font-bold text-purple-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Download className="w-4 h-4" />
              <span>Passo 1: Baixar Plug-in Oficial (.zip)</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Plug-in nativo para Adobe Lightroom Classic. Publique ensaios diretamente do Lightroom para o PriceU$.
            </p>
            <a
              href="/downloads/PriceUS.lrplugin.zip"
              download="PriceUS.lrplugin.zip"
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Plug-in PriceU$ (.zip)</span>
            </a>
          </div>

          {/* Passo 2: Instruções de Instalação e Login */}
          <div className="space-y-2 text-xs text-slate-300 bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <h4 className="font-bold text-white mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              <span>Como Instalar e Conectar:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-300 text-[12px] leading-relaxed">
              <li>Descompacte o arquivo baixado para obter a pasta <strong className="text-purple-300">PriceUS.lrplugin</strong>.</li>
              <li>No Lightroom Classic, vá em <strong className="text-slate-100">Arquivo &gt; Gerenciador de Plug-ins</strong>.</li>
              <li>Clique em <strong className="text-slate-100">Adicionar</strong> e selecione a pasta <strong className="text-purple-300">PriceUS.lrplugin</strong>.</li>
              <li>No painel esquerdo do Lightroom em <strong className="text-slate-100">Serviços de Publicação</strong>, configure o <strong className="text-purple-300">PriceU$</strong> e faça login com seu <strong>e-mail e senha do PriceU$</strong>.</li>
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
