import { useState, useEffect, useMemo } from 'react';
import { X, Search, Download, Check, CreditCard, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SourceTemplate {
  id: string;
  nome_template: string;
  titulo_template?: string | null;
}

interface ImportablePaymentMethod {
  id: string;
  template_id: string;
  templateName: string;
  nome: string;
  entrada_tipo: 'percentual' | 'fixo';
  entrada_valor: number;
  max_parcelas: number;
  acrescimo: number;
  is_default?: boolean;
}

interface ImportPaymentFromTemplateModalProps {
  userId: string;
  currentTemplateId?: string;
  existingPaymentNames?: string[];
  hasExistingDefault?: boolean;
  onClose: () => void;
  onImport: (
    methods: Array<{
      nome: string;
      entrada_tipo: 'percentual' | 'fixo';
      entrada_valor: number;
      max_parcelas: number;
      acrescimo: number;
      is_default?: boolean;
    }>
  ) => void;
}

export function ImportPaymentFromTemplateModal({
  userId,
  currentTemplateId,
  existingPaymentNames = [],
  hasExistingDefault = false,
  onClose,
  onImport,
}: ImportPaymentFromTemplateModalProps) {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<SourceTemplate[]>([]);
  const [methods, setMethods] = useState<ImportablePaymentMethod[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const existingNamesSet = useMemo(
    () => new Set(existingPaymentNames.map((n) => n.trim().toLowerCase()).filter(Boolean)),
    [existingPaymentNames]
  );

  useEffect(() => {
    let active = true;

    const loadTemplatesAndPayments = async () => {
      setLoading(true);
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
          setMethods([]);
          return;
        }

        const templateMap = new Map<string, SourceTemplate>();
        templateList.forEach((t) => templateMap.set(t.id, t));

        const { data: formasData, error: formasError } = await supabase
          .from('formas_pagamento')
          .select('*')
          .in('template_id', templateList.map((t) => t.id));

        if (formasError) throw formasError;
        if (!active) return;

        const hydrated: ImportablePaymentMethod[] = (formasData || []).map((f: any) => {
          const tpl = templateMap.get(f.template_id);
          return {
            id: f.id,
            template_id: f.template_id,
            templateName: tpl?.nome_template || tpl?.titulo_template || 'Template sem nome',
            nome: f.nome || 'Forma sem nome',
            entrada_tipo: f.entrada_tipo === 'percentual' ? 'percentual' : 'fixo',
            entrada_valor: Number(f.entrada_valor || 0),
            max_parcelas: Number(f.max_parcelas || 1),
            acrescimo: Number(f.acrescimo || 0),
            is_default: Boolean(f.is_default),
          };
        });

        setMethods(hydrated);
      } catch (err) {
        console.error('Erro ao carregar formas de pagamento de outros templates:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadTemplatesAndPayments();
    return () => {
      active = false;
    };
  }, [userId, currentTemplateId]);

  const filteredMethods = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return methods.filter((m) => {
      if (selectedTemplateId !== 'all' && m.template_id !== selectedTemplateId) {
        return false;
      }
      if (!q) return true;
      return (
        m.nome.toLowerCase().includes(q) ||
        m.templateName.toLowerCase().includes(q)
      );
    });
  }, [methods, selectedTemplateId, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = filteredMethods.length > 0 && filteredMethods.every((m) => next.has(m.id));
      if (allSelected) {
        filteredMethods.forEach((m) => next.delete(m.id));
      } else {
        filteredMethods.forEach((m) => next.add(m.id));
      }
      return next;
    });
  };

  const handleConfirmImport = () => {
    const chosen = methods.filter((m) => selectedIds.has(m.id));
    if (chosen.length === 0) return;

    let assignedDefault = hasExistingDefault;
    const cloned = chosen.map((m) => {
      const canBeDefault = !assignedDefault && Boolean(m.is_default);
      if (canBeDefault) assignedDefault = true;

      return {
        nome: m.nome,
        entrada_tipo: m.entrada_tipo,
        entrada_valor: m.entrada_valor,
        max_parcelas: m.max_parcelas,
        acrescimo: m.acrescimo,
        is_default: canBeDefault,
      };
    });

    onImport(cloned);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0d1829] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Importar Formas de Pagamento
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Escolha formas de pagamento já configuradas em outros templates para copiar entrada, parcelas e acréscimos.
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

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#091220] flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou template..."
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

          {filteredMethods.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors whitespace-nowrap"
            >
              {filteredMethods.every((m) => selectedIds.has(m.id)) ? 'Desmarcar' : 'Selecionar todas'}
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
              <p className="text-sm">Carregando formas de pagamento...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Você ainda não possui outros templates.</p>
            </div>
          ) : filteredMethods.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhuma forma de pagamento encontrada.</p>
              <p className="text-xs mt-1">Tente limpar os filtros ou cadastrar formas em outro template.</p>
            </div>
          ) : (
            filteredMethods.map((method) => {
              const isSelected = selectedIds.has(method.id);
              const alreadyExists = existingNamesSet.has(method.nome.trim().toLowerCase());
              const entradaLabel =
                method.entrada_valor > 0
                  ? method.entrada_tipo === 'percentual'
                    ? `Entrada: ${method.entrada_valor}%`
                    : `Entrada: ${method.entrada_valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                  : 'Sem entrada';

              const acrescimoLabel =
                method.acrescimo > 0
                  ? `+${method.acrescimo}% acréscimo`
                  : method.acrescimo < 0
                    ? `${method.acrescimo}% desconto`
                    : 'Sem acréscimo';

              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => toggleSelect(method.id)}
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

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {method.nome}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 font-medium">
                        {method.templateName}
                      </span>
                      {method.is_default && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-medium">
                          Padrão
                        </span>
                      )}
                      {alreadyExists && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium">
                          Já no template
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      <span>{entradaLabel}</span>
                      <span>•</span>
                      <span>Até {method.max_parcelas}x</span>
                      <span>•</span>
                      <span>{acrescimoLabel}</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#091220]">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {selectedIds.size === 0
              ? 'Nenhuma forma selecionada'
              : `${selectedIds.size} ${selectedIds.size === 1 ? 'forma selecionada' : 'formas selecionadas'}`}
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
              disabled={selectedIds.size === 0}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectedIds.size > 0
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-300 dark:bg-white/10 text-gray-500 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              <Download className="w-4 h-4" />
              Importar {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

