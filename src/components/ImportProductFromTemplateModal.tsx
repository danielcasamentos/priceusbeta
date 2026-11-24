import { useState, useEffect, useMemo } from 'react';
import { X, Search, Download, Check, Package, Layers, Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  suggestProductsForTemplate,
  SuggestedTemplateProduct,
} from '../services/geminiProductOptimizerService';

interface SourceTemplate {
  id: string;
  nome_template: string;
  titulo_template?: string | null;
  tema_personalizado?: any;
  collab_valores_manuais?: any;
}

interface ImportableProduct {
  id: string;
  template_id: string;
  templateName: string;
  nome: string;
  resumo: string;
  valor: number;
  unidade: string;
  obrigatorio: boolean;
  ordem: number;
  imagem_url?: string;
  mostrar_imagem: boolean;
  imagens?: string[];
  carrossel_automatico?: boolean;
  permite_multiplas_unidades?: boolean;
  desconto_percentual?: number;
  destacar_produto?: boolean;
  destaque_texto?: string;
  duracao_minutos?: number | null;
  brindes_vinculados?: string[] | null;
  brindes_titulo_personalizado?: string;
  brindes_mostrar_valores?: boolean;
  brindes_expira?: boolean;
  brindes_expira_tipo?: string;
  brindes_expira_dias?: number;
  brindes_expira_data?: string | null;
  brindes_quantidades?: Record<string, any>;
  quantidade_maxima?: number | null;
  grupo_desconto?: string | null;
  faixas_preco?: any[] | null;
  escaloes_quantidade?: any[] | null;
  regras_preco_data?: any[] | null;
}

interface ImportProductFromTemplateModalProps {
  userId: string;
  currentTemplateId?: string;
  templateName?: string;
  templateTitle?: string;
  existingProductNames?: string[];
  initialTab?: 'ai' | 'templates';
  onClose: () => void;
  onImport: (products: any[]) => void;
}

