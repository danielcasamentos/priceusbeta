import { useState, useEffect } from 'react';
import { X, Sparkles, ShieldCheck, Eye, Check, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import {
  generateContractLibraryByNiche,
  ContractLibraryTemplate,
} from '../services/contractLibraryAiService';

interface ContractLibraryModalProps {
  defaultNiche?: string;
  onClose: () => void;
  onAcceptTemplate: (template: { name: string; content_text: string }) => Promise<void>;
}

export function ContractLibraryModal({
  defaultNiche = '',
  onClose,
  onAcceptTemplate,
}: ContractLibraryModalProps) {
  const [niche, setNiche] = useState(defaultNiche || 'Fotografia e Eventos');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState<'ai' | 'fallback' | null>(null);
  const [contracts, setContracts] = useState<ContractLibraryTemplate[]>([]);
  const [previewContract, setPreviewContract] = useState<ContractLibraryTemplate | null>(null);

  const loadLibrary = async (targetNiche: string) => {
    setLoading(true);
    setPreviewContract(null);
    try {
      const res = await generateContractLibraryByNiche(targetNiche);
      setContracts(res.contracts);
      setSource(res.source);
    } catch (err) {
      console.error('Erro ao gerar biblioteca de contratos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLibrary(niche);
  }, []);

  const handleAccept = async (contract: ContractLibraryTemplate) => {
    setSaving(true);
    try {
      await onAcceptTemplate({
        name: contract.name,
        content_text: contract.content_text,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0d1829] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Biblioteca Jurídica de Contratos (10 Modelos IA)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Leia o contrato completo antes de decidir. Nada é salvo até você clicar em "Aceitar e Usar Modelo".
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Se está lendo um contrato específico */}
        {previewContract ? (
          <>
            <div className="px-6 py-3 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#091220] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPreviewContract(null)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar à lista dos 10 modelos
              </button>
              <span className="text-xs px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-medium">
                {previewContract.category}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                  {previewContract.name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {previewContract.summary}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {previewContract.legalHighlights.map((h, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-medium"
                    >
                      🛡️ {h}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#091220] text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-mono">
                {previewContract.content_text}
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#091220]">
              <button
                type="button"
                onClick={() => setPreviewContract(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
              >
                Não usar / Voltar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleAccept(previewContract)}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? 'Salvando...' : 'Aceitar e Usar Modelo (Editável)'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Barra de Ramo de Negócio */}
            <div className="px-6 py-3 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#091220] flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    loadLibrary(niche);
                  }
                }}
                placeholder="Informe seu ramo de negócio (ex: Fotografia de Casamento, Buffet, DJ)..."
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#0d1829] text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => loadLibrary(niche)}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Gerando 10 modelos...' : 'Gerar 10 Contratos (IA)'}
              </button>
            </div>

            {/* Lista dos 10 Contratos */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-14 text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
                  <p className="text-sm font-medium">
                    Gerando 10 contratos com proteção jurídica para "{niche}"...
                  </p>
                </div>
              ) : (
                <>
                  {source === 'fallback' && (
                    <div className="text-xs px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300">
                      Modelos jurídicos base carregados localmente (configure sua chave Groq caso deseje variação dinâmica via IA).
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {contracts.map((contract) => (
                      <div
                        key={contract.id}
                        className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-purple-400 transition-all flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-medium">
                              {contract.category}
                            </span>
                            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                          </div>
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                            {contract.name}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {contract.summary}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {contract.legalHighlights.map((h, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              >
                                🛡️ {h}
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setPreviewContract(contract)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-gray-900 dark:bg-white/10 text-white hover:bg-gray-800 dark:hover:bg-white/20 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Abrir e Ler Contrato Completo
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

