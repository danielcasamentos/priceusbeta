import { useState } from 'react';
import { MessageSquare, Eye, RotateCcw, Copy, Check, Info } from 'lucide-react';
import { useDynamicFields, STANDARD_VARIABLES } from '../hooks/useDynamicFields';

/**
 * Variáveis disponíveis para o template WhatsApp
 */
export const WHATSAPP_VARIABLES = {
  // Dados do Cliente
  CLIENT_NAME: 'Nome do cliente',
  CLIENT_EMAIL: 'E-mail do cliente',
  CLIENT_PHONE: 'Telefone/WhatsApp do cliente',

  // Evento
  EVENT_DATE: 'Data',
  EVENT_CITY: 'Cidade',

  // Serviços e Valores
  SERVICES_LIST: 'Lista de serviços selecionados',
  SUBTOTAL_VALUE: 'Subtotal (antes de ajustes)',
  TOTAL_VALUE: 'Valor total final',

  // Forma de Pagamento
  PAYMENT_METHOD: 'Forma de pagamento escolhida',
  PAYMENT_ADJUSTMENT: 'Desconto/Acréscimo da forma de pagamento',
  DOWN_PAYMENT: 'Valor de entrada',
  INSTALLMENTS: 'Informações de parcelamento',
  INSTALLMENTS_COUNT: 'Número de parcelas',
  LAST_INSTALLMENT_DATE: 'Data da última parcela',

  // Cupom
  COUPON_CODE: 'Código do cupom aplicado',
  COUPON_DISCOUNT: 'Valor do desconto do cupom',

  // Dados do Fotógrafo
  PHOTOGRAPHER_NAME: 'Nome do fotógrafo',
  PHOTOGRAPHER_EMAIL: 'E-mail do fotógrafo',
  PHOTOGRAPHER_PHONE: 'WhatsApp do fotógrafo',
} as const;

/**
 * Template padrão do WhatsApp
 */
export const DEFAULT_WHATSAPP_TEMPLATE = `Olá! Gostaria de solicitar um orçamento:

📸 *SERVIÇOS SELECIONADOS:*
{{SERVICES_LIST}}

💰 *VALORES:*
Subtotal: {{SUBTOTAL_VALUE}}
{{PAYMENT_ADJUSTMENT}}
{{COUPON_CODE}} {{COUPON_DISCOUNT}}
*Total: {{TOTAL_VALUE}}*

💳 *FORMA DE PAGAMENTO:*
{{PAYMENT_METHOD}}
💵 Entrada: {{DOWN_PAYMENT}}
📅 Parcelamento: {{INSTALLMENTS}}
🗓️ Última Parcela: {{LAST_INSTALLMENT_DATE}}

📍 *LOCALIZAÇÃO E DATA:*
Cidade: {{EVENT_CITY}}
Data: {{EVENT_DATE}}

👤 *MEUS DADOS:*
Nome: {{CLIENT_NAME}}
Email: {{CLIENT_EMAIL}}
WhatsApp: {{CLIENT_PHONE}}

Aguardo retorno!`;

interface CampoExtra {
  id?: string;
  label: string;
  tipo: string;
  placeholder: string;
  obrigatorio: boolean;
  ordem: number;
}

interface WhatsAppTemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  camposExtras?: CampoExtra[];
}

/**
 * Editor de Template WhatsApp com:
 * - Syntax highlighting para variáveis
 * - Preview em tempo real
 * - Validação de variáveis
 * - Reset para template padrão
 * - Cópia fácil de variáveis
 */
