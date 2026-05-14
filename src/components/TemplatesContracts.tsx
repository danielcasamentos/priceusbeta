import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ContractTemplateEditor } from './ContractTemplateEditor';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { UpgradeLimitModal } from './UpgradeLimitModal';
import { FileText, Plus, Edit2, Trash2, Copy } from 'lucide-react';

interface ContractTemplate {
  id: string;
  user_id: string;
  name: string;
  content_text: string;
  created_at: string;
  updated_at: string;
}

interface TemplatesContractsProps {
  userId: string;
}

export function TemplatesContracts({ userId }: TemplatesContractsProps) {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | undefined>();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const planLimits = usePlanLimits();

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [userId]);

  const handleNew = () => {
    setEditingTemplate(undefined);
    setShowEditor(true);
  };

  const handleEdit = (template: ContractTemplate) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleDuplicate = async (template: ContractTemplate) => {
    try {
      const { error } = await supabase
        .from('contract_templates')
        .insert({
          user_id: userId,
          name: `${template.name} (Cópia)`,
          content_text: template.content_text,
        });

      if (error) throw error;
      await loadTemplates();
    } catch (error) {
      console.error('Erro ao duplicar template:', error);
      alert('Erro ao duplicar template');
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;

    try {
      const { error } = await supabase
        .from('contract_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      await loadTemplates();
    } catch (error) {
      console.error('Erro ao excluir template:', error);
      alert('Erro ao excluir template');
    }
  };

  const handleSave = async () => {
    setShowEditor(false);
    setEditingTemplate(undefined);
    await loadTemplates();
  };

  const handleCancel = () => {
    setShowEditor(false);
    setEditingTemplate(undefined);
  };

  if (showEditor) {
    return (
      <ContractTemplateEditor
        userId={userId}
        template={editingTemplate}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="contract-templates-container">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Templates de Contratos</h2>
          <p className="text-gray-600">
            Crie e gerencie seus modelos de contrato digital
          </p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Novo Template
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Carregando templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum template criado
          </h3>
          <p className="text-gray-600 mb-6">
            Crie seu primeiro template de contrato para começar
          </p>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Criar Primeiro Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="contract-template-card bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Criado em {new Date(template.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>

              <div className="text-sm text-gray-600 mb-4 line-clamp-3">
                {template.content_text.substring(0, 150)}...
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(template)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDuplicate(template)}
                  className="px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Duplicar"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Upgrade */}
      {showUpgradeModal && (
        <UpgradeLimitModal
          type="templates"
          currentLimit={planLimits.contractTemplatesLimit}
          premiumLimit="Ilimitado"
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
}
