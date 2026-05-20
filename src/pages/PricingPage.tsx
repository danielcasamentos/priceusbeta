import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { stripeProducts } from '../stripe-config'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { useTrialStatus } from '../hooks/useTrialStatus'
import { Alert } from '../components/ui/Alert'
import { AlertCircle } from 'lucide-react'
import { handleCheckout } from '../checkoutService'
import { supabase } from '../lib/supabase'

export function PricingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { subscription } = useSubscription()
  const trialStatus = useTrialStatus(user)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [contracts, setContracts] = useState<any[]>([])
  const [loadingContracts, setLoadingContracts] = useState(false)

  useEffect(() => {
    if (user && trialStatus.isExpired && trialStatus.status === 'trial') {
      const fetchContracts = async () => {
        setLoadingContracts(true)
        try {
          const { data, error } = await supabase
            .from('contracts')
            .select('id, token, created_at, lead_data_json, client_data_json, signature_base64')
            .eq('user_id', user.id)
            .eq('status', 'signed')
            .order('created_at', { ascending: false })
          
          if (!error && data) {
            setContracts(data)
          }
        } catch (err) {
          console.error('Erro ao buscar contratos:', err)
        } finally {
          setLoadingContracts(false)
        }
      }
      fetchContracts()
    }
  }, [user, trialStatus.isExpired, trialStatus.status])

  const onSubscribeClick = async (priceId: string) => {
    if (!user) {
      navigate('/login')
      return
    }
    setLoading(priceId)
    setError('')
    try {
      // Usa a função centralizada do checkoutService, que já trata erros e redirecionamento.
      await handleCheckout(priceId);
    } catch (err) {
      // O handleCheckout já mostra alerts, mas podemos logar o erro aqui também.
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro inesperado.';
      console.error('Erro capturado na PricingPage:', err);
      setError(errorMessage);
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Planos Simples e Transparentes
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Escolha o plano ideal para você e comece a criar orçamentos incríveis.
          </p>
        </div>

        {trialStatus.isExpired && trialStatus.status === 'trial' && (
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-4 shadow-sm animate-fade-in">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={24} />
              <div>
                <h3 className="font-bold text-red-900 text-lg mb-1">Seu período de teste expirou!</h3>
                <p className="text-sm text-red-700 leading-relaxed mb-3">
                  Para continuar usando o PriceUs e ter acesso ilimitado a todos os seus recursos, 
                  escolha um dos nossos planos abaixo. 
                </p>
                {trialStatus.graceDaysRemaining !== null && (
                  <p className="text-sm font-semibold text-red-800 bg-red-100/50 inline-block px-3 py-1.5 rounded-lg border border-red-200">
                    ⚠️ Atenção: Você tem mais <span className="font-extrabold text-red-900">{trialStatus.graceDaysRemaining} {trialStatus.graceDaysRemaining === 1 ? 'dia' : 'dias'}</span> de carência para assinar antes que sua conta e todos os seus dados sejam **excluídos permanentemente**.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {trialStatus.status === 'trial' && !trialStatus.isExpired && trialStatus.daysRemaining !== null && (
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  {trialStatus.daysRemaining === 1
                    ? 'Último dia do seu período de teste!'
                    : `Restam ${trialStatus.daysRemaining} dias do seu período de teste`}
                </h3>
                <p className="text-sm text-blue-700">
                  Assine agora e continue aproveitando todos os recursos sem interrupções!
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-8 max-w-md mx-auto">
            <Alert type="error" onClose={() => setError('')}>
              {error}
            </Alert>
          </div>
        )}

        {/* Seção de Resgate de Contratos para Usuários Expirados */}
        {trialStatus.isExpired && trialStatus.status === 'trial' && (
          <div className="mt-12 max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              📂 Resgate de Contratos Fechados
            </h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Durante o período de carência de 15 dias, você pode baixar a cópia em PDF de todos os contratos que fechou pela plataforma. Após este prazo, sua conta será totalmente excluída do sistema.
            </p>
            
            {loadingContracts ? (
              <div className="text-center py-8 text-gray-500 flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                Buscando contratos...
              </div>
            ) : contracts.length === 0 ? (
              <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                Nenhum contrato assinado encontrado na sua conta.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto pr-2">
                {contracts.map((contract) => {
                  const clientName = contract.client_data_json?.nome_completo || contract.lead_data_json?.nome_cliente || 'Cliente';
                  const date = new Date(contract.created_at).toLocaleDateString('pt-BR');
                  return (
                    <div key={contract.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-800">{clientName}</p>
                        <p className="text-xs text-gray-500">Fechado em: {date}</p>
                      </div>
                      <button
                        onClick={() => {
                          const url = `/contrato/${contract.token}/preview`;
                          const state = {
                            clientData: contract.client_data_json,
                            clientSignature: contract.signature_base64,
                            action: 'print',
                          };
                          const newWindow = window.open(url, '_blank');
                          if (newWindow) newWindow.history.replaceState(state, '');
                        }}
                        className="inline-flex items-center justify-center px-4 py-2 border-2 border-blue-600 rounded-lg text-sm font-bold text-blue-600 hover:bg-blue-50 transition"
                      >
                        📄 Baixar PDF / Imprimir
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="mt-12 max-w-4xl mx-auto grid gap-8 lg:grid-cols-2 items-start">
          {stripeProducts.map((product) => (
            <div 
              key={product.priceId} 
              className={`bg-white rounded-2xl shadow-xl p-8 border-2 ${
                product.name.includes('Anual') ? 'border-green-600' : 'border-gray-200'
              }`}
            >
              <div className="text-center mb-8">
                {product.name.includes('Anual') && (
                  <div className="inline-block bg-green-600 text-white px-6 py-2 rounded-full text-sm font-semibold mb-4">
                    ⭐ Mais Escolhido
                  </div>
                )}
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {product.name}
                </h3>
                <p className="text-gray-600 mb-6">{product.description}</p>
                <div className="flex items-end justify-center gap-2 mb-2">
                  <span className={`text-5xl font-bold ${
                    product.name.includes('Anual') ? 'text-green-600' : 'text-gray-800'
                  }`}>
                    R$ {product.price.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-2xl text-gray-600 mb-2">/{product.name.includes('Anual') ? 'ano' : 'mês'}</span>
                </div>
                <p className="text-sm text-green-600 font-medium">
                  🎉 30 dias grátis para testar tudo
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <svg className="text-green-600 flex-shrink-0 mt-0.5" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-gray-700">Teste grátis por 30 dias</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="text-green-600 flex-shrink-0 mt-0.5" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-gray-700">Orçamentos ilimitados</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="text-green-600 flex-shrink-0 mt-0.5" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-gray-700">Templates personalizáveis</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="text-green-600 flex-shrink-0 mt-0.5" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-gray-700">Gestão completa de leads</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="text-green-600 flex-shrink-0 mt-0.5" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-gray-700">Integração WhatsApp</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="text-green-600 flex-shrink-0 mt-0.5" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-gray-700">Analytics e relatórios</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="text-green-600 flex-shrink-0 mt-0.5" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-gray-700">Suporte em português</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="text-green-600 flex-shrink-0 mt-0.5" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-gray-700">Cancele quando quiser</span>
                </li>
              </ul>

              <button
                onClick={() => onSubscribeClick(product.priceId)}
                disabled={loading === product.priceId || subscription?.price_id === product.priceId}
                className="w-full py-4 rounded-lg font-semibold text-lg bg-green-600 text-white hover:bg-green-700 transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === product.priceId ? 'Processando...' :
                 subscription?.price_id === product.priceId ? 'Plano Atual' :
                 'Assinar Agora'}
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                💳 Pagamento seguro via Stripe • Cancele quando quiser
              </p>
            </div>
          ))}
        </div>

        {!user && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Need an account?{' '}
              <button
                onClick={() => navigate('/signup')}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign up here
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}