export function WhatsAppTemplateEditor({
  value,
  onChange,
  onSave,
  camposExtras = [],
}: WhatsAppTemplateEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  // Hook para gerenciar variáveis dinâmicas
  const { dynamicVariables } = useDynamicFields(camposExtras);

  // Dados mockados para o preview
  const mockData = {
    CLIENT_NAME: 'Maria Silva',
    CLIENT_EMAIL: 'maria.silva@email.com',
    CLIENT_PHONE: '(11) 98765-4321',
    SERVICES_LIST: '1x Ensaio Fotográfico - R$ 1.500,00\n1x Álbum Premium - R$ 800,00',
    SUBTOTAL_VALUE: 'R$ 2.300,00',
    TOTAL_VALUE: 'R$ 2.530,00',
    PAYMENT_METHOD: 'Cartão de Crédito',
    DOWN_PAYMENT: 'R$ 500,00',
    INSTALLMENTS: '4x de R$ 507,50',
    INSTALLMENTS_COUNT: '4',
    LAST_INSTALLMENT_DATE: '15/08/2025',
    PHOTOGRAPHER_NAME: 'João Fotógrafo',
    PHOTOGRAPHER_EMAIL: 'contato@joaofotografo.com',
    PHOTOGRAPHER_PHONE: '(11) 91234-5678',
  };

  /**
   * Gera preview do template com dados mockados
   */
  const generatePreview = (): string => {
    let preview = value;
    Object.entries(mockData).forEach(([key, val]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      preview = preview.replace(regex, val);
    });
    return preview;
  };

  /**
   * Valida se o template contém variáveis inválidas
   */
  const validateTemplate = (): string[] => {
    const invalidVars: string[] = [];
    const regex = /\{\{([A-Z_]+)\}\}/g;
    let match;

    while ((match = regex.exec(value)) !== null) {
      const varName = match[1];
      if (!mockData.hasOwnProperty(varName)) {
        invalidVars.push(varName);
      }
    }

    return invalidVars;
  };

  /**
   * Copia variável para área de transferência
   */


  /**
   * Reseta template para o padrão
   */
  const resetToDefault = () => {
    if (confirm('⚠️ Tem certeza que deseja resetar para o template padrão? Esta ação não pode ser desfeita.')) {
      onChange(DEFAULT_WHATSAPP_TEMPLATE);
    }
  };

  /**
   * Destaca variáveis no texto
   */


  const invalidVars = validateTemplate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-600" />
            Template de Mensagem WhatsApp
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Personalize a mensagem que será enviada para seu whatsapp
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
          >
            <Eye className="w-4 h-4" />
            {showPreview ? 'Ocultar' : 'Ver'} Preview
          </button>
          <button
            type="button"
            onClick={resetToDefault}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Resetar
          </button>
        </div>
      </div>

      {/* Alertas de validação */}
      {invalidVars.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-semibold text-red-800 mb-2">⚠️ Variáveis Inválidas Detectadas:</h4>
          <ul className="list-disc list-inside text-sm text-red-700">
            {invalidVars.map((varName) => (
              <li key={varName}>
                <code className="bg-red-100 px-1 rounded">[{varName}]</code> não é uma variável válida
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Editor de Template
            </label>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={20}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="Digite sua mensagem aqui..."
            />
            <p className="text-xs text-gray-500 mt-2">
              Use as variáveis entre colchetes, exemplo: [CLIENT_NAME]
            </p>
          </div>

          {/* Variáveis Disponíveis */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">
                📋 Variáveis Padrão (clique para copiar)
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {STANDARD_VARIABLES.map((item) => (
                  <button
                    key={item.variable}
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(item.variable);
                      setCopiedVariable(item.variable);
                      setTimeout(() => setCopiedVariable(null), 2000);
                    }}
                    className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
                  >
                    <div className="flex-1">
                      <code className="text-xs font-mono text-blue-600 font-bold">{item.variable}</code>
                      <p className="text-xs text-gray-600 mt-0.5">{item.description}</p>
                    </div>
                    {copiedVariable === item.variable ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Variáveis Dinâmicas dos Campos Extras */}
            {dynamicVariables.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    🔧 Variáveis dos Campos Personalizados
                  </h4>
                  <div className="group relative">
                    <Info className="w-4 h-4 text-blue-500 cursor-help" />
                    <div className="hidden group-hover:block absolute left-0 top-6 bg-gray-900 text-white text-xs rounded p-2 w-64 z-10">
                      Variáveis geradas automaticamente baseadas nos campos que você criou na aba "Campos Personalizados"
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {dynamicVariables.map((item) => (
                    <button
                      key={item.variable}
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(item.variable);
                        setCopiedVariable(item.variable);
                        setTimeout(() => setCopiedVariable(null), 2000);
                      }}
                      className="flex items-center justify-between px-3 py-2 bg-white border border-green-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors text-left"
                    >
                      <div className="flex-1">
                        <code className="text-xs font-mono text-green-600 font-bold">{item.variable}</code>
                        <p className="text-xs text-gray-600 mt-0.5">{item.description}</p>
                      </div>
                      {copiedVariable === item.variable ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="mt-3 bg-green-50 border border-green-200 rounded p-2">
                  <p className="text-xs text-green-800">
                    💡 <strong>Automático:</strong> Essas variáveis foram geradas automaticamente dos seus {camposExtras.length} campos personalizados.
                  </p>
                </div>
              </div>
            )}

            {/* Aviso se não há campos extras */}
            {dynamicVariables.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-xs text-blue-800">
                  💡 <strong>Dica:</strong> Adicione campos personalizados na aba "Campos Personalizados" para gerar variáveis dinâmicas automaticamente!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview da Mensagem
              </label>
              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-300 rounded-lg p-4 min-h-[500px]">
                <div className="bg-white rounded-lg shadow-lg p-4">
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">
                      J
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">João Fotógrafo</div>
                      <div className="text-xs text-gray-500">online</div>
                    </div>
                  </div>
                  <div className="bg-green-100 rounded-lg p-3 text-sm whitespace-pre-wrap">
                    {generatePreview()}
                  </div>
                  <div className="text-xs text-gray-400 mt-2 text-right">
                    Enviado • Agora
                  </div>
                </div>
              </div>
            </div>

            {/* Dicas */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2 text-sm">💡 Dicas:</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Use emojis para tornar a mensagem mais amigável</li>
                <li>• Mantenha o texto objetivo e profissional</li>
                <li>• [SELECTED_SERVICES_LIST] já vem formatado como lista</li>
                <li>• Sempre inclua seus dados de contato</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Botão Salvar */}
      {onSave && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSave}
            disabled={invalidVars.length > 0}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Check className="w-5 h-5" />
            Salvar Template WhatsApp
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Função utilitária: Processa template com dados reais
 */
export function processWhatsAppTemplate(
  template: string,
  data: Record<string, string>
): string {
  let processed = template;
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`\\[${key}\\]`, 'g');
    processed = processed.replace(regex, value || '');
  });
  return processed;
}

/**
 * Função utilitária: Gera URL do WhatsApp com mensagem
 */
export function generateWhatsAppURL(
  phoneNumber: string,
  message: string
): string {
  // Remove caracteres não numéricos
  const cleanPhone = phoneNumber.replace(/\D/g, '');

  // Codifica a mensagem para URL
  const encodedMessage = encodeURIComponent(message);

  // Retorna URL formatada
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}
