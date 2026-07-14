import { useState, forwardRef } from 'react';
import { supabase } from '../lib/supabase';
import { X, Copy, Check } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Importar o CSS do Quill

interface ContractTemplate {
  id?: string;
  user_id?: string;
  name: string;
  content_text: string;
  created_at?: string;
  updated_at?: string;
}

interface ContractTemplateEditorProps {
  userId: string;
  template?: ContractTemplate;
  onSave: () => void;
  onCancel: () => void;
}

const PLACEHOLDERS = {
  'DO USUÁRIO (preenchido automaticamente)': [
    { key: '{{NOME_USUARIO}}', label: 'Nome do Usuário' },
    { key: '{{CPF_CNPJ_USUARIO}}', label: 'CPF/CNPJ do Usuário' },
    { key: '{{ENDERECO_USUARIO}}', label: 'Endereço do Usuário' },
    { key: '{{TELEFONE_USUARIO}}', label: 'Telefone do Usuário' },
    { key: '{{EMAIL_USUARIO}}', label: 'Email do Usuário' },
    { key: '{{PIX_USUARIO}}', label: 'Chave PIX do Usuário' },
    { key: '{{BANCO_USUARIO}}', label: 'Banco do Usuário' },
    { key: '{{AGENCIA_USUARIO}}', label: 'Agência do Usuário' },
    { key: '{{CONTA_USUARIO}}', label: 'Conta do Usuário' },
    { key: '{{PIX}}', label: 'Dados Bancários e PIX' },
  ],
  'DO LEAD (importado automaticamente)': [
    { key: '{{NOME_CLIENTE}}', label: 'Nome do Cliente' },
    { key: '{{EMAIL_CLIENTE}}', label: 'Email do Cliente' },
    { key: '{{TELEFONE_CLIENTE}}', label: 'Telefone do Cliente' },
    { key: '{{DATA_EVENTO}}', label: 'Data do Evento' },
    { key: '{{CIDADE_EVENTO}}', label: 'Cidade do Evento' },
  ],
  'DO PACOTE (calculado automaticamente)': [
    { key: '{{PRODUTOS_LISTA}}', label: 'Lista de Produtos (Plural)' },
    { key: '{{PRODUTO_LISTA}}', label: 'Lista de Produtos (Singular)' },
    { key: '{{SERVICOS_LISTA}}', label: 'Lista de Serviços' },
    { key: '{{SUBTOTAL}}', label: 'Subtotal' },
    { key: '{{DESCONTO_CUPOM}}', label: 'Desconto (Cupom)' },
    { key: '{{ACRESCIMO_PAGAMENTO}}', label: 'Acréscimo (Pagamento)' },
    { key: '{{AJUSTE_SAZONAL}}', label: 'Ajuste Sazonal' },
    { key: '{{AJUSTE_GEOGRAFICO}}', label: 'Ajuste Geográfico' },
    { key: '{{VALOR_TOTAL}}', label: 'Valor Total' },
    { key: '{{FORMA_PAGAMENTO}}', label: 'Forma de Pagamento' },
  ],
  'DO CLIENTE (preenchido na assinatura)': [
    { key: '{{NOME_COMPLETO_CLIENTE}}', label: 'Nome Completo' },
    { key: '{{CPF_CLIENTE}}', label: 'CPF' },
    { key: '{{RG_CLIENTE}}', label: 'RG' },
    { key: '{{ENDERECO_COMPLETO_CLIENTE}}', label: 'Endereço Completo' },
    { key: '{{CEP_CLIENTE}}', label: 'CEP' },
    { key: '{{LOCAL_EVENTO}}', label: 'Local do Evento' },
    { key: '{{ENDERECO_EVENTO}}', label: 'Endereço do Evento' },
    { key: '{{HORARIO_INICIO}}', label: 'Horário de Início' },
    { key: '{{OBSERVACOES_CLIENTE}}', label: 'Observações' },
  ],
};

// Wrapper para o ReactQuill para resolver o aviso de findDOMNode
const QuillWrapper = forwardRef<ReactQuill, React.ComponentProps<typeof ReactQuill>>((props, ref) => {
  return (
    <div className="quill-container">
      <ReactQuill {...props} ref={ref} />
    </div>
  );
});

export function ContractTemplateEditor({ userId, template, onSave, onCancel }: ContractTemplateEditorProps) {
  const [name, setName] = useState(template?.name || '');
  const [content, setContent] = useState(template?.content_text || '');
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyPlaceholder = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) {
      alert('❌ Nome e conteúdo são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const templateData = {
        user_id: userId,
        name: name.trim(),
        content_text: content, // Salvar o conteúdo HTML
      };

      if (template?.id) {
        const { error } = await supabase
          .from('contract_templates')
          .update(templateData)
          .eq('id', template.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contract_templates')
          .insert(templateData);

        if (error) throw error;
      }

      onSave();
    } catch (error) {
      console.error('Erro ao salvar contrato:', error);
      alert('Erro ao salvar contrato');
    } finally {
      setSaving(false);
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent', 'align',
    'link', 'image'
  ];

  return (
    <div className="contract-template-editor-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="contract-template-editor-modal bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="contract-template-editor-header flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {template ? 'Editar Contrato' : 'Novo Contrato'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="contract-template-editor-body flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Contrato
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Contrato de Serviços Fotográficos - Casamento"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conteúdo do Contrato
                </label>
                <QuillWrapper
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  modules={modules}
                  formats={formats}
                  placeholder="Cole ou digite o texto do contrato aqui. Use os placeholders da direita para inserir dados dinâmicos."
                  className="h-[500px] mb-12" // Ajuste a altura e adicione margem inferior para o toolbar
                />
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="contract-template-placeholders sticky top-0 bg-gray-50 rounded-lg p-4 max-h-[600px] overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  Placeholders Disponíveis
                </h3>
                <p className="text-xs text-gray-600 mb-4">
                  Clique no ícone para copiar e colar no texto
                </p>

                {Object.entries(PLACEHOLDERS).map(([section, items]) => (
                  <div key={section} className="mb-6">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">
                      {section}
                    </h4>
                    <div className="space-y-1">
                      {items.map((item) => (
                        <button
                          key={item.key}
                          onClick={() => copyPlaceholder(item.key)}
                          className="contract-placeholder-btn w-full flex items-center justify-between px-3 py-2 text-xs bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors group"
                        >
                          <span className="text-left flex-1 text-gray-700 group-hover:text-blue-700">
                            {item.label}
                          </span>
                          {copiedKey === item.key ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="contract-template-editor-footer flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onCancel}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !content.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar Contrato'}
          </button>
        </div>
      </div>
    </div>
  );
}
