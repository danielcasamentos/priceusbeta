import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function CookieConsent() {
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Verifica se já existe consentimento armazenado
    const consent = localStorage.getItem('priceus_cookie_consent');
    if (!consent) {
      // Aguarda 1 segundo antes de exibir o modal
      setTimeout(() => setShowModal(true), 1000);
    }
  }, []);

  const saveConsent = async (analytics: boolean, marketing: boolean) => {
    const sessionId = getSessionId();
    const consentData = {
      session_id: sessionId,
      ip_address: null, // Será preenchido pelo backend se necessário
      user_agent: navigator.userAgent,
      consent_analytics: analytics,
      consent_marketing: marketing,
      consent_necessary: true,
    };

    try {
      await supabase.from('cookies_consent').insert(consentData);

      // Salva no localStorage
      localStorage.setItem('priceus_cookie_consent', JSON.stringify({
        analytics,
        marketing,
        date: new Date().toISOString(),
      }));

      setShowModal(false);
    } catch (error) {
      console.error('Erro ao salvar consentimento:', error);
      // Salva localmente mesmo se falhar no servidor
      localStorage.setItem('priceus_cookie_consent', JSON.stringify({
        analytics,
        marketing,
        date: new Date().toISOString(),
      }));
      setShowModal(false);
    }
  };

  const acceptAll = () => saveConsent(true, true);
  const acceptNecessary = () => saveConsent(false, false);

  const getSessionId = () => {
    let sessionId = sessionStorage.getItem('priceus_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('priceus_session_id', sessionId);
    }
    return sessionId;
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🍪 Política de Cookies e Privacidade
          </h2>

          <div className="prose prose-sm text-gray-700 mb-6">
            <p className="mb-4">
              Valorizamos sua privacidade. Este site utiliza cookies para melhorar sua experiência,
              analisar o uso do site e auxiliar em nossos esforços de marketing.
            </p>

            {!showDetails ? (
              <button
                onClick={() => setShowDetails(true)}
                className="text-blue-600 hover:text-blue-700 font-medium underline"
              >
                Ver detalhes sobre os cookies
              </button>
            ) : (
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <h3 className="font-semibold text-gray-900">🔒 Cookies Necessários (Obrigatórios)</h3>
                  <p className="text-sm text-gray-600">
                    Essenciais para o funcionamento do site, incluindo autenticação, segurança e
                    preenchimento de formulários. Estes cookies não podem ser desabilitados.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">📊 Cookies Analíticos (Opcionais)</h3>
                  <p className="text-sm text-gray-600">
                    Nos ajudam a entender como os visitantes interagem com o site, coletando
                    informações de forma anônima sobre páginas visitadas e tempo de navegação.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">🎯 Cookies de Marketing (Opcionais)</h3>
                  <p className="text-sm text-gray-600">
                    Utilizados para exibir anúncios relevantes e rastrear a eficácia de campanhas
                    publicitárias.
                  </p>
                </div>

                <button
                  onClick={() => setShowDetails(false)}
                  className="text-blue-600 hover:text-blue-700 font-medium underline text-sm"
                >
                  Ocultar detalhes
                </button>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">📋 Conformidade com LGPD</h3>
              <p className="text-sm text-gray-700 mb-3">
                Ao preencher formulários neste site, você <strong>consente expressamente</strong> com:
              </p>
              <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
                <li>Coleta e processamento de seus dados pessoais (nome, e-mail, telefone)</li>
                <li>Uso dos dados para fins de orçamento, comunicação e atendimento</li>
                <li>Armazenamento seguro das informações em nossos servidores</li>
                <li>Contato por WhatsApp, e-mail ou telefone sobre sua solicitação</li>
              </ul>
              <p className="text-sm text-gray-700 mt-3">
                <strong>Seus direitos:</strong> Você pode solicitar acesso, correção, exclusão ou
                portabilidade de seus dados a qualquer momento. Nunca compartilharemos suas
                informações com terceiros sem sua autorização expressa.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={acceptNecessary}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Apenas Necessários
            </button>
            <button
              onClick={acceptAll}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Aceitar Todos
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Ao continuar navegando, você concorda com nossa política de cookies.
          </p>
        </div>
      </div>
    </div>
  );
}
