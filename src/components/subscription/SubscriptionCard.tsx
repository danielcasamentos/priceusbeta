import { Check } from 'lucide-react'
import { Button } from '../ui/button'
import { StripeProduct } from '../../stripe-config'

interface SubscriptionCardProps {
  product: StripeProduct
  onSubscribe: (priceId: string) => void
  loading?: boolean
  isCurrentPlan?: boolean
}

export function SubscriptionCard({ product, onSubscribe, loading, isCurrentPlan }: SubscriptionCardProps) {
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(price)
  }

  return (
    <div className={`rounded-lg border-2 p-6 ${isCurrentPlan ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
        <div className="mt-4">
          <span className="text-4xl font-bold text-gray-900">
            {formatPrice(product.price, product.currency)}
          </span>
          <span className="text-gray-500">/mês</span>
        </div>
        <p className="mt-4 text-sm text-gray-600">{product.description}</p>
      </div>

      <div className="mt-6">
        {isCurrentPlan ? (
          <div className="flex items-center justify-center text-blue-600">
            <Check className="h-5 w-5 mr-2" />
            <span className="font-medium">Current Plan</span>
          </div>
        ) : (
          <Button
            onClick={() => onSubscribe(product.priceId)}
            loading={loading}
            className="w-full"
          >
            Subscribe Now
          </Button>
        )}
      </div>
    </div>
  )
}