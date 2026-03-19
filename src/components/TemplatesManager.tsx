import { useState, useEffect } from 'react';
import { supabase, Template } from '../lib/supabase';
import { Plus, Edit2, Trash2, Copy, ExternalLink, Crown, AlertCircle, GripVertical, X } from 'lucide-react';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { UpgradeLimitModal } from './UpgradeLimitModal';
import { TemplateAnalyticsSummary } from './TemplateAnalyticsSummary';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TemplatesManagerProps {
  userId: string;
  onEditTemplate?: (templateId: string) => void;
}

interface SortableTemplateCardProps {
  template: Template;
  onEdit: () => void;
  onEditName: () => void;
  onCopyUrl: () => void;
  onViewTemplate: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function SortableTemplateCard({
  template,
  onEdit,
  onEditName,
  onCopyUrl,
  onViewTemplate,
  onDuplicate,
  onDelete,
}: SortableTemplateCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: template.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-gray-900">
                {template.nome_template}
              </h3>
              <button
                onClick={onEditName}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Editar nome"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            {template.titulo_template && (
              <p className="text-gray-600 mt-1">{template.titulo_template}</p>
            )}
          </div>
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Arrastar para reordenar"
          >
            <GripVertical className="w-5 h-5" />
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-medium">Criado em:</span>
            <span>{new Date(template.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="flex items-center gap-2">
            {template.bloquear_campos_obrigatorios && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                🔒 Campos Bloqueados
              </span>
            )}
            {template.ocultar_valores_intermediarios && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                👁️ Valores Ocultos
              </span>
            )}
          </div>
        </div>

        {/* Container de Ações */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-4">
          {/* Ações visíveis sempre, quebram linha no celular */}
          <div className="flex flex-wrap items-center gap-2 justify-start">
            <button
              onClick={onCopyUrl}
              className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
              title="Copiar link do orçamento"
            >
              <Copy className="w-4 h-4" /> <span className="hidden sm:inline">Copiar</span>
            </button>
            <button
              onClick={onViewTemplate}
              className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              title="Visualizar orçamento"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={onDuplicate}
              className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              title="Duplicar template"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              title="Excluir template"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Botão de Edição Principal (sempre visível) */}
          <button
            onClick={onEdit}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm"
          >
            <Edit2 className="w-4 h-4" />
            Editar
          </button>
        </div>

        {/* Analytics Section */}
        <TemplateAnalyticsSummary templateId={template.id} />
      </div>
    </div>
  );
}

