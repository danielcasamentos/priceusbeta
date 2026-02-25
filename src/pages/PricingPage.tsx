import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { stripeProducts } from '../stripe-config'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { useTrialStatus } from '../hooks/useTrialStatus'
import { Alert } from '../components/ui/Alert'
import { AlertCircle } from 'lucide-react'
import { TawkToChat } from '../components/TawkToChat'
import { handleCheckout } from '../../checkoutService'

export function PricingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { subscription } = useSubscription()
  const trialStatus = useTrialStatus(user)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

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
      <TawkToChat />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Plano Anual PriceU$
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Acesso completo por um ano com um valor especial.
          </p>
        </div>

        {trialStatus.isExpired && trialStatus.status === 'trial' && (
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Seu período de teste expirou</h3>
                <p className="text-sm text-red-700">
                  Para continuar usando o Price Us e acessar todos os recursos,
                  escolha um dos nossos planos abaixo.
                </p>
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

        <div className="mt-12 max-w-lg mx-auto">
          {stripeProducts.map((product) => (
            <div key={product.priceId} className="bg-white rounded-2xl shadow-2xl p-8 border-2 border-green-600">
              <div className="text-center mb-8">
                <div className="inline-block bg-green-600 text-white px-6 py-2 rounded-full text-sm font-semibold mb-4">
                  ⭐ Mais Escolhido
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {product.name}
                </h3>
                <p className="text-gray-600 mb-6">{product.description}</p>
                <div className="flex items-end justify-center gap-2 mb-2">
                  <span className="text-5xl font-bold text-green-600">
                    R$ {product.price.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-2xl text-gray-600 mb-2">/ano</span>
                </div>
                <p className="text-sm text-green-600 font-medium">
                  🎉 14 dias grátis para testar tudo
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <svg className="text-green-600 flex-shrink-0 mt-0.5" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-gray-700">Teste grátis por 14 dias</span>
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
                disabled={!!loading || subscription?.price_id === product.priceId}
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