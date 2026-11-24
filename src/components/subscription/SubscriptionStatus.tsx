import { useSubscription } from '../../hooks/useSubscription'
import { Alert } from '../ui/Alert'

export function SubscriptionStatus() {
  const { subscription, loading, isActive, isTrialing, isPastDue, isCanceled, plan } = useSubscription()

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-48"></div>
      </div>
    )
  }

  if (!subscription || !plan) {
    return null
  }

  const getStatusMessage = () => {
    if (isActive) {
      return {
        type: 'success' as const,
        message: `Active subscription: ${plan.name}`
      }
    }
    if (isTrialing) {
      return {
        type: 'info' as const,
        message: `Trial period: ${plan.name}`
      }
    }
    if (isPastDue) {
      return {
        type: 'warning' as const,
        message: `Payment overdue: ${plan.name}`
      }
    }
    if (isCanceled) {
      return {
        type: 'error' as const,
        message: `Canceled subscription: ${plan.name}`
      }
    }
    return {
      type: 'info' as const,
      message: `Subscription: ${plan.name}`
    }
  }

  const { type, message } = getStatusMessage()

  return (
    <Alert type={type}>
      {message}
    </Alert>
  )
}