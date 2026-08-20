import React, { useState, useEffect } from 'react';
import {
  Instagram,
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Unlink,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  Key,
} from 'lucide-react';
import {
  getInstagramOAuthUrl,
  fetchConnectedInstagramAccounts,
  InstagramAccountInfo,
} from '../../services/instagramPublishService';

interface InstagramConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: (account: InstagramAccountInfo) => void;
}

export function InstagramConnectionModal({
  isOpen,
  onClose,
  onConnected,
}: InstagramConnectionModalProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<InstagramAccountInfo[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [customToken, setCustomToken] = useState('');
  const [showManualToken, setShowManualToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Carregar contas salvas ao abrir
  useEffect(() => {
    if (isOpen) {
      checkExistingConnection();
    }
  }, [isOpen]);

  const checkExistingConnection = async (tokenOverride?: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = tokenOverride || localStorage.getItem('priceus_instagram_token') || import.meta.env.VITE_INSTAGRAM_ACCESS_TOKEN;
      if (!token) {
        setAccounts([]);
        setLoading(false);
        return;
      }

      const connectedAccounts = await fetchConnectedInstagramAccounts(token);
      setAccounts(connectedAccounts);

      if (connectedAccounts.length > 0) {
        const primary = connectedAccounts[0];
        setSelectedAccountId(primary.id);
        localStorage.setItem('priceus_instagram_account_id', primary.id);
        if (tokenOverride) {
          localStorage.setItem('priceus_instagram_token', tokenOverride);
        }
        if (onConnected) onConnected(primary);
      }
    } catch (err: any) {
      console.warn('Erro ao checar conexão do Instagram:', err);
      // Se deu erro no token, manter estado limpo
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleOAuthConnect = () => {
    const oauthUrl = getInstagramOAuthUrl(window.location.origin);
    const popup = window.open(
      oauthUrl,
      'InstagramOAuth',
      'width=600,height=750,scrollbars=yes,status=yes'
    );

    // Escutar retorno do popup
    const checkPopup = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(checkPopup);
        checkExistingConnection();
      }
    }, 1000);
  };

  const handleSaveManualToken = async () => {
    if (!customToken.trim()) return;
    setLoading(true);
    try {
      await checkExistingConnection(customToken.trim());
      setSuccessToast('Conta vinculada com sucesso!');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      setError('Token inválido ou expirado. Verifique e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('priceus_instagram_token');
    localStorage.removeItem('priceus_instagram_account_id');
    setAccounts([]);
    setSelectedAccountId('');
    setSuccessToast('Conta do Instagram desconectada.');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const isConnected = accounts.length > 0;
  const activeAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      {/* Success Toast */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-top">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col text-white relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
              <Instagram className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Conexão Oficial com o Instagram</h3>
              <p className="text-xs text-slate-400">Postagem automática de Feed, Carrosséis e Stories</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isConnected ? (
            /* Estado: CONECTADO */
            <div className="space-y-4">
              <div className="p-5 rounded-3xl bg-slate-950 border border-emerald-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 shadow-lg">
                      <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center overflow-hidden">
                        {activeAccount?.profilePictureUrl ? (
                          <img
                            src={activeAccount.profilePictureUrl}
                            alt="Perfil Instagram"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Instagram className="w-7 h-7 text-rose-400" />
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base text-white flex items-center gap-1.5">
                        <span>@{activeAccount?.username || 'sua_conta'}</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </h4>
                      <p className="text-xs text-slate-400 font-mono">
                        ID: {activeAccount?.id}
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-xs border border-emerald-500/30">
                    ● Conectado
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#00a884]" />
                    <span>Publicação com 1 clique habilitada</span>
                  </span>

                  <button
                    onClick={() => checkExistingConnection()}
                    disabled={loading}
                    className="flex items-center gap-1 text-purple-400 hover:text-purple-300 font-bold"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    <span>Testar</span>
                  </button>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleDisconnect}
                  className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-700 hover:border-rose-500/40"
                >
                  <Unlink className="w-4 h-4" />
                  <span>Desconectar Conta</span>
                </button>

                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2"
                >
                  <span>Concluir</span>
                </button>
              </div>
            </div>
          ) : (
            /* Estado: DESCONECTADO */
            <div className="space-y-4">
              <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-3 text-center">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 mx-auto shadow-xl">
                  <div className="w-full h-full bg-slate-900 rounded-3xl flex items-center justify-center text-white">
                    <Instagram className="w-8 h-8" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="font-extrabold text-base text-white">Vincule seu Instagram ao PriceU$</h4>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                    Publique posts solos, carrosséis de até 20 fotos e Stories de alta conversão diretamente das suas galerias sem precisar baixar nada.
                  </p>
                </div>

                {/* Botão de Login OAuth */}
                <div className="pt-2">
                  <button
                    onClick={handleOAuthConnect}
                    disabled={loading}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-90 text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2.5 transition cursor-pointer"
                  >
                    <Instagram className="w-5 h-5" />
                    <span>Conectar Conta do Instagram (1 Clique)</span>
                  </button>
                </div>
              </div>

              {/* Informações dos Requisitos */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 text-[11px] text-slate-400">
                <p className="font-bold text-slate-300 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-purple-400" /> Requisitos da Meta:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Sua conta do Instagram deve ser <b>Profissional (Creator ou Comercial)</b>.</li>
                  <li>O Instagram deve estar vinculado a uma <b>Página do Facebook</b>.</li>
                </ul>
              </div>

              {/* Opção Avançada: Token Manual */}
              <div className="pt-1">
                <button
                  onClick={() => setShowManualToken(!showManualToken)}
                  className="text-xs text-slate-500 hover:text-slate-400 flex items-center gap-1 mx-auto transition"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{showManualToken ? 'Ocultar inserção manual' : 'Inserir Token de Acesso Manualmente'}</span>
                </button>

                {showManualToken && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 animate-in fade-in">
                    <label className="text-xs font-bold text-slate-300 block">Token de Acesso (Meta Graph API):</label>
                    <input
                      type="password"
                      value={customToken}
                      onChange={(e) => setCustomToken(e.target.value)}
                      placeholder="EAA..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-purple-500 font-mono"
                    />
                    <button
                      onClick={handleSaveManualToken}
                      disabled={loading || !customToken.trim()}
                      className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition disabled:opacity-50"
                    >
                      {loading ? 'Validando...' : 'Salvar e Conectar'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
