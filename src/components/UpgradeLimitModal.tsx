import { Crown, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradeLimitModalProps {
  type: 'templates' | 'leads' | 'products' | 'contract-templates' | 'contracts-signed';
  currentLimit: number | string;
  premiumLimit: number | string;
  onClose: () => void;
}

export function UpgradeLimitModal({ type, currentLimit, premiumLimit, onClose }: UpgradeLimitModalProps) {
  const navigate = useNavigate();

  const titles = {
    templates: 'Limite de Templates Atingido',
    leads: 'Limite de Leads Atingido',
    products: 'Limite de Produtos Atingido',
    'contract-templates': 'Limite de Contratos Atingido',
    'contracts-signed': 'Limite de Contratos Enviados Atingido',
  };

  const descriptions = {
    templates: 'Você atingiu o limite de templates do plano gratuito.',
    leads: 'Você atingiu o limite de leads salvos do plano gratuito. Novos leads substituirão os mais antigos.',
    products: 'Você atingiu o limite de produtos por template do plano gratuito.',
    'contract-templates': 'Você atingiu o limite de 3 contratos cadastrados do plano gratuito.',
    'contracts-signed': 'Você atingiu o limite de 10 contratos enviados do plano gratuito.',
  };

  const benefits = [
    'Templates ilimitados (até 10)',
    'Leads salvos ilimitados',
    'Produtos ilimitados por template',
    'Contratos cadastrados ilimitados',
    'Contratos enviados ilimitados',
    'Gestão completa de leads com exportação',
    'Suporte prioritário',
  ];

  const handleUpgrade = () => {
    onClose();
    navigate('/pricing');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-8 h-8" />
            <h2 className="text-2xl font-bold">{titles[type]}</h2>
          </div>
          <p className="text-blue-100 text-sm">{descriptions[type]}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Comparação de Limites */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-gray-500 text-sm mb-1">Plano Gratuito</div>
                <div className="text-2xl font-bold text-gray-900">{currentLimit}</div>
              </div>
              <div className="border-l border-gray-300">
                <div className="text-blue-600 text-sm mb-1 font-medium">Plano Premium</div>
                <div className="text-2xl font-bold text-blue-600">{premiumLimit}</div>
              </div>
            </div>
          </div>

          {/* Benefícios */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              Vantagens do Plano Premium:
            </h3>
            <ul className="space-y-2">
              {benefits.slice(0, 5).map((benefit, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Agora Não
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4" />
              Fazer Upgrade
            </button>
          </div>

          {/* Preço */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Apenas <span className="font-bold text-blue-600">R$ 97,00/mês</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
