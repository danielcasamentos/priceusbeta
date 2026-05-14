import { useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  BookOpen,
  ShoppingCart,
  CreditCard,
  MessageSquare,
  FileText,
  MapPin,
  Ticket
} from 'lucide-react';
import { YouTubeEmbed } from './YouTubeEmbed';
import { getVideoById } from '../config/videoTutorials';

interface TutorialStep {
  id: number;
  tab: string;
  title: string;
  description: string;
  tips: string[];
  warnings?: string[];
  videoId?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 0,
    tab: 'intro',
    title: 'Bem-vindo ao Criador de Orçamentos',
    description: 'Este tutorial vai guiá-lo através de todas as etapas necessárias para criar um orçamento profissional e personalizado. Você aprenderá a configurar produtos, formas de pagamento, campos personalizados e muito mais.',
    tips: [
      'O processo é dividido em 6 etapas principais',
      'Você pode navegar entre as etapas usando as setas ou clicando nas abas',
      'Todas as alterações são salvas automaticamente',
      'Você pode retornar a qualquer etapa para fazer ajustes'
    ],
    videoId: 'intro-priceus'
  },
  {
    id: 1,
    tab: 'produtos',
    title: 'Passo 1: Produtos e Serviços',
    description: 'Adicione todos os produtos ou serviços que você oferece. Cada item pode ter nome, descrição, preço, unidade de medida e imagem.',
    tips: [
      'Use nomes claros e descritivos para seus produtos',
      'Adicione resumos explicativos para ajudar seus clientes',
      'Defina se o produto é obrigatório ou opcional',
      'Você pode adicionar imagens para tornar o orçamento mais atrativo',
      'Arraste produtos para reordená-los'
    ],
    warnings: [
      'Certifique-se de ter pelo menos 1 produto antes de continuar',
      'Produtos obrigatórios sempre aparecerão no orçamento'
    ],
    videoId: 'produtos-servicos'
  },
  {
    id: 2,
    tab: 'pagamentos',
    title: 'Passo 2: Formas de Pagamento',
    description: 'Configure as opções de pagamento disponíveis para seus clientes. Você pode definir entrada, parcelamento e descontos/acréscimos.',
    tips: [
      'Entrada Percentual: calculada automaticamente sobre o valor total',
      'Entrada Fixa: valor fixo independente do total',
      'Use valores negativos para descontos (ex: -5 para 5% off)',
      'Use valores positivos para acréscimos (ex: 10 para 10% de taxa)',
      'Configure até 24 parcelas para cada forma de pagamento'
    ],
    warnings: [
      'Configure pelo menos 1 forma de pagamento',
      'Entrada de 100% representa pagamento à vista'
    ],
    videoId: 'formas-pagamento'
  },
  {
    id: 3,
    tab: 'cupons',
    title: 'Passo 3: Cupons de Desconto (Opcional)',
    description: 'Crie cupons promocionais para oferecer descontos especiais aos seus clientes. Você pode definir valores fixos ou percentuais, com ou sem prazo de validade.',
    tips: [
      'Códigos devem ser únicos e fáceis de lembrar',
      'Descontos percentuais são calculados sobre o valor total',
      'Descontos fixos reduzem um valor específico do total',
      'Configure datas de validade para promoções temporárias',
      'Desative cupons que não estão mais em uso'
    ],
    warnings: [
      'Cupons são opcionais - você pode pular esta etapa',
      'Cupons expirados não podem ser aplicados'
    ],
    videoId: 'cupons-desconto'
  },
  {
    id: 4,
    tab: 'campos',
    title: 'Passo 4: Campos Personalizados (Opcional)',
    description: 'Adicione campos extras para coletar informações específicas dos seus clientes. Estes campos aparecerão no formulário de orçamento.',
    tips: [
      'Campos de texto: para informações abertas',
      'Campos numéricos: para quantidades ou medidas',
      'E-mail e telefone: validação automática',
      'Datas: seletor de calendário integrado',
      'Marque como obrigatório se a informação for essencial',
      'Variáveis dinâmicas serão criadas automaticamente para uso no WhatsApp'
    ],
    warnings: [
      'Campos personalizados são opcionais',
      'Variáveis geradas: {{campoInserido01}}, {{campoInserido02}}, etc.'
    ],
    videoId: 'campos-personalizados'
  },
  {
    id: 5,
    tab: 'whatsapp',
    title: 'Passo 5: Mensagem WhatsApp',
    description: 'Personalize a mensagem que será enviada para seu WhatsApp quando um cliente solicitar um orçamento.',
    tips: [
      'Use variáveis dinâmicas para inserir dados do cliente',
      'Variáveis disponíveis: {{nome}}, {{email}}, {{telefone}}, {{endereco}}, {{cidade}}',
      'Campos personalizados geram variáveis automaticamente',
      'Mantenha a mensagem profissional e clara',
      'Inclua informações de contato se necessário'
    ],
    warnings: [
      'Teste a mensagem antes de finalizar',
      'Variáveis entre {{chaves}} serão substituídas automaticamente'
    ],
    videoId: 'mensagem-whatsapp'
  },
  {
    id: 6,
    tab: 'precos',
    title: 'Passo 6: Preços Sazonais e Geográficos (Opcional)',
    description: 'Configure variações de preço baseadas em datas específicas ou localização geográfica dos clientes.',
    tips: [
      'Preços Sazonais: para períodos de alta/baixa temporada',
      'Preços Geográficos: para diferentes cidades ou regiões',
      'Defina percentual de ajuste (positivo para aumento, negativo para desconto)',
      'Prioridade: preços específicos sobrescrevem preços gerais'
    ],
    warnings: [
      'Precificação avançada é opcional',
      'Sem configuração, os preços padrão serão usados'
    ],
    videoId: 'precos-sazonais'
  },
  {
    id: 7,
    tab: 'config',
    title: 'Passo 7: Configurações Finais',
    description: 'Revise todas as configurações e ative seu template de orçamento.',
    tips: [
      'Verifique se todos os produtos estão corretos',
      'Confirme as formas de pagamento',
      'Teste a mensagem do WhatsApp',
      'Ative o template quando estiver pronto',
      'Você pode editar a qualquer momento'
    ],
    warnings: [
      'Template precisa estar ativo para receber orçamentos',
      'Desative temporariamente se não estiver disponível'
    ],
    videoId: 'configuracoes-finais'
  },
  {
    id: 8,
    tab: 'final',
    title: 'Parabéns! Você completou a configuração',
    description: 'Seu template de orçamento está pronto para uso. Agora você pode compartilhar o link com seus clientes e começar a receber solicitações de orçamento.',
    tips: [
      'Copie o link do seu orçamento para compartilhar',
      'Monitore os leads recebidos no painel',
      'Atualize preços e produtos quando necessário',
      'Use cupons para promoções especiais',
      'Analise os dados para melhorar suas ofertas'
    ]
  }
];