export function ImportProductFromTemplateModal({
  userId,
  currentTemplateId,
  templateName,
  templateTitle,
  existingProductNames = [],
  initialTab = 'ai',
  onClose,
  onImport,
}: ImportProductFromTemplateModalProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'templates'>(initialTab);

  // Tab: Templates existentes
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templates, setTemplates] = useState<SourceTemplate[]>([]);
  const [products, setProducts] = useState<ImportableProduct[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplateProductIds, setSelectedTemplateProductIds] = useState<Set<string>>(new Set());

  // Tab: Sugestões IA
  const defaultTheme = (templateTitle || templateName || '').trim();
  const [aiTheme, setAiTheme] = useState(defaultTheme);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSource, setAiSource] = useState<'ai' | 'fallback' | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<SuggestedTemplateProduct[]>([]);
  const [selectedAiIds, setSelectedAiIds] = useState<Set<string>>(new Set());
  const [aiInitialized, setAiInitialized] = useState(false);

  const existingNamesSet = useMemo(
    () => new Set(existingProductNames.map((n) => n.trim().toLowerCase()).filter(Boolean)),
    [existingProductNames]
  );

  // Carregar produtos de outros templates
  useEffect(() => {
    let active = true;

    const loadTemplatesAndProducts = async () => {
      setLoadingTemplates(true);
      try {
        let query = supabase
          .from('templates')
          .select('*')
          .eq('user_id', userId)
          .order('nome_template', { ascending: true });

        if (currentTemplateId) {
          query = query.neq('id', currentTemplateId);
        }

        const { data: templatesData, error: templatesError } = await query;
        if (templatesError) throw templatesError;

        const templateList = (templatesData || []) as SourceTemplate[];
        if (!active) return;
        setTemplates(templateList);

        if (templateList.length === 0) {
          setProducts([]);
          return;
        }

        const templateMap = new Map<string, SourceTemplate>();
        templateList.forEach((t) => templateMap.set(t.id, t));

        const { data: produtosData, error: produtosError } = await supabase
          .from('produtos')
          .select('*')
          .in('template_id', templateList.map((t) => t.id))
          .order('ordem', { ascending: true });

        if (produtosError) throw produtosError;
        if (!active) return;

        const hydrated: ImportableProduct[] = (produtosData || []).map((p: any) => {
          const tpl = templateMap.get(p.template_id);
          const customObj = {
            ...(tpl?.tema_personalizado || {}),
            ...(tpl?.collab_valores_manuais || {}),
          };
          const prodExtrasMap: Record<string, any> = customObj.produtos_extras || {};
          const bq = p.brindes_quantidades || {};

          return {
            ...p,
            templateName: tpl?.nome_template || tpl?.titulo_template || 'Template sem nome',
            grupo_desconto: p.grupo_desconto ?? bq._grupo_desconto ?? prodExtrasMap[p.id]?.grupo_desconto ?? null,
            faixas_preco: p.faixas_preco ?? bq._faixas_preco ?? prodExtrasMap[p.id]?.faixas_preco ?? [],
            escaloes_quantidade: p.escaloes_quantidade ?? bq._escaloes_quantidade ?? prodExtrasMap[p.id]?.escaloes_quantidade ?? [],
            regras_preco_data: p.regras_preco_data ?? bq._regras_preco_data ?? prodExtrasMap[p.id]?.regras_preco_data ?? [],
          };
        });

        setProducts(hydrated);
      } catch (err) {
        console.error('Erro ao carregar produtos de outros templates:', err);
      } finally {
        if (active) setLoadingTemplates(false);
      }
    };

    loadTemplatesAndProducts();
    return () => {
      active = false;
    };
  }, [userId, currentTemplateId]);

  const runAiSuggestions = async (themeToUse: string) => {
    setAiLoading(true);
    setSelectedAiIds(new Set());
    try {
      const result = await suggestProductsForTemplate(themeToUse, existingProductNames);
      setAiSuggestions(result.products);
      setAiSource(result.source);
    } catch (err) {
      console.error('Erro ao gerar sugestões de produtos:', err);
    } finally {
      setAiLoading(false);
      setAiInitialized(true);
    }
  };

  useEffect(() => {
    if (activeTab === 'ai' && !aiInitialized && !aiLoading) {
      runAiSuggestions(aiTheme || 'Serviços de Eventos');
    }
  }, [activeTab]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedTemplateId !== 'all' && p.template_id !== selectedTemplateId) {
        return false;
      }
      if (!q) return true;
      return (
        (p.nome || '').toLowerCase().includes(q) ||
        (p.resumo || '').toLowerCase().includes(q) ||
        p.templateName.toLowerCase().includes(q)
      );
    });
  }, [products, selectedTemplateId, searchQuery]);

  const toggleId = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalSelectedCount = selectedAiIds.size + selectedTemplateProductIds.size;

  const handleConfirmImport = () => {
    if (totalSelectedCount === 0) return;

    const fromAi = aiSuggestions
      .filter((s) => selectedAiIds.has(s.id))
      .map((s) => ({
        nome: s.nome,
        resumo: s.resumo,
        valor: s.valor,
        unidade: s.unidade,
        obrigatorio: s.obrigatorio,
        mostrar_imagem: true,
        imagens: [],
        carrossel_automatico: false,
        permite_multiplas_unidades: true,
        desconto_percentual: 0,
        destacar_produto: false,
        destaque_texto: undefined,
        duracao_minutos: null,
      }));

    const fromTemplates = products
      .filter((p) => selectedTemplateProductIds.has(p.id))
      .map(({ id: _id, template_id: _tid, templateName: _tname, ...rest }) => {
        const copy = structuredClone(rest) as any;
        delete copy.created_at;
        delete copy.updated_at;
        const imagensList = Array.isArray(copy.imagens) ? copy.imagens.filter(Boolean) : [];
        copy.imagem_url = copy.imagem_url || null;
        copy.imagens = imagensList;
        copy.mostrar_imagem = copy.mostrar_imagem ?? Boolean(copy.imagem_url || imagensList.length > 0);
        return copy;
      });

    onImport([...fromAi, ...fromTemplates]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0d1829] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Biblioteca de Produtos
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gere sugestões inteligentes com IA para o tema do seu template ou importe de outros templates.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#091220] px-6">
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'ai'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Sugestões Inteligentes (IA)
            {selectedAiIds.size > 0 && (
              <span className="px-1.5 py-0.5 text-[11px] rounded-full bg-indigo-600 text-white">
                {selectedAiIds.size}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            De Outros Templates ({products.length})
            {selectedTemplateProductIds.size > 0 && (
              <span className="px-1.5 py-0.5 text-[11px] rounded-full bg-indigo-600 text-white">
                {selectedTemplateProductIds.size}
              </span>
            )}
          </button>
        </div>

        {/* AI Tab */}
        {activeTab === 'ai' && (
          <>
            <div className="px-6 py-3 border-b border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-[#091220]/60 flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={aiTheme}
                onChange={(e) => setAiTheme(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    runAiSuggestions(aiTheme);
                  }
                }}
                placeholder="Ex: Casamento Clássico, Ensaio Gestante, Buffet Corporativo..."
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#0d1829] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => runAiSuggestions(aiTheme)}
                disabled={aiLoading}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${aiLoading ? 'animate-spin' : ''}`} />
                {aiLoading ? 'Gerando...' : 'Gerar Sugestões'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {aiLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
                  <p className="text-sm font-medium">Analisando o tema "{aiTheme || 'do template'}" e montando sugestões...</p>
                </div>
              ) : aiSuggestions.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">Informe o tema do serviço acima e clique em "Gerar Sugestões".</p>
                </div>
              ) : (
                <>
                  {aiSource === 'fallback' && (
                    <div className="text-xs px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300">
                      Sugestões geradas pelo catálogo local inteligente (configure a chave Groq caso queira geração dinâmica via IA).
                    </div>
                  )}
                  {aiSuggestions.map((item) => {
                    const isSelected = selectedAiIds.has(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleId(setSelectedAiIds, item.id)}
                        className={`w-full text-left flex items-start gap-3.5 p-4 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-500/15 shadow-sm'
                            : 'border-gray-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-white/25 bg-white dark:bg-white/[0.02]'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 mt-0.5 rounded-md flex items-center justify-center flex-shrink-0 border transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-gray-300 dark:border-white/25 bg-white dark:bg-transparent'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-gray-900 dark:text-white">
                              {item.nome}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-medium">
                              {item.categoria}
                            </span>
                            {item.obrigatorio && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-medium">
                                Obrigatório
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2 whitespace-pre-line">
                            {item.resumo}
                          </p>
                          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1.5">
                            💡 {item.motivo}
                          </p>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">
                            {Number(item.valor || 0).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            por {item.unidade || 'unidade'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <>
            <div className="px-6 py-3 border-b border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-[#091220]/60 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome, descrição ou template..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#0d1829] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="sm:w-64 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#0d1829] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Todos os templates ({templates.length})</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome_template || t.titulo_template || 'Sem nome'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {loadingTemplates ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
                  <p className="text-sm">Carregando produtos dos seus templates...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">Você ainda não possui outros templates.</p>
                  <p className="text-xs mt-1">Use a aba "Sugestões Inteligentes (IA)" para criar produtos rapidamente.</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">Nenhum produto encontrado.</p>
                  <p className="text-xs mt-1">Tente limpar a busca ou escolher outro template.</p>
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const isSelected = selectedTemplateProductIds.has(product.id);
                  const alreadyExists = existingNamesSet.has((product.nome || '').trim().toLowerCase());
                  const thumb = product.imagem_url || product.imagens?.[0];
                  const hasProgressive =
                    (product.faixas_preco && product.faixas_preco.length > 0) ||
                    (product.escaloes_quantidade && product.escaloes_quantidade.length > 0) ||
                    (product.regras_preco_data && product.regras_preco_data.length > 0);

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => toggleId(setSelectedTemplateProductIds, product.id)}
                      className={`w-full text-left flex items-center gap-4 p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-500/15 shadow-sm'
                          : 'border-gray-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-white/25 bg-white dark:bg-white/[0.02]'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-gray-300 dark:border-white/25 bg-white dark:bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>

                      {thumb ? (
                        <img
                          src={thumb}
                          alt={product.nome}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-200 dark:border-white/10"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0 text-gray-400">
                          <Package className="w-5 h-5" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                            {product.nome || 'Produto sem nome'}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 font-medium">
                            {product.templateName}
                          </span>
                          {alreadyExists && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium">
                              Já no template
                            </span>
                          )}
                          {product.obrigatorio && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-medium">
                              Obrigatório
                            </span>
                          )}
                          {hasProgressive && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-medium">
                              Regras/Faixas
                            </span>
                          )}
                        </div>
                        {product.resumo && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {product.resumo}
                          </p>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {Number(product.valor || 0).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          por {product.unidade || 'unidade'}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#091220]">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {totalSelectedCount === 0
              ? 'Nenhum produto selecionado'
              : `${totalSelectedCount} ${totalSelectedCount === 1 ? 'produto selecionado' : 'produtos selecionados'}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={totalSelectedCount === 0}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                totalSelectedCount > 0
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-300 dark:bg-white/10 text-gray-500 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              <Download className="w-4 h-4" />
              Adicionar ao Template {totalSelectedCount > 0 ? `(${totalSelectedCount})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