export function TemplatesManager({ userId, onEditTemplate }: TemplatesManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<Template | null>(null);
  const [editTemplateName, setEditTemplateName] = useState('');
  const [editTemplateTitulo, setEditTemplateTitulo] = useState('');
  const [templateToDuplicate, setTemplateToDuplicate] = useState<Template | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateTitulo, setNewTemplateTitulo] = useState('');
  const [duplicating, setDuplicating] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const planLimits = usePlanLimits();

  useEffect(() => {
    loadTemplates();
  }, [userId]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', userId)
        .order('ordem_exibicao', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      alert('❌ Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const handleNewTemplateClick = () => {
    if (!planLimits.canCreateTemplate) {
      setShowUpgradeModal(true);
      return;
    }
    setShowNewTemplateModal(true);
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      alert('❌ Nome do template é obrigatório');
      return;
    }

    if (!planLimits.canCreateTemplate) {
      setShowNewTemplateModal(false);
      setShowUpgradeModal(true);
      return;
    }

    try {
      const maxOrdem = templates.length > 0 ? Math.max(...templates.map(t => (t as any).ordem_exibicao || 0)) : -1;

      const { error } = await supabase.from('templates').insert({
        user_id: userId,
        nome_template: newTemplateName,
        titulo_template: newTemplateTitulo || newTemplateName,
        bloquear_campos_obrigatorios: false,
        ocultar_valores_intermediarios: false,
        ordem_exibicao: maxOrdem + 1,
      });

      if (error) throw error;

      alert('✅ Template criado com sucesso!');
      setShowNewTemplateModal(false);
      setNewTemplateName('');
      setNewTemplateTitulo('');
      loadTemplates();
    } catch (error) {
      console.error('Erro ao criar template:', error);
      alert('❌ Erro ao criar template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('⚠️ Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      alert('✅ Template excluído com sucesso!');
      loadTemplates();
    } catch (error) {
      console.error('Erro ao excluir template:', error);
      alert('❌ Erro ao excluir template');
    }
  };

  const handleDuplicateClick = (template: Template) => {
    // Validar limite antes de duplicar
    if (!planLimits.canCreateTemplate) {
      setShowUpgradeModal(true);
      return;
    }

    // Abrir modal para editar o nome
    setTemplateToDuplicate(template);
    setNewTemplateName(`${template.nome_template} (Cópia)`);
    setNewTemplateTitulo(template.titulo_template || '');
    setShowDuplicateModal(true);
  };

  const handleConfirmDuplicate = async () => {
    if (!templateToDuplicate || !newTemplateName.trim()) {
      alert('❌ Nome do template é obrigatório');
      return;
    }

    setDuplicating(true);

    try {
      // 1. Criar o novo template com TODOS os campos do original
      const { data: newTemplate, error: templateError } = await supabase
        .from('templates')
        .insert({
          user_id: userId,
          nome_template: newTemplateName,
          titulo_template: newTemplateTitulo,
          bloquear_campos_obrigatorios: templateToDuplicate.bloquear_campos_obrigatorios,
          ocultar_valores_intermediarios: templateToDuplicate.ocultar_valores_intermediarios,
          texto_whatsapp: templateToDuplicate.texto_whatsapp,
          sistema_geografico_ativo: templateToDuplicate.sistema_geografico_ativo,
          tema: (templateToDuplicate as any).tema,
          texto_botao_envio: (templateToDuplicate as any).texto_botao_envio,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // 2. Buscar todos os produtos do template original
      const { data: produtos, error: produtosError } = await supabase
        .from('produtos')
        .select('*')
        .eq('template_id', templateToDuplicate.id);

      if (produtosError) throw produtosError;

      // 3. Duplicar todos os produtos para o novo template
      if (produtos && produtos.length > 0) {
        const produtosDuplicados = produtos.map((produto) => ({
          template_id: newTemplate.id,
          nome: produto.nome,
          resumo: produto.resumo,
          valor: produto.valor,
          unidade: produto.unidade,
          imagem_url: produto.imagem_url,
          obrigatorio: produto.obrigatorio,
          ordem: produto.ordem,
          mostrar_imagem: produto.mostrar_imagem,
        }));

        const { error: insertProdutosError } = await supabase
          .from('produtos')
          .insert(produtosDuplicados);

        if (insertProdutosError) throw insertProdutosError;
      }

      alert(`✅ Template duplicado com sucesso! ${produtos?.length || 0} produtos copiados.`);
      setShowDuplicateModal(false);
      setTemplateToDuplicate(null);
      setNewTemplateName('');
      setNewTemplateTitulo('');
      loadTemplates();
    } catch (error) {
      console.error('Erro ao duplicar template:', error);
      alert('❌ Erro ao duplicar template. Tente novamente.');
    } finally {
      setDuplicating(false);
    }
  };

  const getTemplateUrl = (template: Template) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/orcamento/${template.uuid}`;
  };

  const copyTemplateUrl = (template: Template) => {
    const url = getTemplateUrl(template);
    navigator.clipboard.writeText(url);
    alert('✅ Link copiado para a área de transferência!');
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = templates.findIndex((t) => t.id === active.id);
    const newIndex = templates.findIndex((t) => t.id === over.id);

    const reorderedTemplates = arrayMove(templates, oldIndex, newIndex);
    setTemplates(reorderedTemplates);

    setSaving(true);
    try {
      const updates = reorderedTemplates.map((template, index) => ({
        id: template.id,
        ordem_exibicao: index,
      }));

      for (const update of updates) {
        await supabase
          .from('templates')
          .update({ ordem_exibicao: update.ordem_exibicao })
          .eq('id', update.id);
      }
    } catch (error) {
      console.error('Erro ao salvar ordenação:', error);
      alert('❌ Erro ao salvar ordenação');
      loadTemplates();
    } finally {
      setSaving(false);
    }
  };

  const handleEditNameClick = (template: Template) => {
    setTemplateToEdit(template);
    setEditTemplateName(template.nome_template);
    setEditTemplateTitulo(template.titulo_template || '');
    setShowEditNameModal(true);
  };

  const handleSaveEditName = async () => {
    if (!templateToEdit || !editTemplateName.trim()) {
      alert('❌ Nome do template é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('templates')
        .update({
          nome_template: editTemplateName,
          titulo_template: editTemplateTitulo,
        })
        .eq('id', templateToEdit.id);

      if (error) throw error;

      alert('✅ Nome do template atualizado com sucesso!');
      setShowEditNameModal(false);
      setTemplateToEdit(null);
      setEditTemplateName('');
      setEditTemplateTitulo('');
      loadTemplates();
    } catch (error) {
      console.error('Erro ao atualizar nome:', error);
      alert('❌ Erro ao atualizar nome do template');
    } finally {
      setSaving(false);
    }
  };

  const getLimitProgressColor = () => {
    const percentage = (planLimits.templatesUsed / planLimits.templatesLimit) * 100;
    if (percentage >= 90) return 'bg-red-600';
    if (percentage >= 70) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  if (loading || planLimits.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Contador de Limites */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Meus Templates</h2>
          <p className="text-gray-600">Gerencie seus templates de orçamento</p>
        </div>
        <button
          onClick={handleNewTemplateClick}
          disabled={!planLimits.canCreateTemplate}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            planLimits.canCreateTemplate
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          title={
            !planLimits.canCreateTemplate
              ? 'Limite de templates atingido. Faça upgrade para criar mais!'
              : 'Criar novo template'
          }
        >
          <Plus className="w-5 h-5" />
          Novo Template
        </button>
      </div>

      {/* Card de Estatísticas e Limites */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Templates: {planLimits.templatesUsed} de {planLimits.templatesLimit}
              </h3>
              {!planLimits.isPremium && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                  Plano Gratuito
                </span>
              )}
              {planLimits.isPremium && !planLimits.isPrivileged && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  Premium
                </span>
              )}
              {planLimits.isPrivileged && (
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  Conta Especial
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {planLimits.isPremium 
                ? 'Você pode criar até 10 templates no plano premium'
                : 'Faça upgrade para criar até 10 templates'}
            </p>
          </div>
          {!planLimits.isPremium && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium text-sm"
            >
              <Crown className="w-4 h-4" />
              Fazer Upgrade
            </button>
          )}
        </div>

        {/* Barra de Progresso */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getLimitProgressColor()}`}
            style={{
              width: `${Math.min((planLimits.templatesUsed / planLimits.templatesLimit) * 100, 100)}%`,
            }}
          />
        </div>

        {/* Aviso de Limite Próximo */}
        {!planLimits.isPremium && planLimits.templatesUsed >= planLimits.templatesLimit && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">
                Limite de templates atingido!
              </p>
              <p className="text-sm text-red-700 mt-1">
                Você atingiu o limite de {planLimits.templatesLimit} template no plano gratuito. 
                Faça upgrade para criar até 10 templates.
              </p>
            </div>
          </div>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhum template criado ainda
          </h3>
          <p className="text-gray-600 mb-6">
            Crie seu primeiro template para começar a gerar orçamentos
          </p>
          <button
            onClick={handleNewTemplateClick}
            disabled={!planLimits.canCreateTemplate}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              planLimits.canCreateTemplate
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Criar Primeiro Template
          </button>
        </div>
      ) : (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Dica:</strong> Arraste os cards para reorganizar. A ordem aqui será a mesma do seu perfil público em priceus.com.br/usuario
              {saving && <span className="ml-2 text-blue-600">Salvando...</span>}
            </p>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={templates.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <SortableTemplateCard
                    key={template.id}
                    template={template}
                    onEdit={() => onEditTemplate?.(template.id)}
                    onEditName={() => handleEditNameClick(template)}
                    onCopyUrl={() => copyTemplateUrl(template)}
                    onViewTemplate={() => window.open(getTemplateUrl(template), '_blank')}
                    onDuplicate={() => handleDuplicateClick(template)}
                    onDelete={() => handleDeleteTemplate(template.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      {/* Modal de Criar Template */}
      {showNewTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Criar Novo Template</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Template *
                </label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Ex: Casamento Premium"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título (Opcional)
                </label>
                <input
                  type="text"
                  value={newTemplateTitulo}
                  onChange={(e) => setNewTemplateTitulo(e.target.value)}
                  placeholder="Ex: Pacote Completo de Casamento"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Será exibido no topo do orçamento para o cliente
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewTemplateModal(false);
                  setNewTemplateName('');
                  setNewTemplateTitulo('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTemplate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Criar Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Duplicar Template */}
      {showDuplicateModal && templateToDuplicate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Duplicar Template</h3>
            <p className="text-sm text-gray-600 mb-4">
              Duplicando: <span className="font-semibold">{templateToDuplicate.nome_template}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Novo Template *
                </label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Ex: Casamento Premium v2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título (Opcional)
                </label>
                <input
                  type="text"
                  value={newTemplateTitulo}
                  onChange={(e) => setNewTemplateTitulo(e.target.value)}
                  placeholder="Ex: Pacote Completo de Casamento"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-xs text-purple-800">
                  <strong>Tudo será copiado:</strong> produtos, configurações, valores e imagens!
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDuplicateModal(false);
                  setTemplateToDuplicate(null);
                  setNewTemplateName('');
                  setNewTemplateTitulo('');
                }}
                disabled={duplicating}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDuplicate}
                disabled={duplicating || !newTemplateName.trim()}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {duplicating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Duplicando...
                  </>
                ) : (
                  'Duplicar Template'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Nome */}
      {showEditNameModal && templateToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Editar Nome do Template</h3>
              <button
                onClick={() => {
                  setShowEditNameModal(false);
                  setTemplateToEdit(null);
                  setEditTemplateName('');
                  setEditTemplateTitulo('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Template *
                </label>
                <input
                  type="text"
                  value={editTemplateName}
                  onChange={(e) => setEditTemplateName(e.target.value)}
                  placeholder="Ex: Casamento Premium"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título (Opcional)
                </label>
                <input
                  type="text"
                  value={editTemplateTitulo}
                  onChange={(e) => setEditTemplateTitulo(e.target.value)}
                  placeholder="Ex: Pacote Completo de Casamento"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Será exibido no topo do orçamento para o cliente
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditNameModal(false);
                  setTemplateToEdit(null);
                  setEditTemplateName('');
                  setEditTemplateTitulo('');
                }}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditName}
                disabled={saving || !editTemplateName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Upgrade */}
      {showUpgradeModal && (
        <UpgradeLimitModal
          type="templates"
          currentLimit={planLimits.templatesLimit}
          premiumLimit={10}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
}
