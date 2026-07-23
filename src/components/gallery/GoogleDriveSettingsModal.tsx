import { useState } from 'react';
import { X, HardDrive, CheckCircle2, AlertCircle, Key, BookOpen, ExternalLink, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface GoogleDriveSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToken: (token: string) => void;
  currentToken?: string | null;
}

export function GoogleDriveSettingsModal({
  isOpen,
  onClose,
  onSaveToken,
  currentToken,
}: GoogleDriveSettingsModalProps) {
  const [tokenInput, setTokenInput] = useState(currentToken || '');
  const [showTutorial, setShowTutorial] = useState(false);

  if (!isOpen) return null;

  const isConnected = Boolean(currentToken && currentToken.trim().length > 0);

  const handleSave = () => {
    onSaveToken(tokenInput.trim());
    onClose();
  };

  const handleDisconnect = () => {
    onSaveToken('');
    setTokenInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Integração com Google Drive</h3>
              <p className="text-xs text-slate-400">Armazenamento das fotos originais em alta resolução</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Banner de Status */}
          {isConnected ? (
            <div className="flex items-center space-x-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Google Drive Conectado!</p>
                <p className="text-xs text-emerald-400/80 mt-0.5">
                  Fotos originais serão enviadas para a sua pasta <span className="font-bold text-white">/PriceUS_Galerias</span>.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Armazenamento Padrão Ativo</p>
                <p className="text-xs text-amber-400/80 mt-0.5">
                  Sem o token do Google Drive, o PriceU$ salva os originais no Supabase Storage automaticamente.
                </p>
              </div>
            </div>
          )}

          {/* Campo do Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Key className="w-4 h-4 text-blue-400" />
                <span>Token de Acesso (OAuth Access Token)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowTutorial(!showTutorial)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Como obter este token?</span>
                {showTutorial ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            <textarea
              rows={3}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Cole aqui seu Access Token gerado no Google Cloud ou Google OAuth Playground..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors font-mono"
            />
            <p className="text-[11px] text-slate-400">
              Escopo necessário: <code className="text-blue-400 font-mono">https://www.googleapis.com/auth/drive.file</code>
            </p>
          </div>

          {/* Mini Tutorial Interativo Passo a Passo */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/50">
            <button
              type="button"
              onClick={() => setShowTutorial(!showTutorial)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Guia Rápido: Como conectar seu Google Drive em 3 passos
                </span>
              </div>
              {showTutorial ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showTutorial && (
              <div className="p-5 border-t border-slate-800 space-y-4 text-xs text-slate-300">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 font-bold text-white">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Acessar o Google OAuth Playground</span>
                  </div>
                  <p className="pl-7 text-slate-400">
                    Abra a ferramenta oficial do Google em{' '}
                    <a
                      href="https://developers.google.com/oauthplayground"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 underline font-semibold inline-flex items-center space-x-1"
                    >
                      <span>developers.google.com/oauthplayground</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 font-bold text-white">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Selecionar o Escopo do Drive</span>
                  </div>
                  <p className="pl-7 text-slate-400">
                    No painel da esquerda, procure por <strong className="text-white">Drive API v3</strong> e marque a opção:
                    <br />
                    <code className="text-blue-400 bg-slate-900 px-1.5 py-0.5 rounded font-mono text-[11px] block mt-1">
                      https://www.googleapis.com/auth/drive.file
                    </code>
                    Depois clique no botão azul <strong className="text-white">Authorize APIs</strong> e faça login na sua conta Google.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 font-bold text-white">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>Gerar e Copiar o Access Token</span>
                  </div>
                  <p className="pl-7 text-slate-400">
                    Na etapa 2 (Step 2), clique no botão <strong className="text-white">Exchange authorization code for tokens</strong>.
                    Copie o campo <strong className="text-white">Access Token</strong> gerado e cole no campo acima!
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px]">
                  💡 <strong>Segurança:</strong> O escopo <code className="text-white">drive.file</code> garante acesso <em>apenas</em> aos arquivos criados pelo PriceU$ na pasta <code className="text-white">/PriceUS_Galerias</code>. Suas outras fotos e arquivos no Google Drive permanecem 100% protegidos e inacessíveis.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/50">
          {isConnected ? (
            <button
              type="button"
              onClick={handleDisconnect}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Desconectar
            </button>
          ) : (
            <div />
          )}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition-all"
            >
              Salvar Conexão
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
