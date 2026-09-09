import { useState, useEffect } from 'react';
import { Sparkles, Check, Copy, X, Loader2, ArrowRight, Lightbulb, RefreshCw, Wand2, ShieldCheck, Heart, Zap, FileText } from 'lucide-react';
import { optimizeProductDescription, ProductOptimizationResponse, ProductOptimizationSuggestion } from '../services/geminiProductOptimizerService';
import { FormattedDescription } from './ui/FormattedDescription';

interface AIProductDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  currentDescription: string;
  price?: number;
  unit?: string;
  onApplyDescription: (newText: string) => void;
}

export function AIProductDescriptionModal({
  isOpen,
  onClose,
  productName,
  currentDescription,
  price,
  unit,
  onApplyDescription
}: AIProductDescriptionModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProductOptimizationResponse | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<number>(1);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [appliedId, setAppliedId] = useState<number | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showOriginalText, setShowOriginalText] = useState(false);

  useEffect(() => {
    if (isOpen) {
      handleGenerate();
    } else {
      setData(null);
      setAppliedId(null);
      setCopiedId(null);
      setCustomPrompt('');
      setShowOriginalText(false);
    }
  }, [isOpen]);

  const handleGenerate = async (instruction?: string) => {
    setLoading(true);
    try {
      const res = await optimizeProductDescription(
        productName,
        currentDescription,
        price,
        unit,
        instruction || customPrompt
      );
      setData(res);
      if (res.suggestions?.length > 0) {
        setSelectedSuggestionId(res.suggestions[0].id);
      }
    } catch (err) {
      console.error('Erro ao gerar sugestões com IA:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleApply = (text: string, id: number) => {
    onApplyDescription(text);
    setAppliedId(id);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  const currentSuggestion = data?.suggestions?.find(s => s.id === selectedSuggestionId) || data?.suggestions?.[0];

  const getBadgeIcon = (id: number) => {
    if (id === 1) return <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />;
    if (id === 2) return <Heart className="w-3.5 h-3.5 text-rose-400" />;
    return <Zap className="w-3.5 h-3.5 text-emerald-400" />;
  };

  const getBadgeColorClasses = (id: number, isSelected: boolean) => {
    if (id === 1) {
      return isSelected
        ? 'bg-indigo-950/90 text-indigo-200 border-indigo-400 ring-2 ring-indigo-400/40 shadow-lg shadow-indigo-950/50'
        : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:bg-slate-800/90 hover:border-indigo-500/50';
    }
    if (id === 2) {
      return isSelected
        ? 'bg-rose-950/90 text-rose-200 border-rose-400 ring-2 ring-rose-400/40 shadow-lg shadow-rose-950/50'
        : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:bg-slate-800/90 hover:border-rose-500/50';
    }
    return isSelected
      ? 'bg-emerald-950/90 text-emerald-200 border-emerald-400 ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-950/50'
      : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:bg-slate-800/90 hover:border-emerald-500/50';
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-3 sm:p-6 animate-fade-in text-slate-100">
      <div className="relative max-w-4xl w-full bg-[#0b1329] border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4 bg-[#080e1e]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/40 shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Otimizador de Vendas com IA
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/25 text-indigo-300 border border-indigo-400/40 uppercase tracking-wider">
                  Reescrita Inteligente
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Reorganizando o texto de: <span className="text-white font-semibold">"{productName || 'Produto'}"</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleGenerate()}
              disabled={loading}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50"
              title="Gerar novas opções"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Regerar</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="relative flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 animate-spin flex items-center justify-center shadow-lg shadow-indigo-500/40">
                  <div className="w-12 h-12 rounded-xl bg-[#0b1329] flex items-center justify-center">
                    <Wand2 className="w-6 h-6 text-indigo-400" />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-white">Lendo seu texto base e formatando 3 abordagens de vendas...</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Preservando todos os seus itens, etapas e equipe com visto verde, negrito e títulos.
                </p>
              </div>
            </div>
          ) : data ? (
            <>
              {/* Diagnóstico da IA e Visualização do Texto Original */}
              <div className="space-y-2">
                {data.analysis && (
                  <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/35 flex items-start gap-3 shadow-sm">
                    <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-indigo-200 uppercase tracking-wide">Como seu texto foi aprimorado:</p>
                      <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">{data.analysis}</p>
                    </div>
                  </div>
                )}

                {currentDescription && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setShowOriginalText(!showOriginalText)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 transition-colors"
                    >
                      <FileText className="w-3 h-3" />
                      {showOriginalText ? 'Ocultar texto base original' : 'Ver texto base original fornecido'}
                    </button>
                    {showOriginalText && (
                      <div className="mt-1.5 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed animate-fade-in">
                        {currentDescription}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Seletor de 3 Abordagens */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                  Escolha uma das 3 versões sugeridas:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {data.suggestions.map((sug) => {
                    const isSelected = sug.id === selectedSuggestionId;
                    return (
                      <button
                        key={sug.id}
                        type="button"
                        onClick={() => setSelectedSuggestionId(sug.id)}
                        className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between gap-2.5 ${getBadgeColorClasses(
                          sug.id,
                          isSelected
                        )}`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
                              {getBadgeIcon(sug.id)}
                              {sug.badge}
                            </span>
                            {isSelected && (
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400" />
                            )}
                          </div>
                          <p className="text-sm font-bold text-white leading-snug">{sug.title}</p>
                          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{sug.strategy}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card de Visualização da Sugestão Selecionada */}
              {currentSuggestion && (
                <div className="border border-slate-700/80 rounded-2xl bg-[#0f1a30] overflow-hidden shadow-xl space-y-4 p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide">
                        Gatilho de Vendas Utilizado:
                      </span>
                      <p className="text-xs text-slate-200 mt-0.5 font-medium">
                        💡 {currentSuggestion.whyItConverts}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(currentSuggestion.text, currentSuggestion.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
                      >
                        {copiedId === currentSuggestion.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApply(currentSuggestion.text, currentSuggestion.id)}
                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {appliedId === currentSuggestion.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-white" />
                            <span>Aplicado!</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Usar Este Texto</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Preview Formatado do Texto */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Prévia Formatada (Como o Cliente Verá no Orçamento):
                    </label>
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#030712] border border-slate-700/90 max-h-[280px] overflow-y-auto text-slate-100 shadow-inner">
                      <FormattedDescription text={currentSuggestion.text} className="text-sm text-slate-100" />
                    </div>
                  </div>
                </div>
              )}

              {/* Caixa de Ajuste Fino / Instrução Adicional */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center gap-2.5">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleGenerate(customPrompt);
                  }}
                  placeholder="Instrução opcional para a IA (ex: 'destacar os 2 fotógrafos', 'mais curto', 'adicionar bônus')..."
                  className="flex-1 w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-slate-700 text-xs text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleGenerate(customPrompt)}
                  disabled={loading}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shrink-0 shadow-sm"
                >
                  <Wand2 className="w-3.5 h-3.5 text-indigo-200" />
                  <span>Ajustar com IA</span>
                </button>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#080e1e] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors border border-slate-700"
          >
            Cancelar
          </button>

          {currentSuggestion && (
            <button
              type="button"
              onClick={() => handleApply(currentSuggestion.text, currentSuggestion.id)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Aplicar "{currentSuggestion.badge}" ao Produto</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
