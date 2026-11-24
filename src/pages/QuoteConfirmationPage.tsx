import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Send, Copy, Check } from 'lucide-react';

export function QuoteConfirmationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const { waLink, message, profileName } = location.state || {};

  useEffect(() => {
    // Se não houver dados, redireciona para a home para evitar erros.
    if (!waLink || !message) {
      navigate('/');
    }
  }, [waLink, message, navigate]);

  const handleCopy = () => {
    navigator.clipboard.writeText(waLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!waLink || !message) {
    return null; // Evita renderização antes do redirecionamento
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Orçamento Salvo com Sucesso!</h1>
        <p className="text-gray-600 mb-6">
          Seu pedido de orçamento foi registrado. O próximo passo é enviá-lo para <strong>{profileName || 'o profissional'}</strong> via WhatsApp.
        </p>

        <div className="space-y-4">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-3 bg-green-600 text-white px-6 py-4 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors shadow-md"
          >
            <Send className="w-6 h-6" />
            Enviar via WhatsApp
          </a>

          <div className="text-sm text-gray-500">
            Se o botão acima não funcionar, copie o link abaixo e cole no seu navegador:
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={waLink}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-xs text-gray-700"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Voltar para o início
          </button>
        </div>
      </div>
    </div>
  );
}