interface TutorialGuideProps {
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
  currentTab?: string;
}

export function TutorialGuide({ onClose, onNavigateToTab, currentTab: _currentTab }: TutorialGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const step = TUTORIAL_STEPS[currentStep];
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);

      // Navigate to corresponding tab if available
      const nextStepData = TUTORIAL_STEPS[nextStep];
      if (nextStepData.tab !== 'intro' && nextStepData.tab !== 'final' && onNavigateToTab) {
        onNavigateToTab(nextStepData.tab);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);

      // Navigate to corresponding tab if available
      const prevStepData = TUTORIAL_STEPS[prevStep];
      if (prevStepData.tab !== 'intro' && prevStepData.tab !== 'final' && onNavigateToTab) {
        onNavigateToTab(prevStepData.tab);
      }
    }
  };

  const handleJumpToStep = (stepId: number) => {
    setCurrentStep(stepId);
    const stepData = TUTORIAL_STEPS[stepId];
    if (stepData.tab !== 'intro' && stepData.tab !== 'final' && onNavigateToTab) {
      onNavigateToTab(stepData.tab);
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'produtos': return <ShoppingCart className="w-4 h-4" />;
      case 'pagamentos': return <CreditCard className="w-4 h-4" />;
      case 'cupons': return <Ticket className="w-4 h-4" />;
      case 'campos': return <FileText className="w-4 h-4" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4" />;
      case 'precos': return <MapPin className="w-4 h-4" />;
      case 'config': return <CheckCircle className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Guia de Configuração</h2>
              <p className="text-sm text-gray-500">
                Passo {currentStep + 1} de {TUTORIAL_STEPS.length}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step Title */}
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
              {getTabIcon(step.tab)}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-600 leading-relaxed">{step.description}</p>
            </div>
          </div>

          {/* Video Tutorial */}
          {step.videoId && (() => {
            const video = getVideoById(step.videoId);
            return video ? (
              <YouTubeEmbed
                videoId={video.youtubeId}
                title={video.title}
                showTitle={false}
              />
            ) : null;
          })()}

          {/* Tips */}
          {step.tips.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">Dicas Importantes:</h4>
              </div>
              <ul className="space-y-2">
                {step.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-blue-800">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {step.warnings && step.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <h4 className="font-semibold text-yellow-900">Atenção:</h4>
              </div>
              <ul className="space-y-2">
                {step.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-yellow-800">
                    <span className="text-yellow-600 font-bold mt-0.5">⚠</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Step Navigator */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 text-sm">Navegação Rápida:</h4>
            <div className="flex flex-wrap gap-2">
              {TUTORIAL_STEPS.map((s, index) => (
                <button
                  key={s.id}
                  onClick={() => handleJumpToStep(index)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${currentStep === index
                      ? 'bg-blue-600 text-white'
                      : completedSteps.has(index)
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                    }
                  `}
                  title={s.title}
                >
                  {index === 0 ? 'Intro' : index === TUTORIAL_STEPS.length - 1 ? 'Final' : `${index}`}
                  {completedSteps.has(index) && index !== currentStep && (
                    <CheckCircle className="w-3 h-3 inline ml-1" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          <div className="text-sm text-gray-500">
            {completedSteps.size} de {TUTORIAL_STEPS.length} etapas visualizadas
          </div>

          {currentStep < TUTORIAL_STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Concluir Tutorial
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
